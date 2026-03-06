import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { config } from 'config/environment';

// Types for media API
export interface PresignedUrlResponse {
  presigned_url: string;
  s3_key: string;
  expires_in: number;
}

export interface PresignedUrlRequest {
  s3_url: string;
}

export interface BatchPresignedUrlsResponse {
  presigned_urls: Record<string, string | null>;
  expires_in: number;
  batch_size: number;
  processing_time_ms: number;
  success_count: number;
  development?: boolean;
}

export interface BatchPresignedUrlsRequest {
  s3_urls: string[];
}

export interface UploadUrlResponse {
  presigned_url: string;
  s3_key: string;
  file_url: string;
}

export interface UploadUrlRequest {
  filename: string;
  fileType: string;
  folder?: string;
}

/**
 * Read a cookie value by name
 */
function getCookie(name: string): string | undefined {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    const part = parts.pop();
    return part ? part.split(';').shift() : undefined;
  }
  return undefined;
}

// Media API for handling S3 operations
export const mediaApi = createApi({
  reducerPath: 'mediaApi',
  baseQuery: fetchBaseQuery({
    baseUrl: import.meta.env.VITE_APP_BACKEND_URL || '/api/',
    credentials: 'include',
    prepareHeaders: (headers) => {
      headers.set('content-type', 'application/json');
      headers.set('X-Requested-With', 'XMLHttpRequest');

      const csrfToken = getCookie(config.CSRF_COOKIE_NAME);
      if (csrfToken) {
        headers.set(config.CSRF_HEADER_KEY, csrfToken);
      }

      return headers;
    }
  }),
  tagTypes: ['Media', 'PresignedUrl'],
  endpoints: (builder) => ({
    // Get presigned URL for reading existing S3 images
    getPresignedReadUrl: builder.query<PresignedUrlResponse, PresignedUrlRequest>({
      query: (data) => ({
        url: 'get-presigned-read-url/',
        method: 'POST',
        body: data
      }),
      // Cache for 30 minutes (presigned URLs last 1 hour)
      keepUnusedDataFor: 1800,
      providesTags: ['PresignedUrl']
    }),

    // Batch presigned URLs for optimal performance
    getBatchPresignedReadUrls: builder.query<BatchPresignedUrlsResponse, BatchPresignedUrlsRequest>(
      {
        query: (data) => ({
          url: 'get-presigned-read-urls-batch/',
          method: 'POST',
          body: data
        }),
        keepUnusedDataFor: 300,
        providesTags: (result, error, arg) => [
          { type: 'PresignedUrl', id: 'BATCH' },
          ...arg.s3_urls.map((url) => ({ type: 'PresignedUrl' as const, id: url }))
        ]
      }
    ),

    // Get presigned URL for uploading new files
    getUploadUrl: builder.mutation<UploadUrlResponse, UploadUrlRequest>({
      query: (data) => ({
        url: 'get-presigned-url/',
        method: 'POST',
        body: data
      }),
      invalidatesTags: ['Media']
    })
  })
});

export const {
  useGetPresignedReadUrlQuery,
  useLazyGetPresignedReadUrlQuery,
  useGetBatchPresignedReadUrlsQuery,
  useLazyGetBatchPresignedReadUrlsQuery,
  useGetUploadUrlMutation
} = mediaApi;

export default mediaApi;
