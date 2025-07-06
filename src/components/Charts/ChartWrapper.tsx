import React, { useState, useEffect } from 'react';

interface ChartWrapperProps {
  options: any;
  series: any;
  type: string;
  width?: string | number;
  height?: string | number;
  chartRef?: React.Ref<any>;
}

const ChartWrapper: React.FC<ChartWrapperProps> = ({ 
  options, 
  series, 
  type, 
  width = "100%", 
  height = "100%",
  chartRef 
}) => {
  const [Chart, setChart] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    // Only import on client side and with additional safety checks
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      // Add a small delay to ensure all dependencies are loaded
      const timer = setTimeout(() => {
        import('react-apexcharts')
          .then((module) => {
            if (module && module.default) {
              setChart(() => module.default);
              setIsLoading(false);
            } else {
              throw new Error('Chart module not loaded properly');
            }
          })
          .catch((error) => {
            console.error('Failed to load chart:', error);
            setHasError(true);
            setIsLoading(false);
          });
      }, 100);

      return () => clearTimeout(timer);
    } else {
      setIsLoading(false);
    }
  }, []);

  // Error state
  if (hasError) {
    return (
      <div 
        style={{ 
          width, 
          height: height === "100%" ? "300px" : height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#fed7d7',
          border: '1px solid #fc8181',
          borderRadius: '6px'
        }}
      >
        <span style={{ color: '#c53030' }}>Chart unavailable</span>
      </div>
    );
  }

  // Loading state
  if (isLoading || !Chart) {
    return (
      <div 
        style={{ 
          width, 
          height: height === "100%" ? "300px" : height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f7fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '6px'
        }}
      >
        <span style={{ color: '#718096' }}>Loading chart...</span>
      </div>
    );
  }

  // Wrap chart rendering in try-catch for additional safety
  try {
    return (
      <Chart
        ref={chartRef}
        options={options}
        series={series}
        type={type}
        width={width}
        height={height}
      />
    );
  } catch (error) {
    console.error('Chart rendering error:', error);
    return (
      <div 
        style={{ 
          width, 
          height: height === "100%" ? "300px" : height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#fed7d7',
          border: '1px solid #fc8181',
          borderRadius: '6px'
        }}
      >
        <span style={{ color: '#c53030' }}>Chart error</span>
      </div>
    );
  }
};

export default ChartWrapper;