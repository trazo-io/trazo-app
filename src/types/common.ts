interface Route {
  id: string;
  name: string;
  path: string;
  category?: string;
  component?: React.ComponentType<any>;
  collapse?: boolean;
  // `string | number`: the sidebar builds these from `establishment.id`, which the API
  // serves as a number, while route params arrive as strings. Declaring `string` alone
  // made every dynamic route the sidebar generates fail to typecheck.
  farmId?: string | number;
  /** @deprecated Use farmId instead */
  establishmentId?: string;
  authIcon?: JSX.Element;
  icon?: JSX.Element;
  layout: string;
  isDashboard?: boolean;
  regex: RegExp;
  isCommercial?: boolean;
  isCarbonDashboard?: boolean;
  isIoTDashboard?: boolean;
  isCompanySettings?: boolean;
  isTransparencyDashboard?: boolean;
  isOrganicSystemPlan?: boolean;
  // Routes added after this interface stopped being maintained alongside routes.tsx. The
  // sidebar keys off these flags, so a missing one is not cosmetic — the entry silently
  // fails to match. Added 2026-08-11 while reviving the typecheck gate.
  isActivities?: boolean;
  isDocuments?: boolean;
  isBuyer?: boolean;
  items?: Route[];
  secondaryNavbar?: boolean | undefined;
  isHome?: boolean;
}

export type { Route };
