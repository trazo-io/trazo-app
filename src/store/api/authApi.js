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
import { TokenManager } from '../../utils/secureTokenStorage';

const authApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    login: build.mutation({
      query: ({ email, password, remember_me = false }) => ({
        url: LOGIN_URL,
        method: 'POST',
        body: { email: email.toLowerCase(), password, remember_me },
        credentials: 'include'
      }),
      async onQueryStarted(args, { dispatch, queryFulfilled }) {
        try {
          const result = await queryFulfilled;

          // Clean up any legacy token storage
          TokenManager.cleanupLegacyStorage();

          // Tokens are now set as httpOnly cookies by the backend response.
          // No need to store them in JS — the browser handles cookie persistence.

          // Set user data in Redux
          dispatch(setUser(result.data.user));

          // Load company data if available
          if (result.data.user['companies'].length > 0) {
            try {
              const { data } = await dispatch(
                baseApi.endpoints.getCompany.initiate(result.data.user['companies'][0].id)
              );
              dispatch(setCompany(data));
            } catch (companyError) {
              console.warn('Company data fetch failed, continuing with login:', companyError);
            }
          }
        } catch (error) {
          console.error('Login flow failed:', error);
        }
      }
    }),
    signUp: build.mutation({
      query(data) {
        return {
          url: SIGNUP_URL,
          method: 'POST',
          body: data,
          credentials: 'include'
        };
      }
    }),
    logout: build.mutation({
      query: () => ({
        url: 'auth/logout/',
        method: 'POST',
        body: {},
        credentials: 'include'
      }),
      onQueryStarted: async (arg, { queryFulfilled }) => {
        try {
          await queryFulfilled;
        } catch (error) {
          console.error('Logout server error:', error);
        }
        // Clean up any legacy client-side storage.
        // RTK Query cache reset and Redux state cleanup are handled
        // by the calling component (navbar) BEFORE navigation.
        TokenManager.clearTokens();
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
          },
          credentials: 'include'
        };
      },
      async onQueryStarted(args, { dispatch, queryFulfilled }) {
        try {
          const result = await queryFulfilled;
          // If verification response includes user data, auto-sign in
          // Tokens are set as httpOnly cookies by the backend
          if (result.data.user) {
            dispatch(setUser(result.data.user));
            if (result.data.user['companies'] && result.data.user['companies'].length > 0) {
              try {
                const { data } = await dispatch(
                  baseApi.endpoints.getCompany.initiate(result.data.user['companies'][0].id)
                );
                dispatch(setCompany(data));
              } catch (error) {
                console.warn('Could not fetch company data:', error);
              }
            }
          }
        } catch (error) {
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
      query: ({ provider, access_token, id_token, user_type, user, invitation_code }) => ({
        url: SOCIAL_AUTH_URL,
        method: 'POST',
        body: {
          provider,
          access_token,
          id_token,
          user_type,
          user,
          invitation_code
        },
        credentials: 'include'
      }),
      async onQueryStarted(args, { dispatch, queryFulfilled }) {
        try {
          const result = await queryFulfilled;
          TokenManager.cleanupLegacyStorage();
          dispatch(setUser(result.data.user));
          // Tokens are set as httpOnly cookies by the backend

          if (result.data.invitation_accepted && result.data.company) {
            dispatch(setCompany(result.data.company));
            sessionStorage.removeItem('pendingInvitation');
          } else if (result.data.user['companies'].length > 0) {
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
            try {
              const { data } = await dispatch(
                baseApi.endpoints.getCompany.initiate(result.data['companies'][0].id)
              );
              dispatch(setCompany(data));
            } catch (companyError) {
              console.warn('Company data fetch failed during session restore:', companyError);
            }
          }
        } catch (error) {
          console.error(error);
        }
      }
    }),
    changePassword: build.mutation({
      query: ({ old_password, new_password }) => ({
        url: 'users/change_password/',
        method: 'POST',
        body: { old_password, new_password },
        credentials: 'include'
      })
    }),
    requestPasswordReset: build.mutation({
      query: ({ email }) => ({
        url: 'users/request_password_reset/',
        method: 'POST',
        body: { email }
      })
    }),
    confirmPasswordReset: build.mutation({
      query: ({ token, email, new_password }) => ({
        url: 'users/confirm_password_reset/',
        method: 'POST',
        body: { token, email, new_password }
      })
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
  useSocialAuthMutation,
  useChangePasswordMutation,
  useRequestPasswordResetMutation,
  useConfirmPasswordResetMutation
} = authApi;
