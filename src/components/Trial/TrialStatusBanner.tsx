import React from 'react';
import {
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Box,
  Button,
  Flex,
  Text,
  useColorModeValue,
  Progress,
  HStack,
} from '@chakra-ui/react';
import { useSelector } from 'react-redux';
import { RootState } from 'store';
import { useNavigate } from 'react-router-dom';
import { Company } from 'types/company';
import { useOnboarding } from 'hooks/useOnboarding';

interface TrialStatusBannerProps {
  showOnlyWhenTrialExpiringSoon?: boolean;
}

const TrialStatusBanner: React.FC<TrialStatusBannerProps> = ({ 
  showOnlyWhenTrialExpiringSoon = false 
}) => {
  const navigate = useNavigate();
  const { openOnboarding, resetOnboarding } = useOnboarding();
  
  // Get company data from Redux
  const company = useSelector((state: RootState) => {
    const auth = state.auth as any;
    if (auth && auth.companies && auth.companies.length > 0) {
      const selectedId = auth.selectedCompany;
      return auth.companies.find((company: Company) => company.id === selectedId) || null;
    }
    
    const companyState = state.companySlice as any;
    if (companyState && companyState.currentCompany) {
      return companyState.currentCompany;
    }
    
    return null;
  });

  // Color mode values
  const alertBg = useColorModeValue('orange.50', 'orange.900');
  const alertBorder = useColorModeValue('orange.200', 'orange.700');
  const progressBg = useColorModeValue('orange.100', 'orange.800');
  const progressColor = useColorModeValue('orange.400', 'orange.500');

  if (!company) return null;

  // Check if company has active subscription
  const hasActiveSubscription = 
    company.has_subscription === true ||
    (company.subscription &&
      (company.subscription.id || company.subscription.status === 'active')) ||
    (company.subscription_plan && company.subscription_plan.id);

  // Don't show banner if user has active subscription
  if (hasActiveSubscription) return null;

  // Calculate trial status
  const companyCreatedDate = new Date(company.created_at || company.date_joined);
  const trialEndDate = new Date(companyCreatedDate.getTime() + (14 * 24 * 60 * 60 * 1000)); // 14 days
  const now = new Date();
  
  const totalTrialDays = 14;
  const daysElapsed = Math.floor((now.getTime() - companyCreatedDate.getTime()) / (24 * 60 * 60 * 1000));
  const daysRemaining = Math.max(0, totalTrialDays - daysElapsed);
  const trialProgress = Math.min(100, (daysElapsed / totalTrialDays) * 100);
  
  const isTrialExpired = daysRemaining === 0;
  const isTrialExpiringSoon = daysRemaining <= 3; // Show when 3 days or less remaining

  // If only showing when expiring soon and trial is not expiring soon, don't show
  if (showOnlyWhenTrialExpiringSoon && !isTrialExpiringSoon && !isTrialExpired) {
    return null;
  }

  const handleUpgradeClick = () => {
    navigate('/admin/dashboard/pricing');
  };

  if (isTrialExpired) {
    return (
      <Alert status="error" bg={alertBg} border="1px" borderColor={alertBorder} borderRadius="xl" mb={4}>
        <AlertIcon />
        <Box flex="1">
          <AlertTitle fontSize="sm" fontWeight="600">
            Trial Expired
          </AlertTitle>
          <AlertDescription fontSize="sm">
            Your 14-day trial has ended. Upgrade to continue accessing all Trazo features.
          </AlertDescription>
        </Box>
        <Button size="sm" colorScheme="red" onClick={handleUpgradeClick}>
          Upgrade Now
        </Button>
      </Alert>
    );
  }

  return (
    <Alert status="warning" bg={alertBg} border="1px" borderColor={alertBorder} borderRadius="xl" mb={4}>
      <AlertIcon />
      <Box flex="1">
        <Flex justify="space-between" align="center" mb={2}>
          <AlertTitle fontSize="sm" fontWeight="600">
            Free Trial Active
          </AlertTitle>
          <Text fontSize="xs" fontWeight="500" color="orange.600">
            {daysRemaining} day{daysRemaining !== 1 ? 's' : ''} remaining
          </Text>
        </Flex>
        
        <AlertDescription fontSize="sm" mb={3}>
          {isTrialExpiringSoon 
            ? `Your trial expires in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}. Upgrade to keep your carbon tracking data.`
            : `You're exploring Trazo with full access to all features.`
          }
        </AlertDescription>
        
        <Progress 
          value={trialProgress} 
          size="sm" 
          colorScheme="orange" 
          bg={progressBg}
          borderRadius="md"
          mb={3}
        />
        
        <HStack spacing={2}>
          <Button size="sm" colorScheme="green" onClick={handleUpgradeClick}>
            {isTrialExpiringSoon ? 'Upgrade Now' : 'View Pricing'}
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            colorScheme="blue" 
            onClick={() => {
              resetOnboarding();
              openOnboarding();
            }}
          >
            Setup Guide
          </Button>
          <Text fontSize="xs" color="gray.500" alignSelf="center">
            No credit card required for trial
          </Text>
        </HStack>
      </Box>
    </Alert>
  );
};

export default TrialStatusBanner;