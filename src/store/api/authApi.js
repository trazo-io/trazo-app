import {
  LOGIN_URL,
  SIGNUP_URL,
  USER_DATA_URL,
  VERIFY_EMAIL_URL,
  SOCIAL_AUTH_URL,
  PASSWORD_CHANGE_URL,
  PASSWORD_RESET_REQUEST_URL,
  PASSWORD_RESET_CONFIRM_URL
} from '../../config';

import baseApi from './baseApi';
import { setCompany } from 'store/features/companySlice';
import { setUser } from 'store/features/userSlice';
import { TokenManager } from '../../utils/secureTokenStorage';

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
          console.log('🔒 LOGIN: Login successful, processing result');
          
          // SECURITY: Store tokens using secure token manager only
          TokenManager.setAccessToken(result.data.access);
          console.log('🔒 LOGIN: Access token stored securely. Length:', result.data.access.length);
          
          // WAIT a brief moment to ensure token is available for subsequent requests
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // SECOND: Set user data
          dispatch(setUser(result.data.user));
          console.log('🔒 LOGIN: User data set in Redux');
          
          // THIRD: Get company data if available (but don't let this fail everything)
          if (result.data.user['companies'].length > 0) {
            try {
              const { data } = await dispatch(
                baseApi.endpoints.getCompany.initiate(result.data.user['companies'][0].id)
              );
              dispatch(setCompany(data));
              console.log('🔒 LOGIN: Company data loaded successfully');
            } catch (companyError) {
              console.warn('🔒 LOGIN: Company data fetch failed, but continuing with login:', companyError);
              // Don't clear tokens if company fetch fails
            }
          }
          
          console.log('🔒 LOGIN: Login flow completed successfully');
        } catch (error) {
          console.error('🔒 LOGIN: Login flow failed:', error);
          // Clear tokens only if the main login failed
          TokenManager.clearTokens();
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
        credentials: 'include'
        // CSRF token will be handled by customFetchBase prepareHeaders
      }),
      invalidatesTags: (result) => (result ? ['User', 'Company', 'Parcel', 'History'] : []),
      onQueryStarted: async (arg, { dispatch, queryFulfilled }) => {
        try {
          console.log('🔒 LOGOUT: Starting logout process');
          await queryFulfilled;
          console.log('🔒 LOGOUT: Server logout successful');
          // SECURITY: Clear all tokens securely
          TokenManager.clearTokens();
          // Reset the state directly here
          dispatch(baseApi.util.resetApiState());
          console.log('🔒 LOGOUT: Local cleanup completed');
        } catch (error) {
          console.error('🔒 LOGOUT: Server logout failed, but clearing local tokens:', error);
          // SECURITY: Even if logout fails, clear local tokens for security
          TokenManager.clearTokens();
          console.error('Logout error:', error);
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
            // SECURITY: Store access token securely
            TokenManager.setAccessToken(result.data.access);
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
        body: { email },
        credentials: 'include'
      })
    }),
    confirmPasswordReset: build.mutation({
      query: ({ token, email, new_password }) => ({
        url: 'users/confirm_password_reset/',
        method: 'POST',
        body: { token, email, new_password },
        credentials: 'include'
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
