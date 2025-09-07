import React from 'react';
import { useDropzone } from 'react-dropzone';
import { Box, Button, Text } from '@chakra-ui/react';

export const DropzoneDebugTest: React.FC = () => {
  console.log('🔍 DropzoneDebugTest: Component rendering');

  const handleDrop = (files: File[]) => {
    console.log('🔍 DropzoneDebugTest: handleDrop called with:', files);
  };

  // Test 1: Minimal configuration
  console.log('🔍 DropzoneDebugTest: Creating useDropzone with minimal config');
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleDrop,
    accept: {
      'image/jpeg': [],
      'image/png': []
    },
    multiple: true,
    noClick: true
  });
  console.log('🔍 DropzoneDebugTest: useDropzone created successfully');

  const openFilePicker = () => {
    console.log('🔍 DropzoneDebugTest: openFilePicker called');
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    console.log('🔍 DropzoneDebugTest: Found input:', input);
    if (input) {
      input.click();
    }
  };

  return (
    <Box p={4} border="2px dashed gray" minH="200px">
      <div {...getRootProps()}>
        <input {...getInputProps()} />
        <Text>Dropzone Debug Test</Text>
        <Button onClick={openFilePicker} colorScheme="green">
          Test Choose Files
        </Button>
        {isDragActive && <Text>Drop files here...</Text>}
      </div>
    </Box>
  );
};