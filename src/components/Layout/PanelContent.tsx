import { Box } from '@chakra-ui/react';

type PanelContentProps = {
  children: React.ReactNode;
  [key: string]: any;
};

function PanelContent(props: PanelContentProps) {
  const { children, ...rest } = props;

  return (
    <Box
      ms="auto"
      me="auto"
      ps="15px"
      pe="15px"
      data-component="PanelContent"
      className="trazo-panel-content"
      {...rest}
    >
      {children}
    </Box>
  );
}

export default PanelContent;
