import { useState, useEffect, useMemo } from 'react';
import { useDebounce } from './useDebounce';
import { useGlobalSearchQuery } from '../store/api/globalSearchApi';

interface SearchResult {
  id: string;
  type: 'establishment' | 'parcel';
  name: string;
  description?: string;
  location?: string;
  imageUrl?: string;
  metadata: {
    carbonScore?: number;
    area?: string;
    status?: string;
  };
  href: string;
}

interface UseGlobalSearchReturn {
  searchResults: SearchResult[];
  isLoading: boolean;
  isError: boolean;
  error: any;
  searchHistory: SearchResult[];
  addToHistory: (result: SearchResult) => void;
  clearHistory: () => void;
}

const SEARCH_HISTORY_KEY = 'trazo_search_history';
const MAX_HISTORY_ITEMS = 10;
const SEARCH_DEBOUNCE_MS = 300;
const MIN_SEARCH_LENGTH = 2;

export const useGlobalSearch = (query: string): UseGlobalSearchReturn => {
  const [searchHistory, setSearchHistory] = useState<SearchResult[]>([]);

  // Debounce search query to avoid excessive API calls
  const debouncedQuery = useDebounce(query, SEARCH_DEBOUNCE_MS);

  // Only search if query is long enough
  const shouldSearch = debouncedQuery.length >= MIN_SEARCH_LENGTH;

  // RTK Query for search API call
  const {
    data: searchResponse,
    isLoading,
    isError,
    error
  } = useGlobalSearchQuery(
    { query: debouncedQuery },
    {
      skip: !shouldSearch,
      // Cache results for 5 minutes
      pollingInterval: 0,
      refetchOnMountOrArgChange: false,
      refetchOnFocus: false,
      refetchOnReconnect: false
    }
  );

  // Load search history from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(SEARCH_HISTORY_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setSearchHistory(parsed.slice(0, MAX_HISTORY_ITEMS));
        }
      }
    } catch (error) {
      console.warn('Failed to load search history:', error);
      localStorage.removeItem(SEARCH_HISTORY_KEY);
    }
  }, []);

  // Save search history to localStorage when it changes
  useEffect(() => {
    try {
      localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(searchHistory));
    } catch (error) {
      console.warn('Failed to save search history:', error);
    }
  }, [searchHistory]);

  // Add item to search history
  const addToHistory = (result: SearchResult) => {
    setSearchHistory((prev) => {
      // Remove if already exists
      const filtered = prev.filter((item) => !(item.type === result.type && item.id === result.id));

      // Add to beginning and limit size
      return [result, ...filtered].slice(0, MAX_HISTORY_ITEMS);
    });
  };

  // Clear search history
  const clearHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem(SEARCH_HISTORY_KEY);
  };

  // Process search results
  const searchResults = useMemo(() => {
    if (!searchResponse?.results) {
      return [];
    }

    return searchResponse.results.map(
      (item: any): SearchResult => ({
        id: item.id.toString(),
        type: item.type,
        name: item.name,
        description: item.description,
        location: item.location,
        imageUrl: item.image_url,
        metadata: {
          carbonScore: item.carbon_score,
          area: item.area,
          status: item.status
        },
        href: generateResultHref(item)
      })
    );
  }, [searchResponse]);

  return {
    searchResults,
    isLoading: shouldSearch && isLoading,
    isError,
    error,
    searchHistory,
    addToHistory,
    clearHistory
  };
};

// Helper function to generate navigation URLs for results
const generateResultHref = (item: any): string => {
  const { type, id, establishment_id, company_id } = item;

  switch (type) {
    case 'establishment':
      return `/admin/dashboard/establishment/${id}`;
    case 'parcel':
      return `/admin/dashboard/establishment/${establishment_id}/parcel/${id}`;
    default:
      return '/admin/dashboard';
  }
};
