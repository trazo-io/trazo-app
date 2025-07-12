import { createApi } from '@reduxjs/toolkit/query/react';
import baseApi from './baseApi';

const invitationApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    // Send company invitation
    sendInvitation: build.mutation({
      query: (invitationData) => ({
        url: 'invitations/create/',
        method: 'POST',
        body: invitationData
      }),
      invalidatesTags: ['CompanyInvitations', 'Company']
    }),

    // List company invitations
    getInvitations: build.query({
      query: () => 'invitations/',
      providesTags: ['CompanyInvitations']
    }),

    // Accept invitation (public endpoint)
    acceptInvitation: build.mutation({
      query: (invitationCode) => ({
        url: `invitation/${invitationCode}/accept/`,
        method: 'POST'
      }),
      invalidatesTags: ['CompanyInvitations', 'Company', 'User'],
      async onQueryStarted(args, { dispatch, queryFulfilled }) {
        try {
          const result = await queryFulfilled;
          // For authenticated users accepting invitations, invalidate company data
          // so the new company relationship is loaded on next API call
          if (result.data.company && typeof result.data.company === 'object') {
            const { setCompany } = await import('store/features/companySlice');
            dispatch(setCompany(result.data.company));
          }
        } catch (error) {
          console.error('Accept invitation failed:', error);
        }
      }
    }),

    // Decline invitation (public endpoint)
    declineInvitation: build.mutation({
      query: (invitationCode) => ({
        url: `invitation/${invitationCode}/decline/`,
        method: 'POST'
      }),
      invalidatesTags: ['CompanyInvitations']
    }),

    // Resend invitation
    resendInvitation: build.mutation({
      query: (invitationId) => ({
        url: `invitations/${invitationId}/resend/`,
        method: 'POST'
      }),
      invalidatesTags: ['CompanyInvitations']
    }),

    // Cancel invitation
    cancelInvitation: build.mutation({
      query: (invitationId) => ({
        url: `invitations/${invitationId}/cancel/`,
        method: 'DELETE'
      }),
      invalidatesTags: ['CompanyInvitations']
    }),

    // Get invitation details (for acceptance page)
    getInvitationDetails: build.query({
      query: (invitationCode) => `invitation/${invitationCode}/`,
      providesTags: (result, error, invitationCode) => [{ type: 'Invitation', id: invitationCode }]
    }),

    // Signup with invitation (creates account and accepts invitation)
    signupWithInvitation: build.mutation({
      query: (signupData) => ({
        url: 'auth/signup-with-invitation/',
        method: 'POST',
        body: signupData
      }),
      invalidatesTags: ['CompanyInvitations', 'Company', 'User'],
      async onQueryStarted(args, { dispatch, queryFulfilled }) {
        try {
          const result = await queryFulfilled;
          // If signup response includes user data and tokens, auto-sign in
          if (result.data.user && result.data.access) {
            const { setUser } = await import('store/features/userSlice');
            const { login } = await import('store/features/authSlice');
            const { setCompany } = await import('store/features/companySlice');

            // Set company data in both slices for proper subscription detection
            if (result.data.company) {
              dispatch(setCompany(result.data.company));

              // Create user data with company information for navbar
              const userWithCompanies = {
                ...result.data.user,
                companies: [
                  {
                    ...result.data.company,
                    role:
                      result.data.role === 'CA'
                        ? 'Company Admin'
                        : result.data.role === 'FM'
                        ? 'Farm Manager'
                        : result.data.role === 'DW'
                        ? 'Domain Worker'
                        : result.data.role
                  }
                ]
              };

              // Set user data with company information
              dispatch(setUser(userWithCompanies));

              // Also set auth data with company information for SubscriptionRequired
              dispatch(
                login({
                  data: {
                    ...userWithCompanies,
                    selectedCompany: result.data.company.id
                  }
                })
              );
            } else {
              // Set user data without companies if no company data
              dispatch(setUser(result.data.user));
            }
          }
        } catch (error) {
          console.error('Signup with invitation failed:', error);
        }
      },
      invalidatesTags: ['CompanyInvitations', 'Company', 'User']
    })
  })
});

export const {
  useSendInvitationMutation,
  useGetInvitationsQuery,
  useAcceptInvitationMutation,
  useDeclineInvitationMutation,
  useResendInvitationMutation,
  useCancelInvitationMutation,
  useGetInvitationDetailsQuery,
  useSignupWithInvitationMutation
} = invitationApi;

export default invitationApi;
