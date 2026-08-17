import baseApi from './baseApi';
import { RootState } from '../index';
import { PLANS_URL, COMPLETE_CHECKOUT_URL } from '../../config/backend';
// Define types for plan data
export interface PlanFeatures {
  max_establishments: number;
  max_parcels?: number;
  max_parcels_per_establishment?: number;
  max_productions_per_year: number;
  monthly_scan_limit: number;
  storage_limit_gb: number;
  support_response_time: number;
  priority_support?: boolean;
  dedicated_support?: boolean;
  voice_recording?: boolean;
  ai_event_templates?: boolean;
  is_starter?: boolean;
  trial_no_card_days?: number;
  trial_with_card_days?: number;
}

export interface Plan {
  id: number;
  name: string;
  slug: string;
  description: string;
  price: number;
  interval: 'monthly' | 'yearly';
  features: PlanFeatures;
  is_active: boolean;
  stripe_price_id: string;
  created_at: string;
  updated_at: string;
}

export interface CheckoutSessionRequest {
  plan_id?: string;
  company_id: string;
  interval?: string;
  new_company?: boolean;
  trial_days?: number;

  // Add-on parameters — RETIRED.
  //
  // The checkout-session add-on branch opened a SECOND Stripe subscription for the same
  // company and mapped three slugs (`extraProduction`, `extraParcel`, `extraStorage`) that
  // migrations 0006/0010 deactivated years of decisions ago. The backend now answers 410
  // and points at `add_addon`, which attaches the add-on to the subscription that already
  // exists. Kept in the type only so an old caller fails at compile time with a reason.
  /** @deprecated Use the `addAddon` mutation. This path returns 410 USE_ADD_ADDON_ENDPOINT. */
  addon_type?: never;
  quantity?: number;
}

export interface CheckoutSessionResponse {
  sessionId: string;
}

// Add new interface for the complete checkout request
export interface CompleteCheckoutRequest {
  session_id: string;
  company_id: string;
}

export interface CompleteCheckoutResponse {
  success: boolean;
  subscription_id?: string;
  error?: string;
  company?: any; // Company data returned from backend
}

// Instead of creating a new API, inject endpoints into your base API
export const subscriptionApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getPlans: builder.query<Plan[], string | void>({
      // No interval -> the full self-serve lineup (Starter + Compliance since the 2026-08
      // restructure). The interval filter only matters to legacy callers.
      query: (interval) => ({
        url: PLANS_URL,
        params: interval ? { interval } : undefined,
        credentials: 'include' // Consistent with your other APIs
      })
    }),
    completeCheckout: builder.mutation<CompleteCheckoutResponse, CompleteCheckoutRequest>({
      query: (body) => ({
        url: COMPLETE_CHECKOUT_URL,
        method: 'POST',
        body,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      }),
      // Invalidate the company data to force a refresh
      invalidatesTags: (result, error, request) => [
        { type: 'Company', id: request.company_id },
        { type: 'Subscription', id: 'LIST' }
      ]
    })
  })
});

// Export hooks for usage in components
export const { useGetPlansQuery, useCompleteCheckoutMutation } = subscriptionApi;
