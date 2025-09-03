/**
 * Tests for subdomain detection utility
 */

import { getSubdomainType, isProducerSubdomain, isConsumerSubdomain } from './subdomain';

// Mock environment variable
const originalEnv = import.meta.env;
beforeAll(() => {
  import.meta.env = { ...originalEnv, VITE_APP_BASE_DOMAIN: 'trazo.io' };
});

afterAll(() => {
  import.meta.env = originalEnv;
});

describe('getSubdomainType', () => {
  test('detects producer subdomains correctly', () => {
    expect(getSubdomainType('app.trazo.io')).toBe('producer');
    expect(getSubdomainType('app-staging.trazo.io')).toBe('producer');
    expect(getSubdomainType('app-dev.trazo.io')).toBe('producer');
  });

  test('detects consumer subdomains correctly', () => {
    expect(getSubdomainType('consumer.trazo.io')).toBe('consumer');
    expect(getSubdomainType('consumer-staging.trazo.io')).toBe('consumer');
    expect(getSubdomainType('consumer-dev.trazo.io')).toBe('consumer');
  });

  test('returns empty string for unknown subdomains', () => {
    expect(getSubdomainType('unknown.trazo.io')).toBe('');
    expect(getSubdomainType('api.trazo.io')).toBe('');
    expect(getSubdomainType('www.trazo.io')).toBe('');
  });

  test('handles localhost development correctly', () => {
    const originalEnv = import.meta.env.VITE_APP_BASE_DOMAIN;
    import.meta.env.VITE_APP_BASE_DOMAIN = 'localhost';
    
    expect(getSubdomainType('app.localhost:3000')).toBe('producer');
    expect(getSubdomainType('consumer.localhost:3000')).toBe('consumer');
    
    import.meta.env.VITE_APP_BASE_DOMAIN = originalEnv;
  });
});

describe('isProducerSubdomain', () => {
  test('correctly identifies producer subdomains', () => {
    expect(isProducerSubdomain('app.trazo.io')).toBe(true);
    expect(isProducerSubdomain('app-staging.trazo.io')).toBe(true);
    expect(isProducerSubdomain('consumer.trazo.io')).toBe(false);
    expect(isProducerSubdomain('unknown.trazo.io')).toBe(false);
  });
});

describe('isConsumerSubdomain', () => {
  test('correctly identifies consumer subdomains', () => {
    expect(isConsumerSubdomain('consumer.trazo.io')).toBe(true);
    expect(isConsumerSubdomain('consumer-staging.trazo.io')).toBe(true);
    expect(isConsumerSubdomain('app.trazo.io')).toBe(false);
    expect(isConsumerSubdomain('unknown.trazo.io')).toBe(false);
  });
});