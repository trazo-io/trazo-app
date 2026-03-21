import { useRef, useCallback } from 'react';

interface UseSwipeToDismissOptions {
  onClose: () => void;
  threshold?: number;
}

/**
 * Adds swipe-down-to-dismiss behavior for bottom sheet drawers.
 * Attach the returned handlers to the drag handle area.
 */
export const useSwipeToDismiss = ({ onClose, threshold = 80 }: UseSwipeToDismissOptions) => {
  const touchStartY = useRef(0);
  const touchCurrentY = useRef(0);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    touchCurrentY.current = e.touches[0].clientY;
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    touchCurrentY.current = e.touches[0].clientY;
  }, []);

  const onTouchEnd = useCallback(() => {
    const deltaY = touchCurrentY.current - touchStartY.current;
    if (deltaY > threshold) {
      onClose();
    }
  }, [onClose, threshold]);

  return { onTouchStart, onTouchMove, onTouchEnd };
};
