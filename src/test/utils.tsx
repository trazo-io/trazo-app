import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import theme from '../theme/theme';
// 🔴 2026-08-21 — was `import { api } from '../store/api/api'`, a module that does not exist.
// Every suite importing this helper therefore died at IMPORT, so `Loader.test.tsx` and
// `S3Image.test.tsx` — 11 cases between them — had been asserting nothing while the suite
// reported green over the hole. Same shape as the dead typecheck gate and the blind lint gate:
// a check that cannot run looks identical to a check that passes.
//
// The real slice is `baseApi`, and its `reducerPath` is 'baseApi' — the key below has to match
// it, or RTK Query throws at store construction.
import { baseApi } from '../store/api/baseApi';

// Mock store for testing
const createTestStore = (preloadedState = {}) => {
  return configureStore({
    reducer: {
      // Keyed by `baseApi.reducerPath`, not a hand-typed 'api'. Every endpoint module in this
      // codebase is `baseApi.injectEndpoints(...)`, which returns THE SAME instance, so one
      // reducer and one middleware is the whole wiring (see the note in src/store/index).
      [baseApi.reducerPath]: baseApi.reducer
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(baseApi.middleware),
    preloadedState
  });
};

interface AllTheProvidersProps {
  children: React.ReactNode;
  initialState?: any;
}

const AllTheProviders: React.FC<AllTheProvidersProps> = ({ children, initialState = {} }) => {
  const store = createTestStore(initialState);

  return (
    <Provider store={store}>
      <ChakraProvider theme={theme}>
        <BrowserRouter>{children}</BrowserRouter>
      </ChakraProvider>
    </Provider>
  );
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'> & { initialState?: any }
) => {
  const { initialState, ...renderOptions } = options || {};

  return render(ui, {
    wrapper: (props) => <AllTheProviders {...props} initialState={initialState} />,
    ...renderOptions
  });
};

// Mock API responses
export const mockApiResponse = {
  success: (data: any) => ({
    data,
    isLoading: false,
    isError: false,
    error: null
  }),
  loading: () => ({
    data: undefined,
    isLoading: true,
    isError: false,
    error: null
  }),
  error: (message: string) => ({
    data: undefined,
    isLoading: false,
    isError: true,
    error: { message }
  })
};

// Mock user data
export const mockUser = {
  id: 1,
  email: 'test@example.com',
  first_name: 'Test',
  last_name: 'User',
  user_type: 'producer',
  is_active: true
};

// Mock company data
export const mockCompany = {
  id: 1,
  name: 'Test Company',
  country: 'USA',
  establishments: [
    {
      id: 1,
      name: 'Test Farm',
      country: 'USA',
      parcels: [
        {
          id: 1,
          name: 'Test Field',
          area: 100,
          certified: false
        }
      ]
    }
  ]
};

// Mock production data
export const mockProduction = {
  id: 1,
  name: 'Test Production',
  start_date: '2024-01-01',
  finish_date: '2024-06-01',
  published: true,
  carbon_score: 85,
  product: {
    id: 1,
    name: 'Organic Tomatoes'
  },
  parcel: {
    id: 1,
    name: 'Test Field'
  }
};

// Export everything
export * from '@testing-library/react';
export { customRender as render };
