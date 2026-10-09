// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import React from 'react';
import useBatchS3Images from '../useBatchS3Images';
import baseApi from '../../store/api/baseApi';

// Mock the API
const mockTriggerBatchQuery = vi.fn();
const mockQueryResult = {
  data: null,
  isLoading: false,
  error: null,
  isSuccess: false
};

vi.mock('../../store/api/mediaApi', () => ({
  useLazyGetBatchPresignedReadUrlsQuery: () => [mockTriggerBatchQuery, mockQueryResult]
}));

// Test wrapper component
const createWrapper = () => {
  const store = configureStore({
    reducer: {
      [baseApi.reducerPath]: baseApi.reducer
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(baseApi.middleware)
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(Provider, { store }, children);

  return { wrapper: Wrapper, store };
};

describe('useBatchS3Images', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock query result
    Object.assign(mockQueryResult, {
      data: null,
      isLoading: false,
      error: null,
      isSuccess: false
    });

    // Clear window debug object
    if (typeof window !== 'undefined') {
      delete (window as any).__TRAZO_BATCH_DEBUG;
    }
  });

  it('initializes with empty state when no URLs provided', () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useBatchS3Images({ s3Urls: [] }), { wrapper });

    expect(result.current.presignedUrls).toEqual({});
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(typeof result.current.refetch).toBe('function');
    expect(result.current.metrics).toBeUndefined();
  });

  it('triggers batch query when URLs are provided', async () => {
    const mockUrls = [
      'https://bucket.s3.amazonaws.com/image1.jpg',
      'https://bucket.s3.amazonaws.com/image2.jpg'
    ];

    const { wrapper } = createWrapper();
    renderHook(() => useBatchS3Images({ s3Urls: mockUrls }), { wrapper });

    await waitFor(() => {
      expect(mockTriggerBatchQuery).toHaveBeenCalledWith(
        { s3_urls: mockUrls },
        true // forceRefetch
      );
    });
  });

  it('filters out empty URLs when skipEmpty is true', async () => {
    const mockUrls = [
      'https://bucket.s3.amazonaws.com/image1.jpg',
      '',
      null,
      'https://bucket.s3.amazonaws.com/image2.jpg',
      '   ' // whitespace only
    ];

    const { wrapper } = createWrapper();
    renderHook(
      () =>
        useBatchS3Images({
          s3Urls: mockUrls as any,
          skipEmpty: true
        }),
      { wrapper }
    );

    await waitFor(() => {
      expect(mockTriggerBatchQuery).toHaveBeenCalledWith(
        {
          s3_urls: [
            'https://bucket.s3.amazonaws.com/image1.jpg',
            'https://bucket.s3.amazonaws.com/image2.jpg'
          ]
        },
        true
      );
    });
  });

  it('does not trigger query when enabled is false', () => {
    const mockUrls = ['https://bucket.s3.amazonaws.com/image.jpg'];

    const { wrapper } = createWrapper();
    renderHook(
      () =>
        useBatchS3Images({
          s3Urls: mockUrls,
          enabled: false
        }),
      { wrapper }
    );

    expect(mockTriggerBatchQuery).not.toHaveBeenCalled();
  });

  it('returns presigned URLs from successful response', () => {
    const mockResponse = {
      presigned_urls: {
        'https://bucket.s3.amazonaws.com/image1.jpg': 'https://presigned1.com',
        'https://bucket.s3.amazonaws.com/image2.jpg': 'https://presigned2.com'
      },
      batch_size: 2,
      processing_time_ms: 150,
      success_count: 2
    };

    Object.assign(mockQueryResult, {
      data: mockResponse,
      isLoading: false,
      error: null,
      isSuccess: true
    });

    const { wrapper } = createWrapper();
    const { result } = renderHook(
      () =>
        useBatchS3Images({
          s3Urls: ['https://bucket.s3.amazonaws.com/image1.jpg']
        }),
      { wrapper }
    );

    expect(result.current.presignedUrls).toEqual(mockResponse.presigned_urls);
    expect(result.current.metrics).toEqual({
      batch_size: 2,
      processing_time_ms: 150,
      success_count: 2
    });
  });

  it('handles loading state correctly', () => {
    Object.assign(mockQueryResult, {
      data: null,
      isLoading: true,
      error: null,
      isSuccess: false
    });

    const { wrapper } = createWrapper();
    const { result } = renderHook(
      () =>
        useBatchS3Images({
          s3Urls: ['https://bucket.s3.amazonaws.com/image.jpg']
        }),
      { wrapper }
    );

    expect(result.current.isLoading).toBe(true);
    expect(result.current.presignedUrls).toEqual({});
  });

  it('handles errors gracefully', () => {
    const mockError = new Error('Failed to fetch presigned URLs');

    Object.assign(mockQueryResult, {
      data: null,
      isLoading: false,
      error: mockError,
      isSuccess: false
    });

    const { wrapper } = createWrapper();
    const { result } = renderHook(
      () =>
        useBatchS3Images({
          s3Urls: ['https://bucket.s3.amazonaws.com/image.jpg']
        }),
      { wrapper }
    );

    expect(result.current.error).toBe(mockError);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.presignedUrls).toEqual({});
  });

  it('deduplicates URLs before making request', async () => {
    const mockUrls = [
      'https://bucket.s3.amazonaws.com/image1.jpg',
      'https://bucket.s3.amazonaws.com/image1.jpg', // duplicate
      'https://bucket.s3.amazonaws.com/image2.jpg'
    ];

    const { wrapper } = createWrapper();
    renderHook(() => useBatchS3Images({ s3Urls: mockUrls }), { wrapper });

    await waitFor(() => {
      expect(mockTriggerBatchQuery).toHaveBeenCalledWith(
        {
          s3_urls: [
            'https://bucket.s3.amazonaws.com/image1.jpg',
            'https://bucket.s3.amazonaws.com/image2.jpg'
          ]
        },
        true
      );
    });
  });

  it('refetch triggers new batch query', async () => {
    const mockUrls = ['https://bucket.s3.amazonaws.com/image.jpg'];

    const { wrapper } = createWrapper();
    const { result } = renderHook(
      () =>
        useBatchS3Images({
          s3Urls: mockUrls
        }),
      { wrapper }
    );

    // Wait for initial call
    await waitFor(() => {
      expect(mockTriggerBatchQuery).toHaveBeenCalledTimes(1);
    });

    // Clear mock calls
    mockTriggerBatchQuery.mockClear();

    // Call refetch
    act(() => {
      result.current.refetch();
    });

    expect(mockTriggerBatchQuery).toHaveBeenCalledWith(
      { s3_urls: mockUrls }
      // Note: refetch does not pass forceRefetch parameter
    );
  });

  it('handles non-array s3Urls gracefully', () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(
      () =>
        useBatchS3Images({
          s3Urls: null as any
        }),
      { wrapper }
    );

    expect(result.current.presignedUrls).toEqual({});
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(mockTriggerBatchQuery).not.toHaveBeenCalled();
  });

  it('sets debug information on window object', async () => {
    const mockUrls = ['https://bucket.s3.amazonaws.com/image.jpg'];

    const { wrapper } = createWrapper();
    renderHook(() => useBatchS3Images({ s3Urls: mockUrls }), { wrapper });

    await waitFor(() => {
      expect((window as any).__TRAZO_BATCH_DEBUG).toBeDefined();
      expect((window as any).__TRAZO_BATCH_DEBUG.batchTriggered).toBe(true);
      expect((window as any).__TRAZO_BATCH_DEBUG.urlCount).toBe(1);
      expect((window as any).__TRAZO_BATCH_DEBUG.urls).toEqual(mockUrls);
    });
  });

  it('does not refetch when URLs remain the same', async () => {
    const mockUrls = ['https://bucket.s3.amazonaws.com/image.jpg'];

    const { wrapper } = createWrapper();
    const { rerender } = renderHook(({ urls }) => useBatchS3Images({ s3Urls: urls }), {
      wrapper,
      initialProps: { urls: mockUrls }
    });

    await waitFor(() => {
      expect(mockTriggerBatchQuery).toHaveBeenCalledTimes(1);
    });

    // Rerender with same URLs
    rerender({ urls: mockUrls });

    // Should not trigger another call
    expect(mockTriggerBatchQuery).toHaveBeenCalledTimes(1);
  });

  it('refetches when URLs change', async () => {
    const initialUrls = ['https://bucket.s3.amazonaws.com/image1.jpg'];
    const newUrls = ['https://bucket.s3.amazonaws.com/image2.jpg'];

    const { wrapper } = createWrapper();
    const { rerender } = renderHook(({ urls }) => useBatchS3Images({ s3Urls: urls }), {
      wrapper,
      initialProps: { urls: initialUrls }
    });

    await waitFor(() => {
      expect(mockTriggerBatchQuery).toHaveBeenCalledWith({ s3_urls: initialUrls }, true);
    });

    // Rerender with new URLs
    rerender({ urls: newUrls });

    await waitFor(() => {
      expect(mockTriggerBatchQuery).toHaveBeenCalledWith({ s3_urls: newUrls }, true);
    });
  });
});
