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
import { mediaApi } from './api/mediaApi';
// Side-effect imports, NOT unused. Both modules call
// `baseApi.injectEndpoints(...)` at import time; importing them here guarantees
// their endpoints are registered on baseApi before the store is constructed,
// rather than depending on whichever component happens to import a hook first.
// They deliberately contribute no reducer or middleware of their own — they ARE
// baseApi (see the note in the reducer map below).
import './api/carbonApi';
import './api/globalSearchApi';
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
    // `carbonApi` and `globalSearchApi` are `baseApi.injectEndpoints(...)`, which
    // returns THE SAME api instance — same reducerPath ('baseApi'), same reducer,
    // same middleware. Listing them here registered one reducer under one key
    // three times (TS1117, invisible while the typecheck gate was down) and, more
    // importantly, concat'd the identical RTK Query middleware three times below.
    // RTK warns against that: every dispatched action ran the same middleware
    // three times, tripling its subscription bookkeeping.
    //
    // Only genuinely distinct APIs belong here. `mediaApi` is its own createApi.
    [baseApi.reducerPath]: baseApi.reducer,
    [mediaApi.reducerPath]: mediaApi.reducer
  },
  devTools: config.ENABLE_DEVTOOLS,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
      immutableCheck: config.IS_DEVELOPMENT // Only run expensive checks in development
    }).concat(baseApi.middleware, mediaApi.middleware)
});

// Set up listeners for refetching behavior
setupListeners(store.dispatch);

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch;
