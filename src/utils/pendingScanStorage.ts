/**
 * Manages pending anonymous scan claim tokens in localStorage.
 * After a user scans a QR code anonymously and then signs in,
 * these tokens are sent to the backend to claim the scans.
 * Tokens are opaque (not sequential IDs) to prevent IDOR.
 */

const STORAGE_KEY = 'trazo_pending_scan_tokens';
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

interface PendingScan {
  token: string;
  timestamp: number;
}

export const addPendingScanToken = (claimToken: string): void => {
  const scans = getPendingScans();
  if (!scans.some((s) => s.token === claimToken)) {
    scans.push({ token: claimToken, timestamp: Date.now() });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scans));
  }
};

export const getPendingScanTokens = (): string[] => {
  return getPendingScans().map((s) => s.token);
};

export const clearPendingScans = (): void => {
  localStorage.removeItem(STORAGE_KEY);
};

function getPendingScans(): PendingScan[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];

    const scans: PendingScan[] = JSON.parse(stored);
    const now = Date.now();

    return scans.filter((s) => now - s.timestamp < MAX_AGE_MS);
  } catch {
    return [];
  }
}
