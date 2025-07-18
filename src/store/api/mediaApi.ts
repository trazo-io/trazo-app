import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { TokenManager } from '../../utils/secureTokenStorage';

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

// Media API for handling S3 operations
export const mediaApi = createApi({
  reducerPath: 'mediaApi',
  baseQuery: fetchBaseQuery({
    baseUrl: import.meta.env.VITE_APP_BACKEND_URL || '/api/',
    prepareHeaders: (headers) => {
      // Get token from TokenManager (same as other working APIs)
      const token = TokenManager.getAccessToken();
      console.log('🔒 MEDIA API: Getting token for S3 request. Token found:', !!token, 'Length:', token?.length || 0);
      
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
        console.log('🔒 MEDIA API: Added Authorization header');
      } else {
        console.log('🔒 MEDIA API: No token found, request will be unauthenticated');
      }
      headers.set('content-type', 'application/json');
      
      return headers;
    },
  }),
  tagTypes: ['Media', 'PresignedUrl'],
  endpoints: (builder) => ({
    // Get presigned URL for reading existing S3 images
    getPresignedReadUrl: builder.query<PresignedUrlResponse, PresignedUrlRequest>({
      query: (data) => ({
        url: 'get-presigned-read-url/',
        method: 'POST',
        body: data,
      }),
      // Cache for 30 minutes (presigned URLs last 1 hour)
      keepUnusedDataFor: 1800,
      providesTags: ['PresignedUrl'],
    }),

    // 2025 Best Practice: Batch presigned URLs for optimal performance
    getBatchPresignedReadUrls: builder.query<BatchPresignedUrlsResponse, BatchPresignedUrlsRequest>({
      query: (data) => ({
        url: 'get-presigned-read-urls-batch/',
        method: 'POST',
        body: data,
      }),
      // Cache for 30 minutes (presigned URLs last 1 hour)
      keepUnusedDataFor: 1800,
      providesTags: ['PresignedUrl'],
    }),
    
    // Get presigned URL for uploading new files
    getUploadUrl: builder.mutation<UploadUrlResponse, UploadUrlRequest>({
      query: (data) => ({
        url: 'get-presigned-url/',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Media'],
    }),
  }),
});

export const { 
  useGetPresignedReadUrlQuery, 
  useLazyGetPresignedReadUrlQuery,
  useGetBatchPresignedReadUrlsQuery,
  useLazyGetBatchPresignedReadUrlsQuery,
  useGetUploadUrlMutation 
} = mediaApi;

export default mediaApi;