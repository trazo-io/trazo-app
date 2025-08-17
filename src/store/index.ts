// @ts-ignore - JavaScript files without type declarations
import authReducer from './features/authSlice';
import { baseApi } from './api/baseApi';
import companyReducer from 'store/features/companySlice';
import { configureStore } from '@reduxjs/toolkit';
// @ts-ignore - JavaScript files without type declarations
import formReducer from './features/formSlice';
// @ts-ignore - JavaScript files without type declarations
import historySlice from './features/historySlice';
// @ts-ignore - JavaScript files without type declarations
import productReducer from './features/productSlice';
// @ts-ignore - JavaScript files without type declarations
import userReducer from './features/userSlice';
import notificationReducer from './features/notificationSlice';
import { setupListeners } from '@reduxjs/toolkit/query';
import { carbonApi } from './api/carbonApi';
import { mediaApi } from './api/mediaApi';
import { globalSearchApi } from './api/globalSearchApi';
import { config } from 'config/environment';

export const store = configureStore({
  reducer: {
    userState: userReducer,
    auth: authReducer,
    company: companyReducer,
    product: productReducer,
    form: formReducer,
    history: historySlice,
    notifications: notificationReducer,
    [baseApi.reducerPath]: baseApi.reducer,
    [carbonApi.reducerPath]: carbonApi.reducer,
    [mediaApi.reducerPath]: mediaApi.reducer,
    [globalSearchApi.reducerPath]: globalSearchApi.reducer
  },
  devTools: config.ENABLE_DEVTOOLS,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
      immutableCheck: config.IS_DEVELOPMENT // Only run expensive checks in development
    }).concat(baseApi.middleware, carbonApi.middleware, mediaApi.middleware, globalSearchApi.middleware)
});

// Set up listeners for refetching behavior
setupListeners(store.dispatch);

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch;
