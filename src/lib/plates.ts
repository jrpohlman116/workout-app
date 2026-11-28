import { DEFAULT_PLATES_KG, DEFAULT_PLATES_LB } from './calculations';

interface PlateFields {
  unit_preference?: string;
  available_plates_lb?: number[] | null;
  available_plates_kg?: number[] | null;
}

/** The lifter's plates for their unit, or the defaults when they haven't set any. */
export function availablePlates(profile: PlateFields | null | undefined): number[] {
  const kg = profile?.unit_preference === 'kg';
  const mine = kg ? profile?.available_plates_kg : profile?.available_plates_lb;
  return mine && mine.length ? mine : kg ? DEFAULT_PLATES_KG : DEFAULT_PLATES_LB;
}

/** Plates a lifter can pick from, per unit (onboarding and More → Equipment). */
export const PLATE_OPTIONS = {
  lb: [55, 45, 35, 25, 15, 10, 5, 2.5, 1.25],
  kg: [25, 20, 15, 10, 5, 2.5, 1.25, 0.5],
} as const;

/** Plates selected by default: a standard gym set. */
export const STARTER_PLATES = {
  lb: [45, 35, 25, 10, 5, 2.5],
  kg: [25, 20, 15, 10, 5, 2.5, 1.25],
};
