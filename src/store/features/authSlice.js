import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  data: null,
  isAuthenticated: false,
  isLoading: true
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    login: (state, { payload }) => {
      // payload may be { data: {...} } or { user: {...} } depending on caller
      const userData = payload.data || payload.user || payload;
      state.data = state.data ? { ...state.data, ...userData } : userData;
      state.isAuthenticated = true;
      state.isLoading = false;
    },
    logout: (state) => {
      state.data = null;
      state.isAuthenticated = false;
      state.isLoading = false;

      // Clean up all Stripe checkout and subscription bypass flags so they
      // do not bleed into the next user session after logout.
      localStorage.removeItem('navigation_to_pricing');
      localStorage.removeItem('subscription_bypass_temp');
      localStorage.removeItem('subscription_bypass_until');
      localStorage.removeItem('stripe_checkout_in_progress');
      localStorage.removeItem('redirect_from_stripe');
      localStorage.removeItem('subscription_company_id');
      localStorage.removeItem('prevent_pricing_page');
      localStorage.removeItem('skip_pricing_render');

      // Clear auth redirect actions to prevent cross-user redirect bleed
      localStorage.removeItem('trazo_pending_auth_action');

      // Clear session-scoped flags that could bleed between user sessions
      sessionStorage.removeItem('pendingInvitation');
      sessionStorage.removeItem('just_authenticated');
      sessionStorage.removeItem('creating_establishment');
      sessionStorage.removeItem('just_created_establishment_id');
    },
    setData: (state, { payload }) => {
      const newData = state.data ? { ...state.data, ...payload.data } : payload.data;
      state.data = newData;
      state.isLoading = false;
    }
  }
});

export const { login, logout, setData } = authSlice.actions;
export default authSlice.reducer;
