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

  useEffect(() => {
    // Only import on client side
    if (typeof window !== 'undefined') {
      import('react-apexcharts')
        .then((module) => {
          setChart(() => module.default);
          setIsLoading(false);
        })
        .catch((error) => {
          console.error('Failed to load chart:', error);
          setIsLoading(false);
        });
    }
  }, []);

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
};

export default ChartWrapper;