import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePerformanceMonitor } from '../usePerformanceMonitor';

// Create a more reliable mock system
let mockTime = 1000;

// Mock Date.now with a controllable value at the global level
Object.defineProperty(global, 'Date', {
  value: class extends Date {
    static now() {
      return mockTime;
    }
    constructor(...args: any[]) {
      if (args.length === 0) {
        super(mockTime);
      } else {
        super(...args);
      }
    }
  },
  writable: true
});

describe('usePerformanceMonitor Hook Integration Tests', () => {
  beforeEach(() => {
    mockTime = 1000; // Reset time to 1000ms
  });

  afterEach(() => {
    // Don't restore Date.now here to maintain consistency
  });

  describe('Basic Performance Monitoring', () => {
    it('initializes with correct default values', () => {
      const { result } = renderHook(() => usePerformanceMonitor());

      expect(result.current.metrics.initialLoadTime).toBe(0);
      expect(result.current.metrics.primaryLoadTime).toBe(0);
      expect(result.current.metrics.secondaryLoadTime).toBe(0);
      expect(result.current.metrics.totalLoadTime).toBe(0);
      expect(result.current.metrics.isWithinTarget).toBe(false);
      expect(typeof result.current.markStageComplete).toBe('function');
      expect(typeof result.current.resetTimer).toBe('function');
    });
  });

  describe('Stage Completion Tracking', () => {
    it('tracks initial stage completion', () => {
      const { result } = renderHook(() => usePerformanceMonitor());

      // Simulate 500ms for initial stage
      mockTime = 1500;

      act(() => {
        result.current.markStageComplete('initial');
      });

      expect(result.current.metrics.initialLoadTime).toBe(0); // Initial stage not tracked in switch
      expect(result.current.metrics.totalLoadTime).toBe(0); // Total only updated on 'complete'
      expect(result.current.metrics.isWithinTarget).toBe(false); // Only true on 'complete'
    });

    it('tracks primary stage completion', () => {
      // Hook renders with Date.now() = 1000ms
      const { result } = renderHook(() => usePerformanceMonitor());

      // Primary stage completes at 2000ms (1000ms elapsed from start)
      mockTime = 2000;
      act(() => {
        result.current.markStageComplete('primary');
      });

      expect(result.current.metrics.initialLoadTime).toBe(0); // Initial not tracked in switch
      expect(result.current.metrics.primaryLoadTime).toBe(1000); // 2000 - 1000 = 1000ms
      expect(result.current.metrics.totalLoadTime).toBe(0); // Only on 'complete'
      expect(result.current.metrics.isWithinTarget).toBe(false); // Only on 'complete'
    });

    it('tracks secondary stage completion', () => {
      // Hook renders with Date.now() = 1000ms
      const { result } = renderHook(() => usePerformanceMonitor());

      // Primary stage completes at 2000ms (1000ms elapsed)
      mockTime = 2000;
      act(() => {
        result.current.markStageComplete('primary');
      });

      // Secondary stage completes at 2500ms (1500ms elapsed from start)
      mockTime = 2500;
      act(() => {
        result.current.markStageComplete('secondary');
      });

      expect(result.current.metrics.initialLoadTime).toBe(0); // Initial not tracked in switch
      expect(result.current.metrics.primaryLoadTime).toBe(1000); // 2000 - 1000 = 1000ms
      expect(result.current.metrics.secondaryLoadTime).toBe(1500); // 2500 - 1000 = 1500ms
      expect(result.current.metrics.totalLoadTime).toBe(0); // Only on 'complete'
      expect(result.current.metrics.isWithinTarget).toBe(false); // Only on 'complete'
    });

    it('correctly identifies when exceeding 3-second target', () => {
      // Hook renders with Date.now() = 1000ms
      const { result } = renderHook(() => usePerformanceMonitor());

      // Complete stage finishes at 4000ms (3000ms elapsed from start)
      mockTime = 4000;
      act(() => {
        result.current.markStageComplete('complete');
      });

      expect(result.current.metrics.totalLoadTime).toBe(3000); // 4000 - 1000 = 3000ms
      expect(result.current.metrics.isWithinTarget).toBe(true); // Exactly 3 seconds = true (<= 3000)
    });

    it('correctly identifies when exceeding 3-second target', () => {
      // Hook renders with Date.now() = 1000ms
      const { result } = renderHook(() => usePerformanceMonitor());

      // Complete stage finishes at 4001ms (3001ms elapsed - exceeds target)
      mockTime = 4001;
      act(() => {
        result.current.markStageComplete('complete');
      });

      expect(result.current.metrics.totalLoadTime).toBe(3001); // 4001 - 1000 = 3001ms
      expect(result.current.metrics.isWithinTarget).toBe(false); // Exceeds 3 seconds
    });
  });

  describe('Reset Functionality', () => {
    it('resets all metrics to initial state', () => {
      // Hook renders with Date.now() = 1000ms
      const { result } = renderHook(() => usePerformanceMonitor());

      // Complete some stages
      mockTime = 1500; // 500ms elapsed
      act(() => {
        result.current.markStageComplete('primary');
      });

      mockTime = 2000; // 1000ms elapsed
      act(() => {
        result.current.markStageComplete('secondary');
      });

      // Verify stages are recorded
      expect(result.current.metrics.initialLoadTime).toBe(0); // Not tracked
      expect(result.current.metrics.primaryLoadTime).toBe(500); // 1500 - 1000 = 500ms
      expect(result.current.metrics.secondaryLoadTime).toBe(1000); // 2000 - 1000 = 1000ms

      // Reset timer at 2000ms - this sets new start time
      mockTime = 2000;
      act(() => {
        result.current.resetTimer();
      });

      expect(result.current.metrics.initialLoadTime).toBe(0);
      expect(result.current.metrics.primaryLoadTime).toBe(0);
      expect(result.current.metrics.secondaryLoadTime).toBe(0);
      expect(result.current.metrics.totalLoadTime).toBe(0);
      expect(result.current.metrics.isWithinTarget).toBe(false);
    });

    it('correctly handles new measurements after reset', () => {
      // Hook renders with Date.now() = 1000ms
      const { result } = renderHook(() => usePerformanceMonitor());

      // Complete primary measurement
      mockTime = 1500; // 500ms elapsed
      act(() => {
        result.current.markStageComplete('primary');
      });

      expect(result.current.metrics.primaryLoadTime).toBe(500); // 1500 - 1000 = 500ms

      // Reset at 2000ms - this sets startTimeRef to 2000ms
      mockTime = 2000;
      act(() => {
        result.current.resetTimer();
      });

      // Complete stage at 2300ms (300ms from reset time of 2000ms)
      mockTime = 2300;
      act(() => {
        result.current.markStageComplete('complete');
      });

      expect(result.current.metrics.initialLoadTime).toBe(0); // Not tracked
      expect(result.current.metrics.totalLoadTime).toBe(300); // 2300 - 2000 = 300ms
      expect(result.current.metrics.isWithinTarget).toBe(true); // 300ms < 3000ms
    });
  });

  describe('Real-world Loading Scenarios', () => {
    it('handles typical fast loading scenario', () => {
      // Hook renders with Date.now() = 1000ms
      const { result } = renderHook(() => usePerformanceMonitor());

      // Primary completes at 1600ms (600ms elapsed)
      mockTime = 1600;
      act(() => {
        result.current.markStageComplete('primary');
      });

      // Secondary completes at 1900ms (900ms elapsed)
      mockTime = 1900;
      act(() => {
        result.current.markStageComplete('secondary');
      });

      // Complete at 1900ms (900ms elapsed total)
      mockTime = 1900;
      act(() => {
        result.current.markStageComplete('complete');
      });

      expect(result.current.metrics.initialLoadTime).toBe(0); // Not tracked
      expect(result.current.metrics.primaryLoadTime).toBe(600); // 1600 - 1000 = 600ms
      expect(result.current.metrics.secondaryLoadTime).toBe(900); // 1900 - 1000 = 900ms
      expect(result.current.metrics.totalLoadTime).toBe(900); // 1900 - 1000 = 900ms
      expect(result.current.metrics.isWithinTarget).toBe(true); // 900ms < 3000ms
    });

    it('handles typical slow loading scenario', () => {
      // Hook renders with Date.now() = 1000ms
      const { result } = renderHook(() => usePerformanceMonitor());

      // Primary completes at 3500ms (2500ms elapsed)
      mockTime = 3500;
      act(() => {
        result.current.markStageComplete('primary');
      });

      // Secondary completes at 5000ms (4000ms elapsed)
      mockTime = 5000;
      act(() => {
        result.current.markStageComplete('secondary');
      });

      // Complete at 5000ms (4000ms elapsed total)
      mockTime = 5000;
      act(() => {
        result.current.markStageComplete('complete');
      });

      expect(result.current.metrics.initialLoadTime).toBe(0); // Not tracked
      expect(result.current.metrics.primaryLoadTime).toBe(2500); // 3500 - 1000 = 2500ms
      expect(result.current.metrics.secondaryLoadTime).toBe(4000); // 5000 - 1000 = 4000ms
      expect(result.current.metrics.totalLoadTime).toBe(4000); // 5000 - 1000 = 4000ms
      expect(result.current.metrics.isWithinTarget).toBe(false); // 4000ms > 3000ms
    });

    it('handles partial completion scenarios', () => {
      // Hook renders with Date.now() = 1000ms
      const { result } = renderHook(() => usePerformanceMonitor());

      // Only complete primary stage (no secondary or complete)
      mockTime = 1800; // 800ms elapsed
      act(() => {
        result.current.markStageComplete('primary');
      });

      expect(result.current.metrics.initialLoadTime).toBe(0); // Not tracked
      expect(result.current.metrics.primaryLoadTime).toBe(800); // 1800 - 1000 = 800ms
      expect(result.current.metrics.secondaryLoadTime).toBe(0); // Not completed
      expect(result.current.metrics.totalLoadTime).toBe(0); // Only on 'complete'
      expect(result.current.metrics.isWithinTarget).toBe(false); // Only on 'complete'
    });
  });

  describe('Edge Cases', () => {
    it('handles completing stages out of order', () => {
      // Hook renders with Date.now() = 1000ms
      const { result } = renderHook(() => usePerformanceMonitor());

      // Complete secondary stage before primary at 2000ms (1000ms elapsed)
      mockTime = 2000;
      act(() => {
        result.current.markStageComplete('secondary');
      });

      // Complete primary stage at 2500ms (1500ms elapsed)
      mockTime = 2500;
      act(() => {
        result.current.markStageComplete('primary');
      });

      // Complete stage at 2500ms (1500ms elapsed total)
      mockTime = 2500;
      act(() => {
        result.current.markStageComplete('complete');
      });

      expect(result.current.metrics.secondaryLoadTime).toBe(1000); // 2000 - 1000 = 1000ms
      expect(result.current.metrics.primaryLoadTime).toBe(1500); // 2500 - 1000 = 1500ms
      expect(result.current.metrics.totalLoadTime).toBe(1500); // 2500 - 1000 = 1500ms
    });

    it('handles completing the same stage multiple times', () => {
      // Hook renders with Date.now() = 1000ms
      const { result } = renderHook(() => usePerformanceMonitor());

      // Complete primary stage first time at 1500ms (500ms elapsed)
      mockTime = 1500;
      act(() => {
        result.current.markStageComplete('primary');
      });

      // Complete primary stage second time at 2000ms (1000ms elapsed)
      mockTime = 2000;
      act(() => {
        result.current.markStageComplete('primary');
      });

      // Should use the latest time
      expect(result.current.metrics.primaryLoadTime).toBe(1000); // 2000 - 1000 = 1000ms
      expect(result.current.metrics.totalLoadTime).toBe(0); // Only on 'complete'
    });
  });
});
