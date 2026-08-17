import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useIntl } from 'react-intl';
import { driver, type DriveStep, type Driver } from 'driver.js';
import 'driver.js/dist/driver.css';

import { useTourStore } from '../../store/tourStore';
import { getTour } from '../../tours/registry';
import { renderTrazoTooltip, cleanupTooltipRoot } from './TrazoTooltip';

// Register all tour definitions on import
import '../../tours';

// Override Driver.js popover styles for custom Chakra tooltip
const driverCssOverrides = `
.trazo-tour-popover.driver-popover {
  background: white !important;
  border: none !important;
  box-shadow: 0 25px 60px -10px rgba(0, 0, 0, 0.3) !important;
  padding: 0 !important;
  border-radius: 12px !important;
  max-width: 400px !important;
  min-width: 280px !important;
}
.trazo-tour-popover .driver-popover-title,
.trazo-tour-popover .driver-popover-footer,
.trazo-tour-popover .driver-popover-close-btn-icon {
  display: none !important;
}
.trazo-tour-popover .driver-popover-description {
  margin: 0 !important;
  padding: 0 !important;
}
.trazo-tour-popover .driver-popover-arrow-side-top {
  border-top-color: white !important;
}
.trazo-tour-popover .driver-popover-arrow-side-bottom {
  border-bottom-color: white !important;
}
.trazo-tour-popover .driver-popover-arrow-side-left {
  border-left-color: white !important;
}
.trazo-tour-popover .driver-popover-arrow-side-right {
  border-right-color: white !important;
}
`;

// Inject CSS overrides once
if (typeof document !== 'undefined') {
  const styleId = 'trazo-driver-overrides';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = driverCssOverrides;
    document.head.appendChild(style);
  }
}

/**
 * TourProvider — manages Driver.js tour instances imperatively.
 * Wraps children and renders nothing extra in JSX (Driver.js manages its own DOM).
 */
const TourProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const activeTourId = useTourStore((s) => s.activeTourId);
  const activeStepIndex = useTourStore((s) => s.activeStepIndex);
  const completedTours = useTourStore((s) => s.completedTours);
  const skippedTours = useTourStore((s) => s.skippedTours);
  const setStepIndex = useTourStore((s) => s.setStepIndex);
  const completeTour = useTourStore((s) => s.completeTour);
  const skipTour = useTourStore((s) => s.skipTour);
  const endTour = useTourStore((s) => s.endTour);

  const intl = useIntl();
  const driverRef = useRef<Driver | null>(null);

  // Resolve active tour definition
  const activeTour = activeTourId ? getTour(activeTourId) : undefined;

  // Check if tour was already completed or skipped
  const isTourDone = useMemo(() => {
    if (!activeTour) return false;
    const completed = completedTours[activeTour.id];
    if (completed && completed.version >= activeTour.version) return true;
    return !!skippedTours[activeTour.id];
  }, [activeTour, completedTours, skippedTours]);

  // Reactive route check — don't run tours on setup/form pages
  const location = useLocation();
  const isSetupPage = useMemo(() => {
    const p = location.pathname;
    return p.includes('/select-company') ||
      p.includes('/pricing') ||
      p.includes('/stripe-success') ||
      p.endsWith('/farm/add') ||
      p.endsWith('/edit') ||
      p.includes('/parcel/add') ||
      p.includes('/event/add') ||
      p.includes('/settings');
  }, [location.pathname]);

  // Cancel any active tour when navigating to a setup page
  useEffect(() => {
    if (isSetupPage && activeTourId) {
      skipTour(activeTourId);
      if (driverRef.current?.isActive()) {
        driverRef.current.destroy();
      }
    }
  }, [isSetupPage, activeTourId, skipTour]);

  const shouldRun = !!activeTour && !isTourDone && !isSetupPage;

  // Stable callbacks using refs to avoid recreating driver on every render
  const activeTourRef = useRef(activeTour);
  activeTourRef.current = activeTour;
  const visibleStepCountRef = useRef(0);

  const handleNext = useCallback(() => {
    const tour = activeTourRef.current;
    const driverObj = driverRef.current;
    if (!driverObj || !tour) return;

    const currentIndex = useTourStore.getState().activeStepIndex;
    const nextIndex = currentIndex + 1;

    if (nextIndex >= visibleStepCountRef.current) {
      completeTour(tour.id, tour.version);
      driverObj.destroy();
      cleanupTooltipRoot();
      return;
    }

    setStepIndex(nextIndex);
    driverObj.moveNext();
  }, [completeTour, setStepIndex]);

  const handlePrev = useCallback(() => {
    const driverObj = driverRef.current;
    if (!driverObj) return;

    const currentIndex = useTourStore.getState().activeStepIndex;
    const prevIndex = currentIndex - 1;
    if (prevIndex < 0) return;

    setStepIndex(prevIndex);
    driverObj.movePrevious();
  }, [setStepIndex]);

  const handleClose = useCallback(() => {
    const tour = activeTourRef.current;
    if (tour) {
      skipTour(tour.id);
    }
    if (driverRef.current?.isActive()) {
      driverRef.current.destroy();
    }
    cleanupTooltipRoot();
  }, [skipTour]);

  // Create/destroy Driver.js instance when tour state changes
  useEffect(() => {
    // Cleanup if tour shouldn't run
    if (!shouldRun || !activeTour) {
      if (driverRef.current?.isActive()) {
        driverRef.current.destroy();
        cleanupTooltipRoot();
      }
      driverRef.current = null;
      return;
    }

    // Build Driver.js steps — only include steps whose targets exist in DOM
    const visibleSteps = activeTour.steps.filter((step) => {
      const el = document.querySelector(step.target);
      return !!el;
    });

    // No visible targets — stand down, but do NOT record the tour as seen. Leaving
    // `activeTourId` set here (the behaviour until 2026-08-16) made `useTour`'s `isBusy`
    // guard true for every other tour for the rest of the session, so one page that had not
    // finished loading silently disabled the whole system.
    if (visibleSteps.length === 0) {
      endTour();
      return;
    }
    visibleStepCountRef.current = visibleSteps.length;

    const steps: DriveStep[] = visibleSteps.map((step) => ({
      element: step.target,
      popover: {
        title: step.titleKey,
        description: step.contentKey,
        side: (step.placement === 'auto' || !step.placement) ? undefined : step.placement as any,
        align: 'center' as const,
      }
    }));

    // Get i18n data for the tooltip bridge
    const locale = intl.locale;
    const messages = intl.messages as Record<string, string>;
    const totalSteps = visibleSteps.length;

    const driverObj = driver({
      steps,
      animate: true,
      overlayColor: '#000',
      overlayOpacity: 0.45,
      stagePadding: 12,
      stageRadius: 14,
      allowClose: false,
      disableActiveInteraction: false,
      smoothScroll: true,
      popoverClass: 'trazo-tour-popover',
      popoverOffset: 28,

      // Override all button behavior — we handle navigation through Zustand
      showButtons: [],
      showProgress: false,

      onPopoverRender: (popover) => {
        const stepIndex = driverObj.getActiveIndex() ?? 0;
        const step = visibleSteps[stepIndex];
        if (!step || !popover?.wrapper) return;

        renderTrazoTooltip(
          { wrapper: popover.wrapper, description: popover.description },
          {
            stepIndex,
            totalSteps,
            titleKey: step.titleKey,
            contentKey: step.contentKey,
            onNext: handleNext,
            onPrev: handlePrev,
            onClose: handleClose,
            locale,
            messages
          }
        );

        // After React renders, reposition the popover with correct dimensions.
        // For tall elements, manually position to avoid overlap.
        const targetEl = document.querySelector(step.target);
        if (targetEl) {
          requestAnimationFrame(() => {
            if (!driverObj.isActive()) return;
            const elRect = targetEl.getBoundingClientRect();
            const isTall = elRect.height > window.innerHeight * 0.4;

            if (isTall) {
              const popoverRect = popover.wrapper.getBoundingClientRect();
              const arrow = popover.arrow;
              const offset = 28; // same as popoverOffset
              const padding = 12; // same as stagePadding

              // Helper to update arrow direction
              const setArrowSide = (side: string) => {
                arrow.className = 'driver-popover-arrow';
                arrow.classList.add(`driver-popover-arrow-side-${side}`);
                arrow.classList.add('driver-popover-arrow-align-center');
              };

              // Try to position to the right of the element, vertically centered in viewport
              const rightSpace = window.innerWidth - elRect.right - padding;
              const leftSpace = elRect.left - padding;

              if (rightSpace >= popoverRect.width + offset) {
                // Popover to the right → arrow points left (arrow-side-right = arrow on left edge)
                popover.wrapper.style.left = `${elRect.right + padding + offset}px`;
                popover.wrapper.style.right = 'auto';
                popover.wrapper.style.top = `${Math.max(20, (window.innerHeight - popoverRect.height) / 2)}px`;
                popover.wrapper.style.bottom = 'auto';
                setArrowSide('right');
              } else if (leftSpace >= popoverRect.width + offset) {
                // Popover to the left → arrow points right (arrow-side-left = arrow on right edge)
                popover.wrapper.style.left = 'auto';
                popover.wrapper.style.right = `${window.innerWidth - elRect.left + padding + offset}px`;
                popover.wrapper.style.top = `${Math.max(20, (window.innerHeight - popoverRect.height) / 2)}px`;
                popover.wrapper.style.bottom = 'auto';
                setArrowSide('left');
              } else {
                // Fallback: fixed position bottom-center of viewport, no arrow
                popover.wrapper.style.position = 'fixed';
                popover.wrapper.style.bottom = '20px';
                popover.wrapper.style.top = 'auto';
                popover.wrapper.style.left = `${(window.innerWidth - popoverRect.width) / 2}px`;
                popover.wrapper.style.right = 'auto';
                arrow.className = 'driver-popover-arrow driver-popover-arrow-none';
              }
            } else {
              // Non-tall elements: fix horizontal centering without changing the side.
              // refresh() would recalculate and might pick a different side.
              const wrapperRect = popover.wrapper.getBoundingClientRect();
              const center = elRect.left + elRect.width / 2;
              const newLeft = Math.max(10, Math.min(
                center - wrapperRect.width / 2,
                window.innerWidth - wrapperRect.width - 10
              ));
              popover.wrapper.style.left = `${newLeft}px`;
              popover.wrapper.style.right = 'auto';
            }
          });
        }

      },

      onDestroyStarted: () => {
        // User pressed ESC or clicked overlay
        handleClose();
      }
    });

    driverRef.current = driverObj;

    // Start the tour
    driverObj.drive(activeStepIndex);

    return () => {
      if (driverObj.isActive()) {
        driverObj.destroy();
      }
      cleanupTooltipRoot();
      driverRef.current = null;
    };
  }, [shouldRun, activeTourId]); // Only re-create on tour change, not step change

  // Driver.js manages its own DOM — we just render children
  return <>{children}</>;
};

export default TourProvider;
