import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useS3Upload } from '../useS3Upload';

// Mock the upload API
const mockGetPresignedUrls = vi.fn();

vi.mock('../../store/api/uploadApi', () => ({
  useGetPresignedUrlsMutation: () => [mockGetPresignedUrls, { isLoading: false }]
}));

// Mock fetch for S3 uploads
global.fetch = vi.fn();

describe('useS3Upload Hook Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('File Upload Flow', () => {
    it('successfully uploads single file to S3', async () => {
      // Mock file
      const testFile = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });

      // Mock presigned URL response
      const mockPresignedResponse = [
        {
          url: 'https://bucket.s3.amazonaws.com',
          fields: {
            key: 'uploads/test.jpg',
            policy: 'mock-policy',
            signature: 'mock-signature'
          }
        }
      ];

      mockGetPresignedUrls.mockReturnValue({
        unwrap: vi.fn().mockResolvedValue(mockPresignedResponse)
      });

      // Mock successful S3 upload
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 204
      });

      const { result } = renderHook(() => useS3Upload());

      let uploadResult: string[] | undefined;

      await act(async () => {
        uploadResult = await result.current.uploadFiles([testFile], 'parcel', '123');
      });

      // Verify presigned URL was requested
      expect(mockGetPresignedUrls).toHaveBeenCalledWith({
        files: [
          {
            name: 'test.jpg',
            type: 'image/jpeg',
            size: testFile.size
          }
        ],
        entityType: 'parcel',
        entityId: '123'
      });

      // Verify S3 upload was attempted
      expect(global.fetch).toHaveBeenCalledWith('https://bucket.s3.amazonaws.com', {
        method: 'POST',
        body: expect.any(FormData)
      });

      // Verify upload result
      expect(uploadResult).toEqual(['https://bucket.s3.amazonaws.com/uploads/test.jpg']);

      // Verify hook state
      expect(result.current.isUploading).toBe(false);
      expect(result.current.uploadError).toBeNull();
    });

    it('uploads multiple files in parallel', async () => {
      const testFiles = [
        new File(['content 1'], 'file1.jpg', { type: 'image/jpeg' }),
        new File(['content 2'], 'file2.png', { type: 'image/png' })
      ];

      const mockPresignedResponse = [
        {
          url: 'https://bucket.s3.amazonaws.com',
          fields: { key: 'uploads/file1.jpg' }
        },
        {
          url: 'https://bucket.s3.amazonaws.com',
          fields: { key: 'uploads/file2.png' }
        }
      ];

      mockGetPresignedUrls.mockReturnValue({
        unwrap: vi.fn().mockResolvedValue(mockPresignedResponse)
      });

      // Mock multiple successful S3 uploads
      (global.fetch as any)
        .mockResolvedValueOnce({ ok: true, status: 204 })
        .mockResolvedValueOnce({ ok: true, status: 204 });

      const { result } = renderHook(() => useS3Upload());

      let uploadResult: string[] | undefined;

      await act(async () => {
        uploadResult = await result.current.uploadFiles(testFiles, 'establishment');
      });

      // Verify both files were uploaded
      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(uploadResult).toHaveLength(2);
      expect(uploadResult).toEqual([
        'https://bucket.s3.amazonaws.com/uploads/file1.jpg',
        'https://bucket.s3.amazonaws.com/uploads/file2.png'
      ]);
    });
  });

  describe('Error Handling', () => {
    it('handles presigned URL fetch errors', async () => {
      const testFile = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });

      mockGetPresignedUrls.mockReturnValue({
        unwrap: vi.fn().mockRejectedValue(new Error('Failed to get presigned URLs'))
      });

      const { result } = renderHook(() => useS3Upload());

      await act(async () => {
        try {
          await result.current.uploadFiles([testFile], 'parcel');
        } catch (error) {
          // Expected to throw
        }
      });

      expect(result.current.isUploading).toBe(false);
      expect(result.current.uploadError).toBe('Failed to get presigned URLs');
    });

    it('handles S3 upload failures', async () => {
      const testFile = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });

      const mockPresignedResponse = [
        {
          url: 'https://bucket.s3.amazonaws.com',
          fields: { key: 'uploads/test.jpg' }
        }
      ];

      mockGetPresignedUrls.mockReturnValue({
        unwrap: vi.fn().mockResolvedValue(mockPresignedResponse)
      });

      // Mock failed S3 upload
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden'
      });

      const { result } = renderHook(() => useS3Upload());

      await act(async () => {
        try {
          await result.current.uploadFiles([testFile], 'parcel');
        } catch (error) {
          // Expected to throw
        }
      });

      expect(result.current.isUploading).toBe(false);
      expect(result.current.uploadError).toBe('Upload failed');
    });

    it('handles partial upload failures', async () => {
      const testFiles = [
        new File(['content 1'], 'file1.jpg', { type: 'image/jpeg' }),
        new File(['content 2'], 'file2.png', { type: 'image/png' })
      ];

      const mockPresignedResponse = [
        { url: 'https://bucket.s3.amazonaws.com', fields: { key: 'uploads/file1.jpg' } },
        { url: 'https://bucket.s3.amazonaws.com', fields: { key: 'uploads/file2.png' } }
      ];

      mockGetPresignedUrls.mockReturnValue({
        unwrap: vi.fn().mockResolvedValue(mockPresignedResponse)
      });

      // First upload succeeds, second fails
      (global.fetch as any)
        .mockResolvedValueOnce({ ok: true, status: 204 })
        .mockResolvedValueOnce({ ok: false, status: 500 });

      const { result } = renderHook(() => useS3Upload());

      await act(async () => {
        try {
          await result.current.uploadFiles(testFiles, 'establishment');
        } catch (error) {
          // Expected to throw due to partial failure
        }
      });

      expect(result.current.uploadError).toBe('Upload failed');
    });
  });

  describe('Loading States', () => {
    it('shows loading state during upload', async () => {
      const testFile = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });

      let resolvePresigned: (value: any) => void;
      const presignedPromise = new Promise((resolve) => {
        resolvePresigned = resolve;
      });

      mockGetPresignedUrls.mockReturnValue({
        unwrap: vi.fn().mockReturnValue(presignedPromise)
      });

      const { result } = renderHook(() => useS3Upload());

      // Start upload but don't await it yet
      act(() => {
        result.current.uploadFiles([testFile], 'parcel');
      });

      // Should be loading
      expect(result.current.isUploading).toBe(true);
      expect(result.current.uploadError).toBeNull();

      // Resolve the presigned URL request
      await act(async () => {
        resolvePresigned([
          {
            url: 'https://bucket.s3.amazonaws.com',
            fields: { key: 'test.jpg' }
          }
        ]);

        // Mock S3 upload
        (global.fetch as any).mockResolvedValueOnce({ ok: true, status: 204 });
      });

      // Should no longer be loading
      await waitFor(() => {
        expect(result.current.isUploading).toBe(false);
      });
    });
  });

  describe('Form Data Construction', () => {
    it('constructs FormData correctly for S3 upload', async () => {
      const testFile = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });

      const mockPresignedResponse = [
        {
          url: 'https://bucket.s3.amazonaws.com',
          fields: {
            key: 'uploads/test.jpg',
            policy: 'mock-policy',
            'x-amz-algorithm': 'AWS4-HMAC-SHA256',
            'x-amz-credential': 'mock-credential'
          }
        }
      ];

      mockGetPresignedUrls.mockReturnValue({
        unwrap: vi.fn().mockResolvedValue(mockPresignedResponse)
      });

      let capturedFormData: FormData | undefined;
      (global.fetch as any).mockImplementation(async (url: string, options: any) => {
        capturedFormData = options.body;
        return { ok: true, status: 204 };
      });

      const { result } = renderHook(() => useS3Upload());

      await act(async () => {
        await result.current.uploadFiles([testFile], 'parcel');
      });

      // Verify FormData was constructed correctly
      expect(capturedFormData).toBeInstanceOf(FormData);
      expect(capturedFormData!.get('key')).toBe('uploads/test.jpg');
      expect(capturedFormData!.get('policy')).toBe('mock-policy');
      expect(capturedFormData!.get('x-amz-algorithm')).toBe('AWS4-HMAC-SHA256');
      expect(capturedFormData!.get('file')).toBe(testFile);
    });
  });
});
