/**
 * `/admin/dashboard/settings/applicators`: the saved applicators on a page of their own.
 *
 * Company Settings shows the same list in its Applicators tab, but that page is for
 * administrators only, and a farm manager both logs sprays and may edit this list. So the spray
 * form links here, a page every member can open (only administrators and farm managers see the
 * controls). The spray form opens it in a new tab, so a half-filled record is never left behind;
 * Back therefore returns to the previous page when there is one and to the dashboard otherwise.
 */
import { useIntl } from 'react-intl';
import { useNavigate } from 'react-router-dom';

import { StandardPage } from 'components/Design/StandardComponents';
import ApplicatorRegister from './ApplicatorRegister';

const ApplicatorsPage = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  return (
    <StandardPage
      title={intl.formatMessage({ id: 'settings.applicators.title' })}
      description={intl.formatMessage({ id: 'settings.applicators.pageDescription' })}
      showBackButton
      onBack={() => (window.history.length > 1 ? navigate(-1) : navigate('/admin/dashboard'))}>
      <ApplicatorRegister />
    </StandardPage>
  );
};

export default ApplicatorsPage;
