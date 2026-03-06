import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

function scrollAllToTop() {
  window.scrollTo(0, 0);
  const mainPanel = document.querySelector('[data-component="MainPanel"]');
  if (mainPanel) {
    mainPanel.scrollTo(0, 0);
  }
}

export default function ScrollToTop() {
  const { pathname } = useLocation();
  const prevPathname = useRef(pathname);

  useEffect(() => {
    // Skip on initial mount (let the page load naturally)
    if (prevPathname.current === pathname) return;
    prevPathname.current = pathname;

    // Immediate scroll
    scrollAllToTop();

    // Also scroll after a frame to catch async layout shifts from redirects
    requestAnimationFrame(() => {
      scrollAllToTop();
    });
  }, [pathname]);

  return null;
}
