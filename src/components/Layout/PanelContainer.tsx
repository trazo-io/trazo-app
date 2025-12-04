import { Box, useStyleConfig } from '@chakra-ui/react';

type PanelContainerProps = {
  variant?: string;
  children: React.ReactNode;
};

function PanelContainer(props: PanelContainerProps) {
  const { variant, children, ...rest } = props;

  const styles = useStyleConfig('PanelContainer', { variant });

  return (
    <Box __css={styles} data-component="PanelContainer" className="trazo-panel-container" {...rest}>
      {children}
    </Box>
  );
}

export default PanelContainer;
