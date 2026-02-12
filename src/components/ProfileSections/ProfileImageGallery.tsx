import React from 'react';
import { Box, VStack, Text, Center } from '@chakra-ui/react';
import { StandardImageGallery } from 'components/ImageGallery';
import { FaImage } from 'react-icons/fa';

interface ProfileImageGalleryProps {
  images?: Array<{ url: string; caption?: string; id?: string }>;
  title?: string;
  emptyMessage?: string;
  maxHeight?: string | number;
  onImageClick?: (url: string) => void;
}

const ProfileImageGallery: React.FC<ProfileImageGalleryProps> = ({
  images,
  title = 'Media',
  emptyMessage = 'No images available',
  maxHeight = '400px',
  onImageClick
}) => {
  if (!images || images.length === 0) {
    return (
      <Center
        flexDir="column"
        minH="200px"
        bg="gray.50"
        borderRadius="lg"
        border="2px dashed"
        borderColor="gray.200"
      >
        <FaImage size={32} color="gray.400" />
        <Text mt={3} color="gray.500" fontSize="sm">
          {emptyMessage}
        </Text>
      </Center>
    );
  }

  return (
    <VStack spacing={3} align="stretch">
      {title && (
        <Text fontSize="sm" fontWeight="semibold" color="gray.700" textTransform="uppercase">
          {title}
        </Text>
      )}
      <Box borderRadius="lg" overflow="hidden" border="1px" borderColor="gray.200" maxH={maxHeight}>
        <StandardImageGallery
          images={images.map((img) => ({
            url: img.url,
            alt: img.caption || 'Gallery image'
          }))}
        />
      </Box>
    </VStack>
  );
};

export default ProfileImageGallery;
