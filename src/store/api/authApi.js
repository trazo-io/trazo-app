import {
  LOGIN_URL,
  SIGNUP_URL,
  USER_DATA_URL,
  VERIFY_EMAIL_URL,
  SOCIAL_AUTH_URL
} from '../../config';

import baseApi from './baseApi';
import { setCompany } from 'store/features/companySlice';
import { setUser } from 'store/features/userSlice';

const authApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    login: build.mutation({
      query: ({ email, password }) => ({
        url: LOGIN_URL,
        method: 'POST',
        body: { email: email.toLowerCase(), password },
        credentials: 'include'
      }),
      async onQueryStarted(userId, { dispatch, queryFulfilled }) {
        try {
          const result = await queryFulfilled;
          dispatch(setUser(result.data.user));
          if (result.data.user['companies'].length > 0) {
            const { data } = await dispatch(
              baseApi.endpoints.getCompany.initiate(result.data.user['companies'][0].id)
            );
            dispatch(setCompany(data));
          }
        } catch (error) {
          console.error(error);
        }
      }
    }),
    signUp: build.mutation({
      query(data) {
        return {
          url: SIGNUP_URL,
          method: 'POST',
          body: data
        };
      }
    }),
    logout: build.mutation({
      query: () => ({
        url: 'auth/logout/',
        method: 'POST',
        body: {},
        credentials: 'include',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json'
        }
      }),
      invalidatesTags: (result) => (result ? ['User', 'Company', 'Parcel', 'History'] : []),
      onQueryStarted: async (arg, { dispatch, queryFulfilled }) => {
        try {
          await queryFulfilled;
          // Reset the state directly here
          dispatch(baseApi.util.resetApiState());
        } catch (error) {
          // Handle logout failure
        }
      }
    }),
    verifyEmail: build.mutation({
      query({ email, code }) {
        return {
          url: VERIFY_EMAIL_URL,
          method: 'POST',
          body: {
            email: email,
            code: code
          },
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json'
          }
        };
      },
      async onQueryStarted(args, { dispatch, queryFulfilled }) {
        try {
          const result = await queryFulfilled;
          // If verification response includes user data and tokens, auto-sign in
          if (result.data.user && result.data.access) {
            dispatch(setUser(result.data.user));
            // Get company data if user has companies
            if (result.data.user['companies'] && result.data.user['companies'].length > 0) {
              try {
                const { data } = await dispatch(
                  baseApi.endpoints.getCompany.initiate(result.data.user['companies'][0].id)
                );
                dispatch(setCompany(data));
              } catch (error) {
                // Continue even if company data fetch fails
                console.warn('Could not fetch company data:', error);
              }
            }
          }
        } catch (error) {
          // Verification failed, don't handle auto-sign in
          console.error('Verification failed:', error);
        }
      }
    }),
    resendVerificationEmail: build.mutation({
      query({ email }) {
        return {
          url: 'users/resend_verification_email/',
          method: 'POST',
          body: {
            email: email
          },
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json'
          }
        };
      }
    }),
    socialAuth: build.mutation({
      query: ({ provider, access_token, id_token, user_type, user }) => ({
        url: SOCIAL_AUTH_URL,
        method: 'POST',
        body: {
          provider,
          access_token,
          id_token,
          user_type,
          user // For Apple Sign In name data
        },
        credentials: 'include'
      }),
      async onQueryStarted(args, { dispatch, queryFulfilled }) {
        try {
          const result = await queryFulfilled;
          dispatch(setUser(result.data.user));
          if (result.data.user['companies'].length > 0) {
            const { data } = await dispatch(
              baseApi.endpoints.getCompany.initiate(result.data.user['companies'][0].id)
            );
            dispatch(setCompany(data));
          }
        } catch (error) {
          console.error('Social auth error:', error);
        }
      }
    }),
    userData: build.query({
      query: () => {
        return {
          url: USER_DATA_URL,
          method: 'GET',
          credentials: 'include'
        };
      },
      providesTags: (result) => (result ? ['User'] : []),
      async onQueryStarted(userId, { dispatch, queryFulfilled }) {
        try {
          const result = await queryFulfilled;
          dispatch(setUser(result.data));
          if (result.data['companies'].length > 0) {
            const { data } = await dispatch(
              baseApi.endpoints.getCompany.initiate(result.data['companies'][0].id)
            );
            dispatch(setCompany(data));
          }
        } catch (error) {
          console.error(error);
        }
      }
    })
  }),
  overrideExisting: false
});

export const {
  useUserDataQuery,
  useLoginMutation,
  useSignUpMutation,
  useLogoutMutation,
  useVerifyEmailMutation,
  useResendVerificationEmailMutation,
  useSocialAuthMutation
} = authApi;
