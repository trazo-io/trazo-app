/**
 * Product Detail Component - Refactored for Performance
 * 
 * This is a refactored version of the original 1,537-line ProductDetail component
 * Split into smaller, more manageable components for better:
 * - Mobile performance (faster loading, smaller bundles)
 * - Code maintainability
 * - Component reusability
 * - Developer experience
 * 
 * Original issues addressed:
 * - Massive component size (1,537 lines → ~200 lines)
 * - Mobile performance impact
 * - Code readability and maintainability
 */

import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Flex, 
  Alert, 
  AlertIcon, 
  AlertTitle, 
  AlertDescription,
  Box 
} from '@chakra-ui/react';
import { useParams } from 'react-router-dom';

// Hooks and utilities
import { useGetProductionCompleteQuery, useCreateScanMutation } from '../../../store/api/historyApi';
import { usePointsStore } from '../../../store/usePointsStore';

// Refactored components
import { QRVerification } from './components/QRVerification';
import { AuthenticationChecker } from './components/AuthenticationChecker';
import { ProductHeader } from './components/ProductHeader';
import { ProductMainCard } from './components/ProductMainCard';

// Loading component
import { ProgressiveQRLoader } from '../../../components/Loading/ProgressiveQRLoader';

interface AuthenticationState {
  isAuthenticated: boolean;
  currentUser: any;
  hasAuthCookies: boolean;
  finalIsAuthenticated: boolean;
  finalCurrentUser: any;
}

function ProductDetailRefactored() {
  const { productionId: urlProductionId } = useParams();
  const pointsStore = usePointsStore();

  // QR Verification state
  const [verifiedProductionId, setVerifiedProductionId] = useState<string | null>(null);
  const [qrVerificationError, setQrVerificationError] = useState<string | null>(null);

  // Authentication state
  const [authState, setAuthState] = useState<AuthenticationState | null>(null);

  // Scan tracking
  const [scanCreated, setScanCreated] = useState(false);

  // API hooks
  const productionId = verifiedProductionId;
  const {
    data: completeData,
    error: completeError,
    isLoading: isCompleteLoading
  } = useGetProductionCompleteQuery(productionId, {
    skip: !productionId
  });

  const [createScan] = useCreateScanMutation();

  // Handle QR verification completion
  const handleQRVerification = (productionId: string | null, error: string | null) => {
    setVerifiedProductionId(productionId);
    setQrVerificationError(error);
  };

  // Handle authentication state changes
  const handleAuthStateChange = (newAuthState: AuthenticationState) => {
    setAuthState(newAuthState);
  };

  // Create scan when page loads
  useEffect(() => {
    if (productionId && !scanCreated && !isCompleteLoading) {
      console.log('🔍 Creating scan for production:', productionId);

      createScan({
        production_id: productionId,
        city: null, // Could be enhanced with geolocation
        country: null
      })
        .unwrap()
        .then((result) => {
          console.log('✅ Scan created successfully:', result);
          setScanCreated(true);
        })
        .catch((error) => {
          console.error('❌ Failed to create scan:', error);
          // Still mark as attempted to avoid retry loops
          setScanCreated(true);
        });
    }
  }, [productionId, scanCreated, isCompleteLoading, createScan]);

  // Handle sharing functionality
  const handleShare = async () => {
    try {
      await navigator.share({
        title: `${completeData?.farmer?.name || 'Product'}'s Sustainable Product`,
        text: `${Math.round((completeData?.carbonScore || 0) * 10) / 10}/100 carbon score! #Trazo`,
        url: window.location.href
      });
      pointsStore.addPoints(3);
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  // Debug logging
  console.log('🔍 ProductDetailRefactored component loaded with productionId:', productionId);

  // QR Verification error state
  if (qrVerificationError) {
    return (
      <Container maxW="container.lg" py={8}>
        <Alert status="error" borderRadius="md">
          <AlertIcon />
          <Box>
            <AlertTitle>QR Code Verification Failed</AlertTitle>
            <AlertDescription>
              {qrVerificationError}. Please try scanning the QR code again or contact support if the
              problem persists.
            </AlertDescription>
          </Box>
        </Alert>
      </Container>
    );
  }

  // Loading state
  if (isCompleteLoading || !productionId) {
    return <ProgressiveQRLoader loadingStage="scanning" onStageComplete={() => {}} />;
  }

  // Error state
  if (completeError) {
    return (
      <Container maxW="container.lg" py={8}>
        <Alert status="error" borderRadius="md">
          <AlertIcon />
          <Box>
            <AlertTitle>Unable to load product information</AlertTitle>
            <AlertDescription>
              Please check your connection and try again, or scan a different product.
            </AlertDescription>
          </Box>
        </Alert>
      </Container>
    );
  }

  // No data state
  if (!completeData) {
    return (
      <Container maxW="container.lg" py={8}>
        <Alert status="info" borderRadius="md">
          <AlertIcon />
          <Box>
            <AlertTitle>No product data available</AlertTitle>
            <AlertDescription>
              Please scan a valid QR code to view product information.
            </AlertDescription>
          </Box>
        </Alert>
      </Container>
    );
  }

  return (
    <Flex direction="column" alignSelf="center" justifySelf="center" overflow="hidden" w="100%">
      {/* QR Verification Component */}
      <QRVerification onVerificationComplete={handleQRVerification} />

      {/* Authentication Checker Component */}
      <AuthenticationChecker onAuthStateChange={handleAuthStateChange} />

      {/* Product Header Component */}
      <ProductHeader completeData={completeData} />

      {/* Main Product Card Component */}
      <ProductMainCard 
        completeData={completeData}
        onAuthRequired={() => {
          // Handle authentication requirements
          console.log('Authentication required for additional features');
        }}
      />

      {/* Additional sections can be added here as separate components */}
      {/* Timeline Component, Details Component, Actions Component, etc. */}
    </Flex>
  );
}

export default ProductDetailRefactored;