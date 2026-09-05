import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Scroll every scroll container the dashboard uses back to the top.
 *
 * Exported (2026-09-03) so a wizard can land a STEP change the way a route change lands.
 * Which container actually scrolls depends on the layout — MEASURED on the activity wizard
 * at 375px, `window` moved (916px, then 8790px on the details step) while `MainPanel`
 * (`overflowY="auto"`) stayed at 0 — so this resets all of them and no caller has to know.
 */
export function scrollAllToTop() {
  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
  const mainPanel = document.querySelector('[data-component="MainPanel"]');
  if (mainPanel) {
    mainPanel.scrollTop = 0;
  }
}

export default function ScrollToTop() {
  const { pathname } = useLocation();

  // Disable browser's automatic scroll restoration (iOS Safari issue)
  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  useEffect(() => {
    // Immediate scroll
    scrollAllToTop();

    // After paint — catches async content/layout shifts
    requestAnimationFrame(() => {
      scrollAllToTop();
    });

    // Delayed fallback — catches late async redirects (Authenticated.jsx chain)
    const timeout = setTimeout(scrollAllToTop, 100);
    return () => clearTimeout(timeout);
  }, [pathname]);

  return null;
}
