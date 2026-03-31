declare module './CarbonSummaryCard' {
  import * as React from 'react';
  export interface CarbonSummaryCardProps {
    farmId: number | string;
  }
  const CarbonSummaryCard: React.FC<CarbonSummaryCardProps>;
  export default CarbonSummaryCard;
}
