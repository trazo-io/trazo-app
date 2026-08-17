import { HomeIcon } from 'components/Icons/Icons';
import { Route } from 'types/common';
import { useIntl } from 'react-intl';
import { FaChartBar, FaCreditCard, FaGraduationCap } from 'react-icons/fa';
import { FaCalendarAlt, FaFileAlt, FaFolderOpen, FaStore } from 'react-icons/fa';

// const intl = useIntl();

const dashRoutes: Route[] = [
  {
    id: 'home',
    name: 'Home',
    path: '/dashboard/farm',
    icon: <HomeIcon color="inherit" />,
    authIcon: <HomeIcon color="inherit" />,
    layout: '/admin',
    collapse: true,
    isHome: true,
    isDashboard: true,
    regex: /^\/admin\/dashboard\/farm\/[0-9]+(\/parcel\/[0-9]+)?$/
  },
  {
    id: 'activities',
    name: 'Activities',
    path: '/dashboard/farm/:farmId/activities',
    icon: <FaCalendarAlt color="inherit" />,
    authIcon: <FaCalendarAlt color="inherit" />,
    layout: '/admin',
    collapse: true,
    isActivities: true,
    regex: /^\/admin\/dashboard\/farm\/[0-9]+\/activities$/
  },
  {
    id: 'organicSystemPlan',
    name: 'Organic System Plan',
    path: '/dashboard/farm/:farmId/osp',
    icon: <FaFileAlt color="inherit" />,
    authIcon: <FaFileAlt color="inherit" />,
    layout: '/admin',
    collapse: true,
    isOrganicSystemPlan: true,
    regex: /^\/admin\/dashboard\/farm\/[0-9]+\/osp$/
  },
  {
    id: 'documents',
    name: 'Documents',
    path: '/dashboard/farm/:farmId/documents',
    icon: <FaFolderOpen color="inherit" />,
    authIcon: <FaFolderOpen color="inherit" />,
    layout: '/admin',
    collapse: true,
    isDocuments: true,
    regex: /^\/admin\/dashboard\/farm\/[0-9]+\/documents$/
  },
  {
    id: 'buyer',
    name: 'Buyer Page',
    path: '/dashboard/farm/:farmId/buyer',
    icon: <FaStore color="inherit" />,
    authIcon: <FaStore color="inherit" />,
    layout: '/admin',
    collapse: true,
    isBuyer: true,
    regex: /^\/admin\/dashboard\/farm\/[0-9]+\/buyer$/
  },
  {
    id: 'subscription',
    name: 'Subscription & Usage',
    path: '/dashboard/subscription',
    icon: <FaCreditCard color="inherit" />,
    authIcon: <FaCreditCard color="inherit" />,
    layout: '/admin',
    collapse: true,
    isCompanySettings: true,
    regex: /^\/admin\/dashboard\/subscription$/
  },
  {
    id: 'education',
    name: 'Educational Resources',
    path: '/dashboard/education',
    icon: <FaGraduationCap color="inherit" />,
    authIcon: <FaGraduationCap color="inherit" />,
    layout: '/admin',
    collapse: true,
    isCompanySettings: true,
    regex: /^\/admin\/dashboard\/education(\/.*)?$/
  }
];

export default dashRoutes;
