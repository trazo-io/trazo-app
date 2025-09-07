/*!

=========================================================
* Purity UI Dashboard PRO - v1.0.0
=========================================================

* Product Page: https://www.creative-tim.com/product/purity-ui-dashboard-pro
* Copyright 2021 Creative Tim (https://www.creative-tim.com/)

* Design by Creative Tim & Coded by Simmmple

=========================================================

* The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

*/

import { Box, Button, Flex, Icon, Spacer, Text, useColorModeValue, useToast } from '@chakra-ui/react';
import { FaDownload } from 'react-icons/fa';
import { useDownloadInvoiceMutation } from 'store/api/billingApi';

type InvoicesRowProps = {
  id: number;
  date: string;
  code: string;
  price: string;
  format: string;
  logo: any;
  pdfUrl?: string | null;
};

function InvoicesRow(props: InvoicesRowProps) {
  const textColor = useColorModeValue('gray.700', 'white');
  const { id, date, code, price, format, logo, pdfUrl } = props;
  const toast = useToast();
  const [downloadInvoice, { isLoading: isDownloading }] = useDownloadInvoiceMutation();

  const handleDownload = async () => {
    if (!pdfUrl) {
      toast({
        title: 'Download Error',
        description: 'Invoice PDF is not available',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      const result = await downloadInvoice(id).unwrap();
      
      // Create blob URL and trigger download
      const blob = new Blob([result], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `trazo-invoice-${code || id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Success',
        description: 'Invoice downloaded successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error: any) {
      console.error('Download failed:', error);
      toast({
        title: 'Download Failed',
        description: error?.data?.detail || 'Unable to download invoice. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  return (
    <Flex my={{ sm: '1rem', xl: '10px' }} alignItems="center">
      <Flex direction="column">
        <Text fontSize="md" color={textColor} fontWeight="bold">
          {date}
        </Text>
        <Text fontSize="sm" color="gray.400" fontWeight="semibold" me="16px">
          {code}
        </Text>
      </Flex>
      <Spacer />
      <Box me="12px">
        <Text fontSize="md" color="gray.400" fontWeight="semibold">
          {price}
        </Text>
      </Box>
      {pdfUrl ? (
        <Button
          bg="green.500"
          color="white"
          size="sm"
          fontSize="sm"
          fontWeight="600"
          borderRadius="xl"
          isLoading={isDownloading}
          loadingText="Downloading..."
          onClick={handleDownload}
          _hover={{ bg: "green.600", transform: "translateY(-1px)" }}
          _active={{ bg: "green.700" }}
          leftIcon={<FaDownload />}
        >
          Download
        </Button>
      ) : (
        <Button p="0px" bg="transparent" variant="no-hover">
          <Flex alignItems="center" p="12px">
            <Icon as={logo} w="20px" h="auto" me="5px" />
            <Text fontSize="md" color={textColor} fontWeight="bold">
              {format || 'Not Available'}
            </Text>
          </Flex>
        </Button>
      )}
    </Flex>
  );
}

export default InvoicesRow;
