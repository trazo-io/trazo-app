export interface Company {
  id: string;
  name: string;
  tradename?: string;
  address: string;
  postcode: string;
  city: string;
  state?: string;
  country: string;
  phone: string;
  email: string;
  website: string;
  logo: string;
  invitation_code?: string;
  // Backend uses contact_email/contact_phone/fiscal_id
  contact_email?: string;
  contact_phone?: string;
  fiscal_id?: string;
  zip_code?: string;
  employees: Employee[];
  establishments: Establishment[];
  parcels?: Parcel[];
  subscription?: Subscription;
  has_subscription?: boolean;
  subscription_plan?: any;
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  type: string;
}

export interface Farm {
  id: string | number;
  name: string;
  description?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  zone?: string;
  zipCode?: string;
  image?: string;
  parcels?: Parcel[];
  // GPS coordinates for map centering when creating parcels
  latitude?: number;
  longitude?: number;
}

/** @deprecated Use Farm instead */
export type Establishment = Farm;

export interface Parcel {
  id: string | number;
  name: string;
  description?: string;
  image?: string;
  has_current_production?: boolean;
  /** Name of the crop in the current production (from ParcelBasicSerializer) */
  product?: string | null;
  // Add other properties as needed
}

export interface Subscription {
  id: string | number;
  status: string;
  plan: Plan;
  trial_end?: string;
  current_period_end: string;
  used_productions?: number;
  scan_count?: number;
  used_storage_gb?: number;
  /** Base plan features plus purchased add-ons (preferred over plan.features) */
  effective_limits?: { [key: string]: any };
}

export interface Plan {
  id: string | number;
  name: string;
  interval: string;
  price: number;
  features: {
    max_establishments: number;
    max_parcels: number;
    max_productions_per_year: number;
    monthly_scan_limit: number;
    storage_limit_gb: number;
    [key: string]: any;
  };
}

// export { Company, Employee, Establishment };
