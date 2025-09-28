// Performance monitoring utilities for mobile dashboard optimization
export interface PerformanceMetrics {
  loadTime: number;
  renderTime: number;
  transparencyDisplayTime: number;
  totalBundleSize: number;
  cacheHits: number;
  cacheMisses: number;
  networkRequests: number;
  screenSize: 'mobile' | 'tablet' | 'desktop';
  connection: 'slow-2g' | '2g' | '3g' | '4g' | 'unknown';
}

export interface CoreWebVitals {
  FCP: number; // First Contentful Paint
  LCP: number; // Largest Contentful Paint
  FID: number; // First Input Delay
  CLS: number; // Cumulative Layout Shift
  TTFB: number; // Time to First Byte
}

class PerformanceMonitor {
  private startTime: number;
  private metrics: Partial<PerformanceMetrics> = {};
  private vitals: Partial<CoreWebVitals> = {};
  
  constructor() {
    this.startTime = performance.now();
    this.detectConnection();
    this.detectScreenSize();
    this.initWebVitals();
  }

  // Start timing a specific operation
  startTimer(operation: string): () => number {
    const start = performance.now();
    return () => {
      const duration = performance.now() - start;
      console.log(`⏱️ ${operation}: ${Math.round(duration)}ms`);
      return duration;
    };
  }

  // Mark transparency score display time (critical for mobile UX)
  markTransparencyDisplay(): void {
    this.metrics.transparencyDisplayTime = performance.now() - this.startTime;
    
    // Target: <500ms for transparency score display
    if (this.metrics.transparencyDisplayTime <= 500) {
      console.log(`✅ Transparency displayed in ${Math.round(this.metrics.transparencyDisplayTime)}ms (target: <500ms)`);
    } else {
      console.warn(`⚠️ Transparency displayed in ${Math.round(this.metrics.transparencyDisplayTime)}ms (over 500ms target)`);
    }
  }

  // Mark total dashboard load completion
  markDashboardComplete(): void {
    this.metrics.loadTime = performance.now() - this.startTime;
    this.metrics.renderTime = this.metrics.loadTime - (this.metrics.transparencyDisplayTime || 0);
    
    // Target: <3000ms total load time on 3G
    const target = this.metrics.connection === '3g' ? 3000 : 1500;
    if (this.metrics.loadTime <= target) {
      console.log(`✅ Dashboard loaded in ${Math.round(this.metrics.loadTime)}ms (target: <${target}ms)`);
    } else {
      console.warn(`⚠️ Dashboard loaded in ${Math.round(this.metrics.loadTime)}ms (over ${target}ms target)`);
    }
    
    this.logPerformanceReport();
  }

  // Track cache performance
  trackCacheHit(): void {
    this.metrics.cacheHits = (this.metrics.cacheHits || 0) + 1;
  }

  trackCacheMiss(): void {
    this.metrics.cacheMisses = (this.metrics.cacheMisses || 0) + 1;
  }

  trackNetworkRequest(): void {
    this.metrics.networkRequests = (this.metrics.networkRequests || 0) + 1;
  }

