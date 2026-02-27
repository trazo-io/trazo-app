import { useSelector } from 'react-redux';
import {
  ROLE_DISPLAY_COMPANY_ADMIN,
  ROLE_DISPLAY_FARM_MANAGER,
  ROLE_DISPLAY_VIEWER,
  SUPERUSER
} from 'config';

/**
 * Hook to check the current user's role in their active company.
 * Used to conditionally show/hide UI elements based on permissions.
 *
 * Roles:
 * - Company Admin (CA): Full access
 * - Farm Manager (FM): Can create/edit/delete farm data
 * - Viewer (VW): Read-only access
 */
export function useUserRole() {
  const currentUser = useSelector((state: any) => state.userState.user);
  const role = currentUser?.companies?.[0]?.role;
  const isSuperuser = currentUser?.user_type === SUPERUSER;

  const isAdmin = role === ROLE_DISPLAY_COMPANY_ADMIN || isSuperuser;
  const isManager = role === ROLE_DISPLAY_FARM_MANAGER;
  const isViewer = role === ROLE_DISPLAY_VIEWER;

  // Can create, edit, delete farm data (Admin + Manager)
  const canWrite = isAdmin || isManager;

  // Can manage company settings, billing, invitations (Admin only)
  const canManageCompany = isAdmin;

  return {
    role,
    isAdmin,
    isManager,
    isViewer,
    canWrite,
    canManageCompany
  };
}
