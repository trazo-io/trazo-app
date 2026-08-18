import { Box, SystemProps } from '@chakra-ui/react';

interface CardFooterProps extends SystemProps {
  children?: React.ReactNode;
}

function CardFooter(props: CardFooterProps) {
  const { children, ...rest } = props;
  return (
    <Box
      display="flex"
      width="100%"
      data-component="CardFooter"
      className="trazo-card-footer"
      {...rest}>
      {children}
    </Box>
  );
}

export default CardFooter;
