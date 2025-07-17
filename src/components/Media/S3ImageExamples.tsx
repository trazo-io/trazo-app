import React from 'react';
import { Box, Grid, Text, VStack, Badge } from '@chakra-ui/react';
import { S3Image } from './S3Image';
import { useS3Image } from 'hooks/useS3Image';

/**
 * Example component showing different S3Image usage patterns
 * This file demonstrates best practices and can be removed after implementation
 */

// Example 1: Basic S3Image usage
export const BasicS3ImageExample: React.FC<{ imageUrl: string }> = ({ imageUrl }) => (
  <S3Image
    src={imageUrl}
    alt="Basic example"
    boxSize="200px"
    borderRadius="lg"
    fallbackSrc="/images/placeholder.jpg"
  />
);

// Example 2: Establishment image card (like your use case)
export const EstablishmentImageCard: React.FC<{ establishment: any }> = ({ establishment }) => (
  <Box bg="white" p={4} borderRadius="lg" boxShadow="md">
    <S3Image
      src={establishment.image}
      alt={establishment.name}
      boxSize="300px"
      borderRadius="md"
      objectFit="cover"
      showErrorMessage={true}
      onLoad={() => console.log('Establishment image loaded')}
      onError={() => console.log('Establishment image failed')}
    />
    <Text mt={2} fontWeight="semibold">{establishment.name}</Text>
    <Text fontSize="sm" color="gray.600">{establishment.location}</Text>
  </Box>
);

// Example 3: Using the hook directly for custom components
export const CustomImageWithHook: React.FC<{ imageUrl: string }> = ({ imageUrl }) => {
  const { displayUrl, isLoading, error, needsPresigning } = useS3Image(imageUrl);

  return (
    <VStack spacing={3}>
      <Box position="relative">
        <img 
          src={displayUrl} 
          alt="Custom component" 
          style={{ width: '200px', height: '200px', objectFit: 'cover' }}
        />
        {needsPresigning && (
          <Badge colorScheme="blue" position="absolute" top={2} right={2}>
            S3 Presigned
          </Badge>
        )}
      </Box>
      <Text fontSize="sm" color="gray.600">
        Status: {isLoading ? 'Loading...' : error ? 'Error' : 'Loaded'}
      </Text>
    </VStack>
  );
};

// Example 4: Image gallery with lazy loading
export const ImageGallery: React.FC<{ images: Array<{ url: string; title: string }> }> = ({ images }) => (
  <Grid templateColumns="repeat(auto-fit, minmax(200px, 1fr))" gap={4}>
    {images.map((image, index) => (
      <S3Image
        key={index}
        src={image.url}
        alt={image.title}
        boxSize="200px"
        borderRadius="md"
        lazy={true}
        enableFadeIn={true}
      />
    ))}
  </Grid>
);

// Example 5: Profile avatar with error handling
export const ProfileAvatar: React.FC<{ user: any }> = ({ user }) => (
  <S3Image
    src={user.image}
    alt={`${user.first_name} ${user.last_name}`}
    boxSize="60px"
    borderRadius="full"
    fallbackSrc="/images/default-avatar.jpg"
    lazy={false} // Don't lazy load avatars
  />
);

// Example 6: Hero image with custom placeholder
export const HeroImage: React.FC<{ imageUrl: string }> = ({ imageUrl }) => (
  <S3Image
    src={imageUrl}
    alt="Hero image"
    width="100%"
    height="400px"
    objectFit="cover"
    placeholder={
      <Box 
        width="100%" 
        height="400px" 
        bg="gray.100" 
        display="flex" 
        alignItems="center" 
        justifyContent="center"
      >
        <Text color="gray.500">Loading hero image...</Text>
      </Box>
    }
  />
);

export default {
  BasicS3ImageExample,
  EstablishmentImageCard,
  CustomImageWithHook,
  ImageGallery,
  ProfileAvatar,
  HeroImage
};