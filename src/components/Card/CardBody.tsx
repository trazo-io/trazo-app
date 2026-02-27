import { Box, SystemProps } from '@chakra-ui/react';

interface CardBodyProps extends SystemProps {
  children?: React.ReactNode;
}

function CardBody(props: CardBodyProps) {
  const { children, ...rest } = props;
  return (
    <Box
      display="flex"
      width="100%"
      bg="transparent"
      flexDirection="column"
      data-component="CardBody"
      className="trazo-card-body"
      {...rest}
    >
      {children}
    </Box>
  );
}

export default CardBody;
