import { HomeIcon } from 'components/Icons/Icons';
import { Route } from 'types/common';
import { useIntl } from 'react-intl';
import { FaChartBar, FaCreditCard, FaGraduationCap } from 'react-icons/fa';
import { FaCalendarAlt, FaCommentDots, FaFileAlt, FaFolderOpen, FaStore } from 'react-icons/fa';

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
    // MEASURED in a browser 2026-09-26: the page existed, the route worked, and NOTHING in the
    // sidebar pointed at it, so the only way in was typing the URL. That is the orphaned-feature
    // class `voiceMounted.test.ts` was written about, and a source test cannot see it because the
    // route and the component were both present and correct.
    //
    // A neutral message icon, not a WhatsApp mark: the provider sits behind an adapter seam so the
    // channel can move to Meta, and branding the navigation for one vendor would outlive it.
    //
    // POSITION, moved here 2026-09-27 and the array order is what the sidebar renders. This entry
    // used to sit third of eight, above `organicSystemPlan` and `documents`, which are the two
    // OUTPUTS the Compliance plan is sold on: an input channel outranking them advertises the
    // mechanism over the thing a grower buys. It was also the only `isCompanySettings` row (a flat
    // NavLink, no chevron, Sidebar.tsx:452) wedged between two chevroned farm accordions, while
    // being the only company-scoped entry in that run: every neighbour's path carries a :farmId
    // and this one cannot, because a note legally arrives with no farm at all
    // (`CrewSender.filing_establishment` returns None when the roster names no farm, or names
    // another company's).
    //
    // So it now leads the flat company block instead of interrupting the farm block. It stays
    // AHEAD of Subscription and Education because those are settings and reference, read when
    // somebody goes looking, and this is a queue with work waiting in it.
    //
    // The id is `crewNotes` while the page, the API and the backend app are all called field notes,
    // and that is deliberate. The sidebar labels an entry from `app.<id>` (Sidebar.tsx:300), and
    // `app.fieldNotes` was already taken by the event detail modal's own Field Notes section
    // (EventDetailsModal.tsx:1085): the farmer's observation text on one record, not a queue of
    // messages somebody sent. Reusing the key put two meanings on one string: retitling either
    // surface would silently retitle the other. A distinct id buys a distinct key.
    id: 'crewNotes',
    name: 'Field Notes',
    path: '/dashboard/field-notes',
    icon: <FaCommentDots color="inherit" />,
    authIcon: <FaCommentDots color="inherit" />,
    layout: '/admin',
    collapse: true,
    isCompanySettings: true,
    regex: /^\/admin\/dashboard\/field-notes$/
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
