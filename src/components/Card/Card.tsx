import { Box, SystemProps } from '@chakra-ui/react';

interface CardProps extends SystemProps {
  children?: React.ReactNode;
}

function Card(props: CardProps) {
  const { children, ...rest } = props;
  return (
    <Box
      p={{ base: '12px', md: '22px' }}
      display="flex"
      flexDirection="column"
      width="100%"
      position="relative"
      minWidth="0px"
      wordBreak="break-word"
      bg="white"
      backgroundClip="border-box"
      boxShadow="0px 3.5px 5.5px rgba(0, 0, 0, 0.02)"
      borderRadius="15px"
      data-component="Card"
      className="trazo-card"
      {...rest}
    >
      {children}
    </Box>
  );
}

export default Card;
