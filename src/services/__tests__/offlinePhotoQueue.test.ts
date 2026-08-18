/**
 * Tests for the Offline Photo Queue Service (IndexedDB-based).
 *
 * Uses fake-indexeddb to simulate IndexedDB in jsdom.
 * Covers: enqueue, getAll, remove, processQueue, auto-sync, status tracking.
 *
 * Run: npx vitest run src/services/__tests__/offlinePhotoQueue.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock IndexedDB for jsdom (vitest/jsdom doesn't include it)
import 'fake-indexeddb/auto';

import { offlinePhotoQueue, QueuedPhoto } from '../offlinePhotoQueue';

// Helper: create a test File
function makeTestFile(name = 'farm_photo.jpg', sizeMB = 0.1): File {
  const bytes = new Uint8Array(Math.floor(sizeMB * 1024 * 1024));
  // Fill with non-zero data to be realistic
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = i % 256;
  }
  return new File([bytes], name, { type: 'image/jpeg' });
}

describe('OfflinePhotoQueue', () => {
  beforeEach(async () => {
    // Clear the queue between tests by removing all items
    const all = await offlinePhotoQueue.getAll();
    for (const photo of all) {
      if (photo.id) await offlinePhotoQueue.remove(photo.id);
    }
  });

  // -------------------------------------------------------------------
  // Enqueue
  // -------------------------------------------------------------------
  describe('enqueue', () => {
    it('should store a photo in IndexedDB and return an ID', async () => {
      const file = makeTestFile('planting.jpg');
      const id = await offlinePhotoQueue.enqueue(file);

      expect(id).toBeGreaterThan(0);

      const all = await offlinePhotoQueue.getAll();
      expect(all.length).toBe(1);
      expect(all[0].fileName).toBe('planting.jpg');
      expect(all[0].mimeType).toBe('image/jpeg');
      expect(all[0].status).toBe('queued');
      expect(all[0].retryCount).toBe(0);
    });

    it('should store event context alongside the photo', async () => {
      const file = makeTestFile('harvest.jpg');
      const context = { historyId: 42, eventType: 'production', subtype: 'HA' };
      await offlinePhotoQueue.enqueue(file, context);

      const all = await offlinePhotoQueue.getAll();
      expect(all[0].eventContext).toEqual(context);
    });

    it('should store multiple photos in order', async () => {
      await offlinePhotoQueue.enqueue(makeTestFile('photo1.jpg'));
      await offlinePhotoQueue.enqueue(makeTestFile('photo2.jpg'));
      await offlinePhotoQueue.enqueue(makeTestFile('photo3.jpg'));

      const all = await offlinePhotoQueue.getAll();
      expect(all.length).toBe(3);
      expect(all.map((p) => p.fileName)).toEqual(['photo1.jpg', 'photo2.jpg', 'photo3.jpg']);
    });

    it('should record queuedAt timestamp', async () => {
      const before = new Date().toISOString();
      await offlinePhotoQueue.enqueue(makeTestFile());
      const after = new Date().toISOString();

      const all = await offlinePhotoQueue.getAll();
      expect(all[0].queuedAt >= before).toBe(true);
      expect(all[0].queuedAt <= after).toBe(true);
    });

    it('should default MIME type to image/jpeg for unknown types', async () => {
      // File with empty type (some browsers do this for HEIC)
      const file = new File([new Uint8Array(1024)], 'photo.heic', { type: '' });
      await offlinePhotoQueue.enqueue(file);

      const all = await offlinePhotoQueue.getAll();
      expect(all[0].mimeType).toBe('image/jpeg'); // Fallback
    });
  });

  // -------------------------------------------------------------------
  // Remove
  // -------------------------------------------------------------------
  describe('remove', () => {
    it('should remove a photo by ID', async () => {
      const id = await offlinePhotoQueue.enqueue(makeTestFile());
      await offlinePhotoQueue.remove(id);

      const all = await offlinePhotoQueue.getAll();
      expect(all.length).toBe(0);
    });

    it('should only remove the specified photo', async () => {
      const id1 = await offlinePhotoQueue.enqueue(makeTestFile('a.jpg'));
      const id2 = await offlinePhotoQueue.enqueue(makeTestFile('b.jpg'));
      await offlinePhotoQueue.remove(id1);

      const all = await offlinePhotoQueue.getAll();
      expect(all.length).toBe(1);
      expect(all[0].fileName).toBe('b.jpg');
    });
  });

  // -------------------------------------------------------------------
  // getPendingCount
  // -------------------------------------------------------------------
  describe('getPendingCount', () => {
    it('should return count of non-uploading photos', async () => {
      await offlinePhotoQueue.enqueue(makeTestFile('a.jpg'));
      await offlinePhotoQueue.enqueue(makeTestFile('b.jpg'));

      const count = await offlinePhotoQueue.getPendingCount();
      expect(count).toBe(2);
    });

    it('should return 0 when queue is empty', async () => {
      const count = await offlinePhotoQueue.getPendingCount();
      expect(count).toBe(0);
    });
  });

  // -------------------------------------------------------------------
  // processQueue
  // -------------------------------------------------------------------
  describe('processQueue', () => {
    it('should upload all queued photos and remove them on success', async () => {
      await offlinePhotoQueue.enqueue(makeTestFile('a.jpg'));
      await offlinePhotoQueue.enqueue(makeTestFile('b.jpg'));

      const mockUpload = vi.fn().mockResolvedValue('https://s3.example.com/photo.jpg');

      const result = await offlinePhotoQueue.processQueue(mockUpload);

      expect(result.uploaded).toBe(2);
      expect(result.failed).toBe(0);
      expect(mockUpload).toHaveBeenCalledTimes(2);

      const remaining = await offlinePhotoQueue.getAll();
      expect(remaining.length).toBe(0);
    });

    it('should increment retryCount on failure and keep photo in queue', async () => {
      await offlinePhotoQueue.enqueue(makeTestFile('fail.jpg'));

      const mockUpload = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await offlinePhotoQueue.processQueue(mockUpload);

      expect(result.uploaded).toBe(0);
      expect(result.failed).toBe(1);

      const all = await offlinePhotoQueue.getAll();
      expect(all.length).toBe(1);
      expect(all[0].status).toBe('failed');
      expect(all[0].retryCount).toBe(1);
      expect(all[0].lastError).toBe('Network error');
    });

    it('should skip photos that exceeded max retries (3)', async () => {
      // Enqueue and fail 3 times
      await offlinePhotoQueue.enqueue(makeTestFile('doomed.jpg'));
      const mockFail = vi.fn().mockRejectedValue(new Error('fail'));

      await offlinePhotoQueue.processQueue(mockFail); // retry 1
      await offlinePhotoQueue.processQueue(mockFail); // retry 2
      await offlinePhotoQueue.processQueue(mockFail); // retry 3

      // 4th attempt should skip it
      const mockSuccess = vi.fn().mockResolvedValue('url');
      const result = await offlinePhotoQueue.processQueue(mockSuccess);

      expect(result.uploaded).toBe(0);
      expect(mockSuccess).not.toHaveBeenCalled();
    });

    it('should not run concurrently (isProcessing guard)', async () => {
      await offlinePhotoQueue.enqueue(makeTestFile('slow.jpg'));

      let resolveUpload!: (value: string) => void;
      const slowUpload = vi.fn().mockImplementation(
        () =>
          new Promise<string>((resolve) => {
            resolveUpload = resolve;
          })
      );

      // Start first process (will hang on slow upload)
      const p1 = offlinePhotoQueue.processQueue(slowUpload);

      // Give it a tick to enter processing state
      await new Promise((r) => setTimeout(r, 10));

      // Try to start second process while first is still running
      const p2 = offlinePhotoQueue.processQueue(slowUpload);

      // Second should return immediately with 0/0
      const result2 = await p2;
      expect(result2.uploaded).toBe(0);
      expect(result2.failed).toBe(0);

      // Resolve the first
      resolveUpload('url');
      await p1;
    });

    it('should handle mixed success and failure in batch', async () => {
      await offlinePhotoQueue.enqueue(makeTestFile('good.jpg'));
      await offlinePhotoQueue.enqueue(makeTestFile('bad.jpg'));
      await offlinePhotoQueue.enqueue(makeTestFile('good2.jpg'));

      let callCount = 0;
      const mockUpload = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 2) return Promise.reject(new Error('fail'));
        return Promise.resolve('url');
      });

      const result = await offlinePhotoQueue.processQueue(mockUpload);

      // At least some succeeded and some failed
      expect(result.uploaded + result.failed).toBe(3);
      expect(result.failed).toBeGreaterThanOrEqual(1);
      expect(result.uploaded).toBeGreaterThanOrEqual(1);
    });
  });

  // -------------------------------------------------------------------
  // onChange (listener)
  // -------------------------------------------------------------------
  describe('onChange', () => {
    it('should notify listeners when photos are enqueued', async () => {
      const callback = vi.fn();
      const unsubscribe = offlinePhotoQueue.onChange(callback);

      await offlinePhotoQueue.enqueue(makeTestFile());

      // Give async notification time to fire
      await new Promise((r) => setTimeout(r, 50));

      expect(callback).toHaveBeenCalled();
      const lastCall = callback.mock.calls[callback.mock.calls.length - 1][0];
      expect(lastCall.length).toBe(1);

      unsubscribe();
    });

    it('should stop notifying after unsubscribe', async () => {
      const callback = vi.fn();
      const unsubscribe = offlinePhotoQueue.onChange(callback);
      unsubscribe();

      await offlinePhotoQueue.enqueue(makeTestFile());
      await new Promise((r) => setTimeout(r, 50));

      expect(callback).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------
  // isOffline
  // -------------------------------------------------------------------
  describe('isOffline', () => {
    it('should reflect navigator.onLine status', () => {
      // jsdom default is online
      Object.defineProperty(navigator, 'onLine', { value: true, writable: true });
      expect(offlinePhotoQueue.isOffline()).toBe(false);

      Object.defineProperty(navigator, 'onLine', { value: false, writable: true });
      expect(offlinePhotoQueue.isOffline()).toBe(true);

      // Reset
      Object.defineProperty(navigator, 'onLine', { value: true, writable: true });
    });
  });

  // -------------------------------------------------------------------
  // startAutoSync
  // -------------------------------------------------------------------
  describe('startAutoSync', () => {
    it('should process queue when online event fires', async () => {
      await offlinePhotoQueue.enqueue(makeTestFile('waiting.jpg'));

      const mockUpload = vi.fn().mockResolvedValue('url');
      const cleanup = offlinePhotoQueue.startAutoSync(mockUpload);

      // Wait for startup sync to complete first (runs immediately if online)
      await new Promise((r) => setTimeout(r, 200));

      // The startup sync or the event should have processed the photo
      const remaining = await offlinePhotoQueue.getAll();
      expect(remaining.length).toBe(0); // Photo was uploaded

      cleanup();
    });

    it('should return a cleanup function that removes the listener', async () => {
      const mockUpload = vi.fn().mockResolvedValue('url');
      const cleanup = offlinePhotoQueue.startAutoSync(mockUpload);

      cleanup();

      // Enqueue after cleanup
      await offlinePhotoQueue.enqueue(makeTestFile('orphan.jpg'));

      // Firing online should NOT trigger upload
      mockUpload.mockClear();
      window.dispatchEvent(new Event('online'));
      await new Promise((r) => setTimeout(r, 100));

      // The startup sync may have run, but the event listener should be removed
      // Check the photo is still queued
      const all = await offlinePhotoQueue.getAll();
      expect(all.length).toBe(1);
    });
  });
});
