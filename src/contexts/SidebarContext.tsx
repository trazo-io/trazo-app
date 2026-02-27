import { createContext } from 'react';

export const SidebarContext = createContext({
  sidebarWidth: 275,
  setSidebarWidth: () => {},
  toggleSidebar: false,
  setToggleSidebar: () => {}
});
