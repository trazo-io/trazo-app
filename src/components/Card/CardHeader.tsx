import { Box, SystemProps } from '@chakra-ui/react';

interface CardHeaderProps extends SystemProps {
  children?: React.ReactNode;
}

function CardHeader(props: CardHeaderProps) {
  const { children, ...rest } = props;
  return (
    <Box
      display="flex"
      width="100%"
      data-component="CardHeader"
      className="trazo-card-header"
      {...rest}>
      {children}
    </Box>
  );
}

export default CardHeader;
