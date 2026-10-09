import baseApi from './baseApi';

// Types for search API
interface GlobalSearchParams {
  query: string;
  types?: string[]; // ['establishment', 'parcel']
  limit?: number;
  offset?: number;
}

interface RawSearchResult {
  id: number;
  type: 'establishment' | 'parcel';
  name: string;
  description?: string;
  location?: string;
  image_url?: string;
  area?: string;
  status?: string;
  establishment_id?: number;
  company_id: number;
  created_at: string;
  updated_at: string;
}

interface GlobalSearchResponse {
  results: RawSearchResult[];
  count: number;
  next?: string;
  previous?: string;
}

export const globalSearchApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    globalSearch: build.query<GlobalSearchResponse, GlobalSearchParams>({
      query: ({ query, types = ['establishment', 'parcel'], limit = 20, offset = 0 }) => ({
        url: 'search/global/',
        method: 'GET',
        credentials: 'include',
        params: {
          q: query,
          types: types.join(','),
          limit,
          offset
        }
      }),
      // Cache key based on search parameters
      serializeQueryArgs: ({ queryArgs }) => {
        const { query, types = ['establishment', 'parcel'], limit = 20 } = queryArgs;
        return `${query}-${types.join(',')}-${limit}`;
      },
      // Cache results for 5 minutes
      keepUnusedDataFor: 300,
      // Transform response to ensure consistent data types
      transformResponse: (response: any): GlobalSearchResponse => {
        return {
          results: response.results || [],
          count: response.count || 0,
          next: response.next || undefined,
          previous: response.previous || undefined
        };
      },
      // Error handling
      transformErrorResponse: (response: any) => {
        return {
          status: response.status,
          data: response.data || { message: 'Search failed' }
        };
      },
      // Provide tags for cache invalidation
      providesTags: (result, error, arg) => [
        { type: 'Search', id: 'GLOBAL' },
        // Tag individual results for potential invalidation
        ...(result?.results?.map((item) => ({
          type: item.type === 'establishment' ? 'Farm' : ('Parcel' as const),
          id: item.id
        })) || [])
      ]
    })
  })
});

export const { useGlobalSearchQuery } = globalSearchApi;
