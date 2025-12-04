/**
 * Centralized subdomain detection utility
 * Single source of truth for environment-specific subdomain configuration
 */

import React from 'react';

export interface SubdomainConfig {
  producer: string[];
  consumer: string[];
}

// Environment-specific subdomain configuration
const SUBDOMAIN_CONFIG: SubdomainConfig = {
  producer: ['app', 'app-staging', 'app-dev'],
  consumer: ['consumer', 'consumer-staging', 'consumer-dev']
};

export type SubdomainType = 'producer' | 'consumer' | '';

/**
 * Detects subdomain type from the current host
 * @param host - window.location.host (optional, defaults to current host)
 * @returns 'producer', 'consumer', or empty string
 */
export const getSubdomainType = (host?: string): SubdomainType => {
  const currentHost = host || window.location.host;

  // Extract subdomain based on base domain configuration
  const baseDomain = import.meta.env.VITE_APP_BASE_DOMAIN;
  const hostParts = currentHost.split('.').slice(0, currentHost.includes(baseDomain) ? -1 : -2);

  if (hostParts.length === 0) {
    return '';
  }

  const subdomain = hostParts[0];

  // Check against configuration
  if (SUBDOMAIN_CONFIG.producer.includes(subdomain)) {
    return 'producer';
  }

  if (SUBDOMAIN_CONFIG.consumer.includes(subdomain)) {
    return 'consumer';
  }

  return '';
};

/**
 * React hook for subdomain detection with automatic updates
 * @returns current subdomain type
 */
export const useSubdomain = (): SubdomainType => {
  const [subdomainType, setSubdomainType] = React.useState<SubdomainType>('');

  React.useEffect(() => {
    setSubdomainType(getSubdomainType());
  }, []);

  return subdomainType;
};

// For backward compatibility - simple boolean check for producer
export const isProducerSubdomain = (host?: string): boolean => {
  return getSubdomainType(host) === 'producer';
};

// For backward compatibility - simple boolean check for consumer
export const isConsumerSubdomain = (host?: string): boolean => {
  return getSubdomainType(host) === 'consumer';
};
