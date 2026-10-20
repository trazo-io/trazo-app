import { useEffect, useState } from 'react';

/**
 * The furthest step of a wizard the person has reached, for `StandardStepper`'s
 * `furthestStep`. A farmer who went to step 2, came back to fix the date on step 1 and then
 * found step 2 unclickable in the stepper reported it as broken: a step you have already been
 * to reads as a place you can return to.
 *
 * It only ever grows. Going back does not take a step away, and the forward click is still
 * validated by the form's own Continue (the stepper only offers the NEXT step forward).
 */
export const useFurthestStep = (currentStep: number) => {
  const [furthestStep, setFurthestStep] = useState(currentStep);
  useEffect(() => {
    setFurthestStep((furthest) => Math.max(furthest, currentStep));
  }, [currentStep]);
  return furthestStep;
};
