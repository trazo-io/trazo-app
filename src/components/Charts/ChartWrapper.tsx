import React from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

interface ChartWrapperProps {
  options?: any;
  series?: any;
  type: string;
  width?: string | number;
  height?: string | number;
  data?: any[];
}

const ChartWrapper: React.FC<ChartWrapperProps> = ({
  type,
  width = '100%',
  height = 300,
  data = [],
  series = []
}) => {
  // Convert ApexCharts-style data to Recharts format
  const formatData = () => {
    if (data && data.length > 0) {
      return data;
    }

    // Convert series data to Recharts format
    if (series && series.length > 0) {
      const firstSeries = series[0];
      if (firstSeries && firstSeries.data) {
        return firstSeries.data.map((value: number, index: number) => ({
          name: `Point ${index + 1}`,
          value: value,
          uv: value,
          pv: value
        }));
      }
    }

    // Default sample data
    return [
      { name: 'Jan', value: 400, uv: 400, pv: 240 },
      { name: 'Feb', value: 300, uv: 300, pv: 139 },
      { name: 'Mar', value: 200, uv: 200, pv: 980 },
      { name: 'Apr', value: 278, uv: 278, pv: 390 },
      { name: 'May', value: 189, uv: 189, pv: 480 }
    ];
  };

  const chartData = formatData();

  const renderChart = () => {
    switch (type.toLowerCase()) {
      case 'bar':
        return (
          <ResponsiveContainer width={width} height={height}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#2E7D32" />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'line':
      case 'area':
        return (
          <ResponsiveContainer width={width} height={height}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="#2E7D32" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        );

      default:
        return (
          <ResponsiveContainer width={width} height={height}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#2E7D32" />
            </BarChart>
          </ResponsiveContainer>
        );
    }
  };

  try {
    return <div style={{ width, height }}>{renderChart()}</div>;
  } catch (error) {
    console.error('Chart rendering error:', error);
    return (
      <div
        style={{
          width,
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f7fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '6px'
        }}
      >
        <span style={{ color: '#718096' }}>Chart unavailable</span>
      </div>
    );
  }
};

export default ChartWrapper;
