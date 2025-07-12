import React, { useEffect } from 'react';
import { useToast } from '@chakra-ui/react';

const RateLimitNotification: React.FC = () => {
  const toast = useToast();

  useEffect(() => {
    const handleRateLimit = (event: CustomEvent) => {
      const { message, retryAfter } = event.detail;
      
      toast({
        title: 'Rate Limit Exceeded',
        description: message,
        status: 'warning',
        duration: retryAfter * 1000, // Show for the duration of the rate limit
        isClosable: true,
        position: 'top',
      });
    };

    // Listen for rate limit events
    window.addEventListener('rate-limit-error', handleRateLimit as EventListener);

    // Cleanup
    return () => {
      window.removeEventListener('rate-limit-error', handleRateLimit as EventListener);
    };
  }, [toast]);

  return null; // This component doesn't render anything
};

export default RateLimitNotification;