import { Box } from '@chakra-ui/react';

type MainPanelProps = {
  children: React.ReactNode;
  w?: any;
  [key: string]: any;
};

function MainPanel(props: MainPanelProps) {
  const { children, w, ...rest } = props;

  return (
    <Box
      float="right"
      maxWidth="100%"
      overflowX="hidden"
      overflowY="auto"
      position="relative"
      maxHeight="100%"
      minH="100vh"
      transition="all 0.33s cubic-bezier(0.685, 0.0473, 0.346, 1)"
      transitionDuration=".2s, .2s, .35s"
      transitionProperty="top, bottom, width, margin-left"
      transitionTimingFunction="linear, linear, ease"
      sx={{
        '@media screen and (min-width: 1200px)': {
          marginLeft: 'var(--sidebar-width, 275px)',
          width: 'calc(100% - var(--sidebar-width, 275px))'
        },
        '@media screen and (max-width: 1199px)': {
          marginLeft: 0,
          width: '100%'
        }
      }}
      data-component="MainPanel"
      className="trazo-main-panel"
      w={w}
      {...rest}
    >
      {children}
    </Box>
  );
}

export default MainPanel;