  // Detect connection speed
  private detectConnection(): void {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      const effectiveType = connection?.effectiveType;
      this.metrics.connection = effectiveType || 'unknown';
    } else {
      this.metrics.connection = 'unknown';
    }
  }

  // Detect screen size category
  private detectScreenSize(): void {
    const width = window.innerWidth;
    if (width < 768) {
      this.metrics.screenSize = 'mobile';
    } else if (width < 1024) {
      this.metrics.screenSize = 'tablet';
    } else {
      this.metrics.screenSize = 'desktop';
    }
  }

  // Initialize Web Vitals monitoring
  private initWebVitals(): void {
    // First Contentful Paint
    const observer = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          this.vitals.FCP = entry.startTime;
        }
      }
    });
    
    try {
      observer.observe({ entryTypes: ['paint'] });
    } catch (e) {
      console.warn('Paint API not supported');
    }

    // Largest Contentful Paint
    try {
      const lcpObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const lastEntry = entries[entries.length - 1];
        this.vitals.LCP = lastEntry.startTime;
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
    } catch (e) {
      console.warn('LCP API not supported');
    }

    // Cumulative Layout Shift
    try {
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value;
            this.vitals.CLS = clsValue;
          }
        }
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
    } catch (e) {
      console.warn('CLS API not supported');
    }
  }

  // Get current performance score (0-100)
  getPerformanceScore(): number {
    const scores = [];
    
    // Transparency display speed (40% weight)
    if (this.metrics.transparencyDisplayTime) {
      const transparencyScore = Math.max(0, 100 - (this.metrics.transparencyDisplayTime / 5)); // 500ms = 100 points
      scores.push({ score: transparencyScore, weight: 0.4 });
    }
    
    // Total load time (30% weight)
    if (this.metrics.loadTime) {
      const target = this.metrics.connection === '3g' ? 3000 : 1500;
      const loadScore = Math.max(0, 100 - (this.metrics.loadTime / target * 100));
      scores.push({ score: loadScore, weight: 0.3 });
    }
    
    // Cache efficiency (20% weight)
    const totalCacheRequests = (this.metrics.cacheHits || 0) + (this.metrics.cacheMisses || 0);
    if (totalCacheRequests > 0) {
      const cacheScore = (this.metrics.cacheHits || 0) / totalCacheRequests * 100;
      scores.push({ score: cacheScore, weight: 0.2 });
    }
    
    // Core Web Vitals (10% weight)
    let vitalsScore = 100;
    if (this.vitals.LCP && this.vitals.LCP > 2500) vitalsScore -= 30;
    if (this.vitals.CLS && this.vitals.CLS > 0.1) vitalsScore -= 20;
    scores.push({ score: Math.max(0, vitalsScore), weight: 0.1 });
    
    // Calculate weighted average
    const totalWeight = scores.reduce((sum, item) => sum + item.weight, 0);
    const weightedSum = scores.reduce((sum, item) => sum + (item.score * item.weight), 0);
    
    return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
  }

  // Log comprehensive performance report
  private logPerformanceReport(): void {
    console.group('📊 Dashboard Performance Report');
    
    console.log('🎯 Key Metrics:');
    console.log(`  • Transparency Display: ${Math.round(this.metrics.transparencyDisplayTime || 0)}ms (target: <500ms)`);
    console.log(`  • Total Load Time: ${Math.round(this.metrics.loadTime || 0)}ms`);
    console.log(`  • Network Requests: ${this.metrics.networkRequests || 0}`);
    console.log(`  • Cache Hit Rate: ${this.getCacheHitRate()}%`);
    
    console.log('📱 Environment:');
    console.log(`  • Screen: ${this.metrics.screenSize}`);
    console.log(`  • Connection: ${this.metrics.connection}`);
    
    console.log('🚀 Core Web Vitals:');
    console.log(`  • FCP: ${Math.round(this.vitals.FCP || 0)}ms (target: <1800ms)`);
    console.log(`  • LCP: ${Math.round(this.vitals.LCP || 0)}ms (target: <2500ms)`);
    console.log(`  • CLS: ${(this.vitals.CLS || 0).toFixed(3)} (target: <0.1)`);
    
    const score = this.getPerformanceScore();
    const emoji = score >= 90 ? '🏆' : score >= 75 ? '✅' : score >= 60 ? '⚠️' : '🚨';
    console.log(`${emoji} Overall Performance Score: ${score}/100`);
    
    console.groupEnd();
  }

  private getCacheHitRate(): number {
    const total = (this.metrics.cacheHits || 0) + (this.metrics.cacheMisses || 0);
    if (total === 0) return 0;
    return Math.round(((this.metrics.cacheHits || 0) / total) * 100);
  }

  // Export metrics for analytics
  exportMetrics(): PerformanceMetrics & { performanceScore: number; coreWebVitals: CoreWebVitals } {
    return {
      ...this.metrics as PerformanceMetrics,
      performanceScore: this.getPerformanceScore(),
      coreWebVitals: this.vitals as CoreWebVitals
    };
  }
}

// Singleton instance for global performance monitoring
export const performanceMonitor = new PerformanceMonitor();

// Hook for React components
export const usePerformanceMonitor = () => {
  return {
    markTransparencyDisplay: () => performanceMonitor.markTransparencyDisplay(),
    markDashboardComplete: () => performanceMonitor.markDashboardComplete(),
    trackCacheHit: () => performanceMonitor.trackCacheHit(),
    trackCacheMiss: () => performanceMonitor.trackCacheMiss(),
    trackNetworkRequest: () => performanceMonitor.trackNetworkRequest(),
    startTimer: (operation: string) => performanceMonitor.startTimer(operation),
    getPerformanceScore: () => performanceMonitor.getPerformanceScore(),
    exportMetrics: () => performanceMonitor.exportMetrics()
  };
};

// Performance budget validator
export const validatePerformanceBudget = (metrics: Partial<PerformanceMetrics>) => {
  const violations = [];
  
  if (metrics.transparencyDisplayTime && metrics.transparencyDisplayTime > 500) {
    violations.push(`Transparency display: ${Math.round(metrics.transparencyDisplayTime)}ms (budget: 500ms)`);
  }
  
  if (metrics.loadTime && metrics.loadTime > 3000) {
    violations.push(`Total load time: ${Math.round(metrics.loadTime)}ms (budget: 3000ms)`);
  }
  
  const cacheHitRate = metrics.cacheHits && metrics.cacheMisses ? 
    (metrics.cacheHits / (metrics.cacheHits + metrics.cacheMisses)) * 100 : 100;
  
  if (cacheHitRate < 80) {
    violations.push(`Cache hit rate: ${Math.round(cacheHitRate)}% (budget: 80%)`);
  }
  
  return {
    passed: violations.length === 0,
    violations
  };
};