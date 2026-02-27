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
      const newData = state.data ? { ...state.data, ...payload.data } : payload.data;
      state.data = newData;
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
