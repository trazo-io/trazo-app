import { BsFillClipboardCheckFill } from 'react-icons/bs';
import { HomeIcon } from 'components/Icons/Icons';
import { Route } from 'types/common';
import { useIntl } from 'react-intl';
import { FaChartBar, FaCreditCard, FaGraduationCap } from 'react-icons/fa';
import { FaLeaf } from 'react-icons/fa';

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
    id: 'transparencyDashboard',
    name: 'Transparency',
    path: '/dashboard/farm/:farmId/transparency',
    icon: <FaLeaf color="inherit" />,
    authIcon: <FaLeaf color="inherit" />,
    layout: '/admin',
    collapse: true,
    isTransparencyDashboard: true,
    regex: /^\/admin\/dashboard\/farm\/[0-9]+\/transparency$/
  },
  {
    id: 'commercialInfo',
    name: 'Commercial Info',
    path: '/dashboard/farm',
    icon: <BsFillClipboardCheckFill color="inherit" />,
    authIcon: <BsFillClipboardCheckFill color="inherit" />,
    layout: '/admin',
    collapse: true,
    isCommercial: true,
    regex: /^\/admin\/dashboard\/farm\/[0-9]+\/commercial$/
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
