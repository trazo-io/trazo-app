/**
 * Everything this tab holds for the signed-in person, cleared at once: the auth, user and company
 * slices, the local event drafts (not user-scoped), and the RTK Query cache (some endpoints keep
 * data for up to an hour), which must go BEFORE navigating or the next session in this tab sees
 * the previous user's data.
 *
 * One copy, used wherever a session ends: Sign out in both navbars, and the email-change link
 * page, where the backend has just ended every session on the account (review of app #362, which
 * found that page clearing the auth slice alone).
 */
import type { Dispatch } from '@reduxjs/toolkit';

import baseApi from 'store/api/baseApi';
import { logout } from 'store/features/authSlice';
import { clearCurrentCompany } from 'store/features/companySlice';
import { clearUser } from 'store/features/userSlice';
import { clearAllEventDrafts } from 'hooks/useEventDraft';

export const clearLocalSession = (dispatch: Dispatch) => {
  dispatch(logout());
  dispatch(clearCurrentCompany());
  dispatch(clearUser());
  clearAllEventDrafts();
  dispatch(baseApi.util.resetApiState() as never);
};
