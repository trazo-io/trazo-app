import { baseApi } from './baseApi';

// Quick carbon score data - minimal payload for fastest loading
export interface CarbonQuickScore {
  carbonScore: number;
  netFootprint: number;
  relatableFootprint?: string;
}

// Basic product info - second priority for loading
export interface ProductBasics {
  id: string;
  name: string;
  image?: string;
  company: {
    name: string;
    logo?: string;
  };
  isVerified: boolean;
}

// Full details - loaded last after the essentials
export interface ProductFullDetails {
  timeline: Array<{
    date: string;
    title: string;
    description: string;
    icon?: string;
  }>;
  blockchainVerification?: {
    verified: boolean;
    transaction_hash?: string;
    record_hash?: string;
    verification_url?: string;
    network?: string;
    verification_date?: string;
  };
  farmerStory?: string;
  establishment: {
    id: string;
    name: string;
    description?: string;
    image?: string;
    location?: {
      latitude?: number;
      longitude?: number;
      address?: string;
    };
    certifications?: Array<{
      name: string;
      icon?: string;
      description?: string;
    }>;
  };
  recommendations?: string[];
  badges?: Array<{
    id: string;
    name: string;
    description: string;
    icon: string;
  }>;
  industryPercentile?: number;
  industryAverage?: number;
  isUsdaVerified?: boolean;
}

const optimizedQrApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    // Priority 1: Fast carbon score - minimal payload (< 1KB)
    getCarbonQuickScore: build.query<CarbonQuickScore, string>({
      query: (productionId) => ({
        url: `/carbon/public/productions/${productionId}/complete/`,
        method: 'GET',
        credentials: 'include'
      }),
      transformResponse: (response: any) => {
        // Extract just what we need for quick score and round the carbon score to 1 decimal
        if (response?.carbonScore !== undefined) {
          return {
            carbonScore: Math.round((response.carbonScore || 0) * 10) / 10,
            netFootprint: response.netFootprint,
            relatableFootprint: response.relatableFootprint
          };
        }
        return response;
      },
      providesTags: (result, error, id) => [{ type: 'CarbonSummary', id }]
    }),

    // Priority 2: Basic product details - medium payload
    getProductBasics: build.query<ProductBasics, string>({
      query: (productionId) => ({
        url: `/carbon/public/productions/${productionId}/complete/`,
        method: 'GET',
        credentials: 'include'
      }),
      transformResponse: (response: any) => {
        // Extract just what we need for basics from complete endpoint
        if (response?.product) {
          return {
            id: response.id,
            name: response.product.name,
            image: response.product.image,
            company: {
              name: response.establishment?.company?.name || response.farmer?.company || 'Unknown',
              logo: response.establishment?.company?.logo
            },
            isVerified: response.blockchainVerification?.verified || false
          };
        }
        return response;
      },
      providesTags: (result, error, id) => [{ type: 'History', id }]
    }),

    // Priority 3: Full details - larger payload, loaded last
    getProductFullDetails: build.query<ProductFullDetails, string>({
      query: (productionId) => ({
        url: `/carbon/public/productions/${productionId}/complete/`,
        method: 'GET',
        credentials: 'include'
      }),
      // Fake endpoint until backend implementation
      transformResponse: (response: any) => {
        // If we get full QR data, extract details
        if (response) {
          return {
            timeline: response.timeline || [],
            blockchainVerification: response.blockchainVerification,
            farmerStory: response.farmerStory,
            establishment: {
              id: response.farmer?.id || '',
              name: response.farmer?.name || '',
              description: response.farmer?.description,
              image: response.farmer?.photo,
              location: {
                address: response.farmer?.location
              },
              certifications: response.farmer?.certifications
            },
            recommendations: response.recommendations,
            badges: response.badges,
            industryPercentile: response.industryPercentile,
            industryAverage: response.industryAverage,
            isUsdaVerified: response.isUsdaVerified
          };
        }
        return response;
      },
      providesTags: (result, error, id) => [
        { type: 'CarbonSummary', id },
        { type: 'History', id }
      ]
    })
  }),
  overrideExisting: false
});

export const {
  useGetCarbonQuickScoreQuery,
  useGetProductBasicsQuery,
  useGetProductFullDetailsQuery
} = optimizedQrApi;
