import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Area
} from 'recharts';
import { Box, useColorModeValue, Text } from '@chakra-ui/react';

interface ModernLineBarChartProps {
  data: any[];
  lineDataKey?: string;
  barDataKey?: string;
  xDataKey?: string;
  height?: number;
  showGrid?: boolean;
  gradientId?: string;
}

const ModernLineBarChart: React.FC<ModernLineBarChartProps> = ({
  data,
  lineDataKey = 'scans',
  barDataKey = 'sales',
  xDataKey = 'name',
  height = 350,
  showGrid = false,
  gradientId = 'colorGradient'
}) => {
  const textColor = useColorModeValue('gray.600', 'white');
  const gridColor = useColorModeValue('#E2E8F0', '#2D3748');
  const tooltipBg = useColorModeValue('white', 'gray.800');
  const tooltipBorder = useColorModeValue('gray.200', 'gray.600');

  // Custom Tooltip following Trazo design
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <Box
          bg={tooltipBg}
          p={3}
          borderRadius="lg"
          border="1px solid"
          borderColor={tooltipBorder}
          boxShadow="lg"
        >
          <Text fontSize="sm" fontWeight="semibold" color={textColor} mb={2}>
            {label}
          </Text>
          {payload.map((entry: any, index: number) => (
            <Text
              key={index}
              fontSize="xs"
              color={entry.name === 'Scans' ? 'green.500' : 'blue.500'}
            >
              {entry.name}: {entry.value}
            </Text>
          ))}
        </Box>
      );
    }
    return null;
  };

  // Custom Legend following Trazo design
  const CustomLegend = (props: any) => {
    const { payload } = props;

    // Filter out unwanted legend entries (like Area component)
    const filteredPayload = payload.filter((entry: any) => {
      const value = entry.value;
      // Only show "Ventas" and "Escaneos", exclude "scans" or any other entries
      return value === 'Ventas' || value === 'Escaneos';
    });

    return (
      <Box display="flex" justifyContent="center" gap={6} mt={4}>
        {filteredPayload.map((entry: any, index: number) => (
          <Box key={index} display="flex" alignItems="center" gap={2}>
            <Box
              w={3}
              h={3}
              borderRadius="full"
              bg={entry.color || (entry.value === 'Escaneos' ? '#4CAF50' : '#2196F3')}
            />
            <Text fontSize="sm" color={textColor}>
              {entry.value}
            </Text>
          </Box>
        ))}
      </Box>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
        <defs>
          {/* Modern gradient for area fill */}
          <linearGradient id={`${gradientId}-green`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#4CAF50" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#4CAF50" stopOpacity={0} />
          </linearGradient>
          <linearGradient id={`${gradientId}-blue`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#2196F3" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#2196F3" stopOpacity={0} />
          </linearGradient>
        </defs>

        {showGrid && (
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} opacity={0.3} vertical={false} />
        )}

        <XAxis
          dataKey={xDataKey}
          tick={{ fontSize: 12, fill: textColor }}
          tickLine={false}
          axisLine={{ stroke: gridColor, strokeWidth: 1 }}
          dy={10}
        />

        <YAxis
          tick={{ fontSize: 12, fill: textColor }}
          tickLine={false}
          axisLine={false}
          gridLines={false}
        />

        <Tooltip content={<CustomTooltip />} />
        <Legend content={<CustomLegend />} />

        {/* Modern Bar with rounded corners and gradient */}
        <Bar
          dataKey={barDataKey}
          fill="#2196F3"
          radius={[8, 8, 0, 0]}
          maxBarSize={40}
          opacity={0.9}
          name="Ventas"
        />

        {/* Modern smooth line - Primary legend entry */}
        <Line
          type="monotone"
          dataKey={lineDataKey}
          stroke="#4CAF50"
          strokeWidth={3}
          dot={{ fill: '#4CAF50', strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6 }}
          name="Escaneos"
        />

        {/* Smooth area under line for modern look - NO LEGEND */}
        <Area
          type="monotone"
          dataKey={lineDataKey}
          stroke="transparent"
          fill={`url(#${gradientId}-green)`}
          legendType="none"
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
};

export default ModernLineBarChart;
