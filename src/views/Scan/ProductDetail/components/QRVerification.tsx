/**
 * QR Code Verification Component
 * Handles secure QR code verification and URL parsing
 * Split from ProductDetail.tsx for better performance and maintainability
 */

import React, { useEffect, useState } from 'react';
import { Alert, AlertIcon, AlertTitle, AlertDescription, Progress, VStack } from '@chakra-ui/react';
import { useParams } from 'react-router-dom';
import {
  extractProductionIdFromCurrentURL,
  verifySecureQR,
  getQRAccessMetadata
} from '../../../../utils/qrParser';

interface QRVerificationProps {
  onVerificationComplete: (productionId: string | null, error: string | null) => void;
}

export const QRVerification: React.FC<QRVerificationProps> = ({ onVerificationComplete }) => {
  const { productionId: urlProductionId } = useParams();
  const [isVerifyingQR, setIsVerifyingQR] = useState(false);
  const [qrVerificationError, setQrVerificationError] = useState<string | null>(null);

  // Get QR access metadata for analytics
  const qrMetadata = getQRAccessMetadata();

  useEffect(() => {
    const verifyQRAccess = async () => {
      // Try to extract production ID from current URL (handles secure QR format)
      const parseResult = extractProductionIdFromCurrentURL();

      if (parseResult.isSecure) {
        // This is a secure QR code, verify it
        setIsVerifyingQR(true);

        try {
          const verification = await verifySecureQR(window.location.href);

          if (verification.valid && verification.productionId) {
            console.log('✅ Secure QR code verified:', verification.productionId);
            onVerificationComplete(verification.productionId, null);
          } else {
            const error = verification.error || 'Invalid QR code';
            setQrVerificationError(error);
            console.error('❌ QR verification failed:', verification.error);
            onVerificationComplete(null, error);
          }
        } catch (error) {
          const errorMessage = 'Unable to verify QR code';
          setQrVerificationError(errorMessage);
          console.error('❌ QR verification error:', error);
          onVerificationComplete(null, errorMessage);
        } finally {
          setIsVerifyingQR(false);
        }
      } else if (parseResult.isValid) {
        // This is a legacy QR code or direct URL access
        const verifiedId = parseResult.productionId || urlProductionId;
        console.log('✅ Legacy QR or direct access:', verifiedId);
        onVerificationComplete(verifiedId || null, null);
      } else {
        // Invalid URL format
        const error = parseResult.error || 'Invalid URL format';
        setQrVerificationError(error);
        console.error('❌ Invalid URL format:', parseResult.error);
        onVerificationComplete(null, error);
      }
    };

    verifyQRAccess();
  }, [urlProductionId, onVerificationComplete]);

  // Show verification in progress - TRUST IN 3 SECONDS framework
  if (isVerifyingQR) {
    return (
      <VStack spacing={4} py={6}>
        <Progress isIndeterminate colorScheme="green" width="100%" size="lg" />
        <Alert status="info" borderRadius="lg" bg="green.50" borderColor="green.200">
          <AlertIcon color="green.500" />
          <VStack align="start" spacing={1}>
            <AlertTitle color="green.700" fontSize="md">
              🔒 Verifying Blockchain Security
            </AlertTitle>
            <AlertDescription color="green.600" fontSize="sm">
              USDA-verified carbon data • Polygon network authentication • Real farm verification
            </AlertDescription>
          </VStack>
        </Alert>
      </VStack>
    );
  }

  // Show verification error
  if (qrVerificationError) {
    return (
      <Alert status="error" borderRadius="md" mb={4}>
        <AlertIcon />
        <AlertTitle>QR Verification Failed</AlertTitle>
        <AlertDescription>{qrVerificationError}</AlertDescription>
      </Alert>
    );
  }

  // Verification complete - no UI needed
  return null;
};

export default QRVerification;