import { USER_URL } from '../../config';
import baseApi from './baseApi';

export const userApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getMe: builder.query({
      query: () => ({
        url: 'users/me/',
        credentials: 'include'
      }),
      providesTags: ['User']
    }),
    updateUser: builder.mutation({
      query: ({ userId, userData }) => {
        const formData = new FormData();

        for (const [key, value] of Object.entries(userData)) {
          formData.append(key, value);
        }

        return {
          url: USER_URL(userId),
          method: 'PATCH',
          credentials: 'include',
          body: formData,
          formData: true
        };
      },
      invalidatesTags: (result, error, { userId }) => [{ type: 'User', userId }]
    }),
    // Change the login email (overall review 2026-11, OV-SEC-C03): the password, then a link to
    // the new address. Nothing changes until `confirmEmailChange` runs from that link.
    requestEmailChange: builder.mutation({
      query: ({ newEmail, password }) => ({
        url: USER_URL() + 'request_email_change/',
        method: 'POST',
        credentials: 'include',
        body: { new_email: newEmail, password }
      })
    }),
    confirmEmailChange: builder.mutation({
      query: ({ token }) => ({
        url: USER_URL() + 'confirm_email_change/',
        method: 'POST',
        credentials: 'include',
        body: { token }
      })
    }),
    getUserRoles: builder.query({
      query: () => ({
        url: USER_URL() + 'roles',
        credentials: 'include'
      })
    })
  })
});

export const {
  useGetMeQuery,
  useUpdateUserMutation,
  useGetUserRolesQuery,
  useRequestEmailChangeMutation,
  useConfirmEmailChangeMutation
} = userApi;
