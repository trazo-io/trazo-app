/**
 * Offline Photo Queue Service
 *
 * IndexedDB-based queue for photos captured when the farmer has no connectivity.
 * Photos are stored locally and automatically uploaded when the connection returns.
 *
 * Architecture:
 * 1. Photos captured offline are stored as blobs in IndexedDB with metadata
 * 2. A connection listener watches for online status
 * 3. When connectivity returns, queued photos are uploaded in order
 * 4. Failed uploads are retried with exponential backoff (max 3 retries)
 *
 * Storage: IndexedDB "trazo_photo_queue" database, "photos" object store
 */

const DB_NAME = 'trazo_photo_queue';
const DB_VERSION = 1;
const STORE_NAME = 'photos';
const MAX_RETRIES = 3;

export interface QueuedPhoto {
  id?: number;
  blob: Blob;
  fileName: string;
  mimeType: string;
  /** Size in bytes (for display) */
  fileSize: number;
  /** Event context for re-associating after upload */
  eventContext?: {
    historyId?: string | number;
    eventType?: string;
    subtype?: string;
  };
  /** ISO timestamp when queued */
  queuedAt: string;
  /** Number of upload attempts */
  retryCount: number;
  /** Current status */
  status: 'queued' | 'uploading' | 'failed';
  /** Last error message */
  lastError?: string;
}

type QueueChangeCallback = (queue: QueuedPhoto[]) => void;

class OfflinePhotoQueueService {
  private db: IDBDatabase | null = null;
  private isProcessing = false;
  private changeListeners: Set<QueueChangeCallback> = new Set();

  /**
   * Open (or create) the IndexedDB database.
   */
  private async openDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, {
            keyPath: 'id',
            autoIncrement: true
          });
          store.createIndex('status', 'status', { unique: false });
          store.createIndex('queuedAt', 'queuedAt', { unique: false });
        }
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve(this.db);
      };

      request.onerror = () => {
        reject(new Error('Failed to open offline photo queue database'));
      };
    });
  }

  /**
   * Add a photo to the offline queue.
   */
  async enqueue(file: File, eventContext?: QueuedPhoto['eventContext']): Promise<number> {
    const db = await this.openDB();
    // Use FileReader fallback for environments where file.arrayBuffer() is unavailable (e.g., older WebViews)
    let arrayBuf: ArrayBuffer;
    if (typeof file.arrayBuffer === 'function') {
      arrayBuf = await file.arrayBuffer();
    } else {
      arrayBuf = await new Promise<ArrayBuffer>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as ArrayBuffer);
        reader.onerror = () => reject(reader.error);
        reader.readAsArrayBuffer(file);
      });
    }
    const blob = new Blob([arrayBuf], { type: file.type });

    const photo: Omit<QueuedPhoto, 'id'> = {
      blob,
      fileName: file.name,
      mimeType: file.type || 'image/jpeg',
      fileSize: file.size,
      eventContext,
      queuedAt: new Date().toISOString(),
      retryCount: 0,
      status: 'queued'
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.add(photo);

      request.onsuccess = () => {
        const id = request.result as number;
        console.log(`[OfflineQueue] Photo queued: ${file.name} (id=${id})`);
        this.notifyListeners();
        resolve(id);
      };

      request.onerror = () => reject(new Error('Failed to queue photo'));
    });
  }

  /**
   * Get all queued photos (for UI display).
   */
  async getAll(): Promise<QueuedPhoto[]> {
    const db = await this.openDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result as QueuedPhoto[]);
      request.onerror = () => reject(new Error('Failed to read queue'));
    });
  }

  /**
   * Get count of pending photos.
   */
  async getPendingCount(): Promise<number> {
    const all = await this.getAll();
    return all.filter((p) => p.status !== 'uploading').length;
  }

  /**
   * Remove a photo from the queue (after successful upload or manual cancel).
   */
  async remove(id: number): Promise<void> {
    const db = await this.openDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => {
        this.notifyListeners();
        resolve();
      };
      request.onerror = () => reject(new Error('Failed to remove from queue'));
    });
  }

  /**
   * Update a queued photo's status.
   */
  private async updateStatus(
    id: number,
    status: QueuedPhoto['status'],
    error?: string
  ): Promise<void> {
    const db = await this.openDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const getReq = store.get(id);

      getReq.onsuccess = () => {
        const photo = getReq.result as QueuedPhoto;
        if (!photo) {
          resolve();
          return;
        }

        photo.status = status;
        if (error) photo.lastError = error;
        if (status === 'failed') photo.retryCount += 1;

        const putReq = store.put(photo);
        putReq.onsuccess = () => {
          this.notifyListeners();
          resolve();
        };
        putReq.onerror = () => reject(new Error('Failed to update queue'));
      };

      getReq.onerror = () => reject(new Error('Failed to read queue item'));
    });
  }

  /**
   * Process the queue: upload all pending photos.
   * Called automatically when connectivity returns.
   *
   * @param uploadFn - The upload function from useFileUpload hook
   */
  async processQueue(
    uploadFn: (file: File) => Promise<string>
  ): Promise<{ uploaded: number; failed: number }> {
    if (this.isProcessing) return { uploaded: 0, failed: 0 };
    this.isProcessing = true;

    let uploaded = 0;
    let failed = 0;

    try {
      const photos = await this.getAll();
      const pending = photos.filter((p) => p.status !== 'uploading' && p.retryCount < MAX_RETRIES);

      for (const photo of pending) {
        if (!photo.id) continue;

        try {
          await this.updateStatus(photo.id, 'uploading');

          // Reconstruct File from stored blob
          const file = new File([photo.blob], photo.fileName, {
            type: photo.mimeType
          });

          await uploadFn(file);
          await this.remove(photo.id);
          uploaded++;

          console.log(`[OfflineQueue] Uploaded queued photo: ${photo.fileName}`);
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Upload failed';
          await this.updateStatus(photo.id, 'failed', errorMsg);
          failed++;

          console.warn(
            `[OfflineQueue] Failed to upload ${photo.fileName} (attempt ${
              photo.retryCount + 1
            }/${MAX_RETRIES}):`,
            errorMsg
          );
        }
      }
    } finally {
      this.isProcessing = false;
    }

    return { uploaded, failed };
  }

  /**
   * Subscribe to queue changes (for UI updates).
   */
  onChange(callback: QueueChangeCallback): () => void {
    this.changeListeners.add(callback);
    return () => this.changeListeners.delete(callback);
  }

  private async notifyListeners(): Promise<void> {
    try {
      const queue = await this.getAll();
      this.changeListeners.forEach((cb) => cb(queue));
    } catch {
      // Ignore errors in notification
    }
  }

  /**
   * Check if we're currently offline.
   */
  isOffline(): boolean {
    return !navigator.onLine;
  }

  /**
   * Start listening for connectivity changes and auto-process queue.
   * Returns cleanup function.
   */
  startAutoSync(uploadFn: (file: File) => Promise<string>): () => void {
    const handleOnline = async () => {
      console.log('[OfflineQueue] Connection restored - processing queue...');
      const result = await this.processQueue(uploadFn);
      if (result.uploaded > 0 || result.failed > 0) {
        console.log(
          `[OfflineQueue] Sync complete: ${result.uploaded} uploaded, ${result.failed} failed`
        );
      }
    };

    window.addEventListener('online', handleOnline);

    // Process any existing queue items on startup if we're online
    if (navigator.onLine) {
      this.processQueue(uploadFn).catch(() => {});
    }

    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }
}

/** Singleton instance */
export const offlinePhotoQueue = new OfflinePhotoQueueService();
