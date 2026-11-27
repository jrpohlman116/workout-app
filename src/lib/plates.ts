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
