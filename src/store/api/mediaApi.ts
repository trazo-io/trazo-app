import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../index';

// Types for media API
export interface PresignedUrlResponse {
  presigned_url: string;
  s3_key: string;
  expires_in: number;
}

export interface PresignedUrlRequest {
  s3_url: string;
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
    baseUrl: '/api/',
    prepareHeaders: (headers, { getState }) => {
      const state = getState() as RootState;
      const token = state.auth.token;
      
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
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
  useGetUploadUrlMutation 
} = mediaApi;

export default mediaApi;