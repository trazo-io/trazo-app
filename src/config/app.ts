export const CSRF_TOKEN = 'csrftoken';
export const CSRF_HEADER_KEY = 'X-CSRFToken';
export const DEFAULT_PAGINATION_SIZE = 100;
// export const NODE_ENV = import.meta.env.DEV ? "development" : "production";

export const SUPERUSER = 1;
export const STAFF = 2;
export const CONSUMER = 3;
export const PRODUCER = 4;
export const CERTIFIER = 5;

// Company role codes (from WorksIn model)
export const ROLE_COMPANY_ADMIN = 'CA';
export const ROLE_FARM_MANAGER = 'FM';
export const ROLE_VIEWER = 'VW';

// Company role display names (from backend get_role_display)
export const ROLE_DISPLAY_COMPANY_ADMIN = 'Company Admin';
export const ROLE_DISPLAY_FARM_MANAGER = 'Farm Manager';
export const ROLE_DISPLAY_VIEWER = 'Viewer';
