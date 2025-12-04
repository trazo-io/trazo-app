import React from 'react';
import { Box, Button, Text, VStack, HStack, Code, Badge } from '@chakra-ui/react';
import { useBatchS3Images } from 'hooks/useBatchS3Images';
import { S3Image } from 'components/Design';

const testUrls = [
  'https://staging-trazo-media-013640213707.s3.amazonaws.com/test1.jpg',
  'https://staging-trazo-media-013640213707.s3.amazonaws.com/test2.jpg',
  'https://staging-trazo-media-013640213707.s3.amazonaws.com/test3.jpg'
];

export const BatchTestComponent: React.FC = () => {
  const { presignedUrls, isLoading, error, metrics, refetch } = useBatchS3Images({
    s3Urls: testUrls,
    enabled: true
  });

  const debugInfo = typeof window !== 'undefined' ? (window as any).__TRAZO_BATCH_DEBUG : null;

  return (
    <Box p={4} border="2px solid" borderColor="blue.200" borderRadius="md" bg="blue.50">
      <VStack spacing={4} align="stretch">
        <Text fontSize="lg" fontWeight="bold" color="blue.800">
          🧪 Batch S3 Images Test Component
        </Text>

        <HStack>
          <Badge colorScheme={isLoading ? 'yellow' : 'green'}>
            {isLoading ? 'Loading' : 'Ready'}
          </Badge>
          <Badge colorScheme={error ? 'red' : 'green'}>{error ? 'Error' : 'No Error'}</Badge>
          <Badge colorScheme={Object.keys(presignedUrls).length > 0 ? 'green' : 'gray'}>
            URLs: {Object.keys(presignedUrls).length}
          </Badge>
        </HStack>

        <Box>
          <Text fontWeight="semibold" mb={2}>
            Test URLs:
          </Text>
          {testUrls.map((url, index) => (
            <Code key={index} display="block" mb={1} fontSize="xs">
              {url}
            </Code>
          ))}
        </Box>

        <Box>
          <Text fontWeight="semibold" mb={2}>
            Presigned URLs Result:
          </Text>
          <Code display="block" p={2} fontSize="xs" whiteSpace="pre-wrap">
            {JSON.stringify(presignedUrls, null, 2)}
          </Code>
        </Box>

        {metrics && (
          <Box>
            <Text fontWeight="semibold" mb={2}>
              Performance Metrics:
            </Text>
            <Code display="block" p={2} fontSize="xs">
              Processing time: {metrics.processing_time_ms}ms | Batch size: {metrics.batch_size} |
              Success: {metrics.success_count}
            </Code>
          </Box>
        )}

        {debugInfo && (
          <Box>
            <Text fontWeight="semibold" mb={2}>
              Debug Info:
            </Text>
            <Code display="block" p={2} fontSize="xs" whiteSpace="pre-wrap">
              {JSON.stringify(debugInfo, null, 2)}
            </Code>
          </Box>
        )}

        {error && (
          <Box>
            <Text fontWeight="semibold" mb={2} color="red.600">
              Error:
            </Text>
            <Code display="block" p={2} fontSize="xs" color="red.600">
              {JSON.stringify(error, null, 2)}
            </Code>
          </Box>
        )}

        <HStack>
          <Button size="sm" onClick={refetch} colorScheme="blue">
            Refetch Batch
          </Button>
          <Button
            size="sm"
            onClick={() => console.log('Debug Info:', debugInfo)}
            colorScheme="green"
          >
            Log Debug Info
          </Button>
        </HStack>

        <Box>
          <Text fontWeight="semibold" mb={2}>
            Test Images (with batch URLs):
          </Text>
          <HStack spacing={2}>
            {testUrls.slice(0, 2).map((url, index) => (
              <S3Image
                key={index}
                src={url}
                alt={`Test image ${index + 1}`}
                presignedUrl={presignedUrls[url]}
                boxSize="100px"
                fallbackSrc="/images/placeholder.jpg"
              />
            ))}
          </HStack>
        </Box>
      </VStack>
    </Box>
  );
};

export default BatchTestComponent;
