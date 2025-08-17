import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
  LabelList
} from 'recharts';
import { Box, useColorModeValue, Text, HStack } from '@chakra-ui/react';

interface ModernBarChartProps {
  data: any[];
  dataKey?: string;
  xDataKey?: string;
  height?: number;
  showGrid?: boolean;
  showValues?: boolean;
  gradientColors?: boolean;
}

const ModernBarChart: React.FC<ModernBarChartProps> = ({
  data,
  dataKey = 'value',
  xDataKey = 'name',
  height = 350,
  showGrid = false,
  showValues = true,
  gradientColors = true
}) => {
  const textColor = useColorModeValue('gray.600', 'white');
  const gridColor = useColorModeValue('#E2E8F0', '#2D3748');
  const tooltipBg = useColorModeValue('white', 'gray.800');
  const tooltipBorder = useColorModeValue('gray.200', 'gray.600');

  // Generate color based on value (higher = better)
  const getBarColor = (value: number, index: number) => {
    if (!gradientColors) return '#4CAF50';
    
    // Color scale from red to yellow to green based on reputation (0-5)
    if (value >= 4.5) return '#4CAF50'; // Excellent - Green
    if (value >= 4.0) return '#81C784'; // Very Good - Light Green
    if (value >= 3.5) return '#FDD835'; // Good - Yellow
    if (value >= 3.0) return '#FFB300'; // Average - Orange
    return '#FF6B6B'; // Poor - Red
  };

  // Custom Tooltip following Trazo design
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const value = payload[0].value;
      const stars = '⭐'.repeat(Math.round(value));
      
      return (
        <Box
          bg={tooltipBg}
          p={3}
          borderRadius="lg"
          border="1px solid"
          borderColor={tooltipBorder}
          boxShadow="lg"
        >
          <Text fontSize="sm" fontWeight="semibold" color={textColor} mb={1}>
            {label}
          </Text>
          <HStack spacing={2}>
            <Text fontSize="xs" color="green.500">
              Reputación:
            </Text>
            <Text fontSize="xs" color={textColor}>
              {value.toFixed(1)} {stars}
            </Text>
          </HStack>
        </Box>
      );
    }
    return null;
  };

  // Custom label to show stars on top of bars
  const CustomLabel = (props: any) => {
    const { x, y, width, value } = props;
    const stars = Math.round(value);
    const starString = '⭐'.repeat(stars);
    
    return (
      <text
        x={x + width / 2}
        y={y - 5}
        fill={textColor}
        textAnchor="middle"
        fontSize="10"
      >
        {starString}
      </text>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        margin={{ top: 30, right: 20, bottom: 40, left: 0 }}
      >
        <defs>
          {/* Modern gradients for each reputation level */}
          <linearGradient id="greenGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#4CAF50" stopOpacity={1} />
            <stop offset="95%" stopColor="#388E3C" stopOpacity={0.9} />
          </linearGradient>
          <linearGradient id="lightGreenGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#81C784" stopOpacity={1} />
            <stop offset="95%" stopColor="#66BB6A" stopOpacity={0.9} />
          </linearGradient>
          <linearGradient id="yellowGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#FDD835" stopOpacity={1} />
            <stop offset="95%" stopColor="#F9A825" stopOpacity={0.9} />
          </linearGradient>
          <linearGradient id="orangeGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#FFB300" stopOpacity={1} />
            <stop offset="95%" stopColor="#FF8F00" stopOpacity={0.9} />
          </linearGradient>
          <linearGradient id="redGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#FF6B6B" stopOpacity={1} />
            <stop offset="95%" stopColor="#EE5A6F" stopOpacity={0.9} />
          </linearGradient>
        </defs>

        {showGrid && (
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke={gridColor} 
            opacity={0.2}
            vertical={false}
          />
        )}

        <XAxis
          dataKey={xDataKey}
          tick={{ fontSize: 11, fill: textColor }}
          tickLine={false}
          axisLine={{ stroke: gridColor, strokeWidth: 1 }}
          interval={0}
          angle={-45}
          textAnchor="end"
          height={60}
        />
        
        <YAxis
          domain={[0, 5]}
          ticks={[0, 1, 2, 3, 4, 5]}
          tick={{ fontSize: 12, fill: textColor }}
          tickLine={false}
          axisLine={false}
          label={{ 
            value: 'Reputación', 
            angle: -90, 
            position: 'insideLeft',
            style: { fontSize: 12, fill: textColor }
          }}
        />

        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />

        <Bar
          dataKey={dataKey}
          radius={[8, 8, 0, 0]}
          maxBarSize={60}
        >
          {showValues && <LabelList content={CustomLabel} position="top" />}
          {data.map((entry, index) => (
            <Cell 
              key={`cell-${index}`} 
              fill={gradientColors 
                ? `url(#${
                    entry[dataKey] >= 4.5 ? 'greenGradient' :
                    entry[dataKey] >= 4.0 ? 'lightGreenGradient' :
                    entry[dataKey] >= 3.5 ? 'yellowGradient' :
                    entry[dataKey] >= 3.0 ? 'orangeGradient' :
                    'redGradient'
                  })`
                : '#4CAF50'
              }
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

export default ModernBarChart;