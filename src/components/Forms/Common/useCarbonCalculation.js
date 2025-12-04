import { useState, useCallback } from 'react';
import { useCalculateEventCarbonImpactMutation } from 'store/api/carbonApi';
import { EVENT_TYPE_MAP, FALLBACK_CARBON_SCORES } from './EventTypeConfiguration';

export const useCarbonCalculation = (parcelId, establishmentId) => {
  const [carbonCalculation, setCarbonCalculation] = useState(null);
  const [isCalculatingCarbon, setIsCalculatingCarbon] = useState(false);
  const [shouldShowCarbonTips, setShouldShowCarbonTips] = useState(false);

  const [calculateCarbonImpact] = useCalculateEventCarbonImpactMutation();

  const calculateCarbonWithDebounce = useCallback(
    async (formData, eventType) => {
      if (!formData || Object.keys(formData).length === 0) {
        setCarbonCalculation(null);
        setShouldShowCarbonTips(false);
        return;
      }

      const timeoutId = setTimeout(async () => {
        try {
          setIsCalculatingCarbon(true);

          const event_type = EVENT_TYPE_MAP[eventType] || 'general';

          const event_data = {
            ...formData,
            date: formData.date || new Date().toISOString().slice(0, 16),
            event_type: event_type,
            parcel_id: parseInt(parcelId || '0'),
            establishment_id: parseInt(establishmentId || '0')
          };

          console.log('🚀 CARBON PREVIEW: Sending calculation request', {
            event_type,
            event_data,
            note: 'Fixed API structure to match backend expectations'
          });

          const result = await calculateCarbonImpact({
            event_type,
            event_data
          }).unwrap();

          console.log('✅ CARBON PREVIEW: Received calculation result', {
            result,
            co2e: result.co2e,
            note: 'This should now match backend calculations'
          });

          setCarbonCalculation(result);
          setShouldShowCarbonTips(true);
        } catch (error) {
          console.error('Carbon calculation failed:', error);

          // CRITICAL FIX: Don't show misleading fallback values
          // Instead, show transparent error state
          setCarbonCalculation({
            error: true,
            calculation_unavailable: true,
            calculation_method: 'api_unavailable',
            event_type: EVENT_TYPE_MAP[eventType] || 'general',
            timestamp: new Date().toISOString(),
            message: 'Carbon calculation temporarily unavailable',
            transparency_note: 'Event will still be documented for transparency tracking',
            retry_available: true
          });
          setShouldShowCarbonTips(false); // Don't show tips when calculation failed
        } finally {
          setIsCalculatingCarbon(false);
        }
      }, 500);

      return () => clearTimeout(timeoutId);
    },
    [calculateCarbonImpact, parcelId, establishmentId]
  );

  const resetCalculation = useCallback(() => {
    setCarbonCalculation(null);
    setIsCalculatingCarbon(false);
    setShouldShowCarbonTips(false);
  }, []);

  return {
    carbonCalculation,
    isCalculatingCarbon,
    shouldShowCarbonTips,
    calculateCarbonWithDebounce,
    resetCalculation
  };
};
