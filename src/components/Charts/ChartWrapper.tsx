import React, { useState, useEffect, Suspense } from 'react';

// Dynamic import for react-apexcharts to avoid SSR issues
const Chart = React.lazy(() => 
  import('react-apexcharts').then(module => ({ default: module.default }))
);

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
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // Ensure we're on the client side
    setIsClient(typeof window !== 'undefined');
  }, []);

  // Don't render on server side or until client is ready
  if (!isClient) {
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

  return (
    <Suspense fallback={
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
    }>
      <Chart
        ref={chartRef}
        options={options}
        series={series}
        type={type}
        width={width}
        height={height}
      />
    </Suspense>
  );
};

export default ChartWrapper;