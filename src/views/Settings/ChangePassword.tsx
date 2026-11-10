/**
 * Change your own password. Reached from your profile, by any member of the company.
 *
 * 2026-11-10: every word was an English literal ("Security Settings", "Security Tips:"), so the
 * page stayed English in Spanish. The lock icon and its paragraph repeated the title, and the
 * green tips box ended with "Enable two-factor authentication when available": Trazo has no
 * two-factor sign-in, so it pointed at a setting no one can find. The page is now the form.
 *
 * Back names where it goes (your profile, the only way in), instead of `navigate(-1)`.
 */
import React from 'react';
import { useIntl } from 'react-intl';
import { useNavigate } from 'react-router-dom';

import { StandardPage } from '../../components/Design/StandardComponents';
import { ChangePasswordForm } from '../../components/Forms/ChangePasswordForm';

export const PROFILE_PATH = '/admin/dashboard/profile';

const ChangePassword: React.FC = () => {
  const navigate = useNavigate();
  const intl = useIntl();

  return (
    <StandardPage
      title={intl.formatMessage({ id: 'account.password.title' })}
      description={intl.formatMessage({ id: 'account.password.description' })}
      showBackButton
      backLabel={intl.formatMessage({ id: 'account.backToProfile' })}
      contentMaxW="xl"
      onBack={() => navigate(PROFILE_PATH)}>
      <ChangePasswordForm userType="producer" />
    </StandardPage>
  );
};

export default ChangePassword;
