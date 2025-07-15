import { Box, useStyleConfig } from '@chakra-ui/react';

type MainPanelProps = {
  variant?: string;
  children: React.ReactNode;
  w?: any; // Allow width override from layout
  [key: string]: any; // Allow other props
};

function MainPanel(props: MainPanelProps) {
  const { variant, children, w, ...rest } = props;
  const styles = useStyleConfig('MainPanel', { variant });

  return (
    <Box
      __css={styles}
      data-component="MainPanel"
      className="trazo-main-panel"
      w={w}
      minH="100vh"
      transition="all 0.33s cubic-bezier(0.685, 0.0473, 0.346, 1)"
      position="relative"
      {...rest}>
      {children}
    </Box>
  );
}

export default MainPanel;
