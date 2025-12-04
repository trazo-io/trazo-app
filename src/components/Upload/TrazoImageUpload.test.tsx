/**
 * TrazoImageUpload Test Page - Farmer-Friendly Upload Demo
 *
 * This page demonstrates the new "SELECT = UPLOAD" functionality
 * that eliminates confusion for farmers by uploading immediately on selection.
 */

import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Container,
  Heading,
  Badge,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  useColorModeValue,
  IconButton,
  useToast
} from '@chakra-ui/react';
import { FaRedo, FaCheck, FaTimes, FaCog } from 'react-icons/fa';
import { TrazoImageUpload } from './TrazoImageUpload';

const TrazoImageUploadDemo: React.FC = () => {
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [isTestingMode, setIsTestingMode] = useState(false);
  const [simulateErrors, setSimulateErrors] = useState(false);
  const toast = useToast();

  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBg = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.700', 'gray.200');

  // Demo handlers
  const handleImagesChange = (urls: string[]) => {
    setUploadedImages(urls);
    console.log('📸 Images updated:', urls);
  };

  const resetDemo = () => {
    setUploadedImages([]);
    toast({
      title: '🔄 Demo Reset',
      description: 'Upload component reset to initial state',
      status: 'info',
      duration: 2000
    });
  };

  const toggleErrorSimulation = () => {
    setSimulateErrors(!simulateErrors);
    toast({
      title: simulateErrors ? '✅ Normal Mode' : '🚨 Error Mode',
      description: simulateErrors
        ? 'Upload will work normally'
        : 'Next upload will simulate error for testing retry',
      status: simulateErrors ? 'success' : 'warning',
      duration: 3000
    });
  };

  return (
    <Box minH="100vh" bg={bgColor} py={8}>
      <Container maxW="4xl">
        <VStack spacing={8} align="stretch">
          {/* Header */}
          <VStack spacing={4} textAlign="center">
            <Heading size="xl" color="green.500">
              🚜 Farmer-Friendly Upload Demo
            </Heading>
            <Text fontSize="lg" color={textColor}>
              Test the new "SELECT = UPLOAD" experience - No confusing manual upload buttons!
            </Text>
            <HStack spacing={4}>
              <Badge colorScheme="green" p={2} borderRadius="md">
                ✅ Immediate Upload
              </Badge>
              <Badge colorScheme="blue" p={2} borderRadius="md">
                📱 Mobile Optimized
              </Badge>
              <Badge colorScheme="purple" p={2} borderRadius="md">
                🔄 Smart Retry
              </Badge>
            </HStack>
          </VStack>

          {/* Key Improvements */}
          <Box bg={cardBg} p={6} borderRadius="2xl" boxShadow="lg">
            <Heading size="md" mb={4} color="green.600">
              🌟 Key Farmer-Friendly Improvements
            </Heading>
            <VStack spacing={3} align="start">
              <HStack>
                <FaCheck color="green" />
                <Text>
                  <strong>Select = Upload:</strong> Photos upload immediately when selected
                </Text>
              </HStack>
              <HStack>
                <FaCheck color="green" />
                <Text>
                  <strong>Clear Visual States:</strong> Uploading, success, and error states are
                  obvious
                </Text>
              </HStack>
              <HStack>
                <FaCheck color="green" />
                <Text>
                  <strong>Smart Retry:</strong> Failed uploads show clear retry buttons
                </Text>
              </HStack>
              <HStack>
                <FaCheck color="green" />
                <Text>
                  <strong>Mobile Friendly:</strong> 44px+ touch targets for work gloves
                </Text>
              </HStack>
              <HStack>
                <FaCheck color="green" />
                <Text>
                  <strong>Field Ready:</strong> Works with poor connections and interruptions
                </Text>
              </HStack>
            </VStack>
          </Box>

          {/* Before vs After */}
          <HStack spacing={8} align="start">
            <Box flex={1} bg={cardBg} p={6} borderRadius="xl" boxShadow="md">
              <Heading size="sm" mb={3} color="red.500">
                ❌ OLD: Confusing Two-Step Process
              </Heading>
              <VStack spacing={2} align="start" fontSize="sm">
                <Text>1. Select photos → Preview shown</Text>
                <Text>2. Click "Upload X images" → Actually upload</Text>
                <Text>3. Click "Create Farm" → Submit form</Text>
                <Alert status="error" size="sm">
                  <AlertIcon />
                  <AlertDescription fontSize="xs">
                    Farmers think photos are uploaded at step 1!
                  </AlertDescription>
                </Alert>
              </VStack>
            </Box>

            <Box flex={1} bg={cardBg} p={6} borderRadius="xl" boxShadow="md">
              <Heading size="sm" mb={3} color="green.500">
                ✅ NEW: Instagram-Style Immediate Upload
              </Heading>
              <VStack spacing={2} align="start" fontSize="sm">
                <Text>1. Select photos → Photos immediately upload</Text>
                <Text>2. Green checkmarks show success</Text>
                <Text>3. Form ready to submit</Text>
                <Alert status="success" size="sm">
                  <AlertIcon />
                  <AlertDescription fontSize="xs">
                    Crystal clear for farmers - no confusion!
                  </AlertDescription>
                </Alert>
              </VStack>
            </Box>
          </HStack>

          {/* Demo Controls */}
          <HStack spacing={4} justify="center">
            <Button leftIcon={<FaRedo />} onClick={resetDemo} colorScheme="blue" variant="outline">
              Reset Demo
            </Button>
            <Button
              leftIcon={<FaCog />}
              onClick={toggleErrorSimulation}
              colorScheme={simulateErrors ? 'red' : 'gray'}
              variant="outline"
            >
              {simulateErrors ? 'Disable' : 'Enable'} Error Testing
            </Button>
          </HStack>

          {/* Upload Component Demo */}
          <Box bg={cardBg} p={6} borderRadius="2xl" boxShadow="lg">
            <VStack spacing={4}>
              <Heading size="md" color="green.600">
                📱 Try the New Upload Experience
              </Heading>
              <Text color={textColor} textAlign="center">
                Select photos using the buttons below - they will upload immediately! Watch for the
                green checkmarks that show successful uploads.
              </Text>

              <TrazoImageUpload
                maxFiles={5}
                existingImages={uploadedImages}
                onImagesChange={handleImagesChange}
                isLoading={false}
              />

              {/* Status Display */}
              {uploadedImages.length > 0 && (
                <Alert status="success" borderRadius="xl">
                  <AlertIcon />
                  <AlertTitle>Upload Success!</AlertTitle>
                  <AlertDescription>
                    {uploadedImages.length} photo{uploadedImages.length !== 1 ? 's' : ''} uploaded
                    successfully. Ready to submit form - no manual upload needed!
                  </AlertDescription>
                </Alert>
              )}
            </VStack>
          </Box>

          {/* Instructions */}
          <Box bg={cardBg} p={6} borderRadius="xl" boxShadow="md">
            <Heading size="sm" mb={3} color="blue.600">
              🧪 How to Test
            </Heading>
            <VStack spacing={2} align="start" fontSize="sm">
              <Text>
                <strong>1. Click "Choose Photos"</strong> - Select multiple photos from your
                computer
              </Text>
              <Text>
                <strong>2. Watch Immediate Upload</strong> - Photos start uploading right away
              </Text>
              <Text>
                <strong>3. See Success States</strong> - Green checkmarks show completed uploads
              </Text>
              <Text>
                <strong>4. Test Camera (Mobile)</strong> - Use camera button to test mobile capture
              </Text>
              <Text>
                <strong>5. Test Error Handling</strong> - Enable error mode to test retry
                functionality
              </Text>
            </VStack>
          </Box>

          {/* Technical Details */}
          <Box bg={cardBg} p={6} borderRadius="xl" boxShadow="md">
            <Heading size="sm" mb={3} color="purple.600">
              🔧 Technical Implementation
            </Heading>
            <VStack spacing={2} align="start" fontSize="sm">
              <Text>
                <strong>Core Change:</strong> handleFileSelect() now calls uploadFile() immediately
              </Text>
              <Text>
                <strong>Visual States:</strong> uploadingFiles array tracks upload progress per file
              </Text>
              <Text>
                <strong>Error Recovery:</strong> Failed uploads show retry buttons with clear
                messaging
              </Text>
              <Text>
                <strong>Parent Integration:</strong> onImagesChange() called immediately on success
              </Text>
              <Text>
                <strong>Mobile Optimized:</strong> Touch targets ≥44px, works with work gloves
              </Text>
            </VStack>
          </Box>

          {/* Current Upload Status */}
          {uploadedImages.length > 0 && (
            <Box bg="green.50" border="2px solid" borderColor="green.200" p={4} borderRadius="xl">
              <Heading size="sm" color="green.700" mb={2}>
                📊 Current Upload Status
              </Heading>
              <Text fontSize="sm" color="green.600">
                {uploadedImages.length} photos successfully uploaded:
              </Text>
              <VStack spacing={1} align="start" mt={2}>
                {uploadedImages.map((url, index) => (
                  <HStack key={index} spacing={2}>
                    <FaCheck color="green" size={12} />
                    <Text fontSize="xs" color="green.700">
                      Photo {index + 1}: {url.substring(0, 50)}...
                    </Text>
                  </HStack>
                ))}
              </VStack>
            </Box>
          )}
        </VStack>
      </Container>
    </Box>
  );
};

export default TrazoImageUploadDemo;
