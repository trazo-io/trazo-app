/**
 * QR URL Parser for Trazo
 * Handles both legacy and secure QR code formats
 */

interface QRParseResult {
  productionId?: string;
  isSecure: boolean;
  isValid: boolean;
  isExpired: boolean;
  error?: string;
  payload?: any;
}

interface SecureQRPayload {
  id: number;
  exp: number;
  iat: number;
  v: string;
}

/**
 * Parse QR code URL and extract production information
 */
export function parseQRUrl(url: string): QRParseResult {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/').filter(part => part.length > 0);
    
    // Find production ID in path
    const productionIndex = pathParts.indexOf('production');
    if (productionIndex === -1 || productionIndex + 1 >= pathParts.length) {
      return {
        isSecure: false,
        isValid: false,
        isExpired: false,
        error: 'Invalid QR code URL format'
      };
    }
    
    const productionId = pathParts[productionIndex + 1];
    
    // Check if this is a secure QR code (has query parameters)
    const payload = urlObj.searchParams.get('p');
    const signature = urlObj.searchParams.get('s');
    
    if (payload && signature) {
      // This is a secure QR code
      try {
        const parsedPayload = parseSecurePayload(payload);
        const currentTime = Math.floor(Date.now() / 1000);
        const isExpired = parsedPayload.exp < currentTime;
        
        return {
          productionId: parsedPayload.id.toString(),
          isSecure: true,
          isValid: true,
          isExpired,
          payload: parsedPayload
        };
      } catch (error) {
        return {
          productionId,
          isSecure: true,
          isValid: false,
          isExpired: false,
          error: 'Invalid secure QR code payload'
        };
      }
    } else {
      // This is a legacy QR code
      return {
        productionId,
        isSecure: false,
        isValid: true,
        isExpired: false
      };
    }
  } catch (error) {
    return {
      isSecure: false,
      isValid: false,
      isExpired: false,
      error: 'Invalid URL format'
    };
  }
}

/**
 * Parse secure QR payload from base64 encoded JSON
 */
function parseSecurePayload(payloadB64: string): SecureQRPayload {
  // Add padding if needed
  const padded = payloadB64 + '='.repeat((4 - payloadB64.length % 4) % 4);
  const decoded = atob(padded);
  return JSON.parse(decoded);
}

/**
 * Verify secure QR code with backend
 */
export async function verifySecureQR(url: string): Promise<{
  valid: boolean;
  productionId?: string;
  error?: string;
}> {
  try {
    const response = await fetch('/api/security/verify-qr/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ url })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const result = await response.json();
    return {
      valid: result.valid,
      productionId: result.production?.id?.toString(),
      error: result.error
    };
  } catch (error) {
    console.error('QR verification failed:', error);
    return {
      valid: false,
      error: 'Unable to verify QR code'
    };
  }
}

/**
 * Extract production ID from current page URL
 * Handles both direct navigation and QR scan scenarios
 */
export function extractProductionIdFromCurrentURL(): QRParseResult {
  const currentUrl = window.location.href;
  return parseQRUrl(currentUrl);
}

/**
 * Handle QR scan result and navigate appropriately
 */
export function handleQRScanResult(
  scannedUrl: string,
  navigate: (path: string) => void,
  onError: (message: string) => void
): void {
  const parseResult = parseQRUrl(scannedUrl);
  
  if (!parseResult.isValid) {
    onError(parseResult.error || 'Invalid QR code');
    return;
  }
  
  if (parseResult.isExpired) {
    onError('QR code has expired. Please scan a fresh code.');
    return;
  }
  
  if (parseResult.isSecure) {
    // For secure QR codes, verify with backend before proceeding
    verifySecureQR(scannedUrl).then(verification => {
      if (verification.valid && verification.productionId) {
        navigate(`/production/${verification.productionId}`);
      } else {
        onError(verification.error || 'Invalid or tampered QR code');
      }
    }).catch(() => {
      onError('Unable to verify QR code. Please try again.');
    });
  } else {
    // For legacy QR codes, navigate directly
    navigate(`/production/${parseResult.productionId}`);
  }
}

/**
 * Check if current page was accessed via QR scan
 * This helps identify QR scans vs direct URL access
 */
export function isQRScanAccess(): boolean {
  // Check for QR-specific query parameters
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.has('p') && urlParams.has('s');
}

/**
 * Get QR access metadata for analytics
 */
export function getQRAccessMetadata(): {
  isQRAccess: boolean;
  isSecureQR: boolean;
  source: 'qr_scan' | 'direct_link' | 'unknown';
} {
  const parseResult = extractProductionIdFromCurrentURL();
  
  return {
    isQRAccess: parseResult.isValid && (parseResult.isSecure || isQRScanAccess()),
    isSecureQR: parseResult.isSecure,
    source: parseResult.isSecure ? 'qr_scan' : 
           isQRScanAccess() ? 'qr_scan' : 
           'direct_link'
  };
}