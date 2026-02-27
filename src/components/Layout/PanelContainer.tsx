import { Box } from '@chakra-ui/react';

type PanelContainerProps = {
  children: React.ReactNode;
  [key: string]: any;
};

function PanelContainer(props: PanelContainerProps) {
  const { children, ...rest } = props;

  return (
    <Box
      p="30px 15px"
      minH="calc(100vh - 123px)"
      data-component="PanelContainer"
      className="trazo-panel-container"
      {...rest}
    >
      {children}
    </Box>
  );
}

export default PanelContainer;
