import { createApi } from '@reduxjs/toolkit/query/react';
import baseApi from './baseApi';

const invitationApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    // Send company invitation
    sendInvitation: build.mutation({
      query: (invitationData) => ({
        url: 'invitations/create/',
        method: 'POST',
        body: invitationData,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
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
      // Login handling is done in the component instead of here
      // to avoid conflicts and ensure proper error handling
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
