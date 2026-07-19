import type { RepWave, WavePhase, ProfileTab } from './types';

export const DEFAULT_PROGRAM_WEEKS = 16;

// Weight display range shown on the home page workout cards (±4% of base weight)
export const WEIGHT_DISPLAY_RANGE_LOW = 0.96;
export const WEIGHT_DISPLAY_RANGE_HIGH = 1.04;

// Meet week uses a conservative 55% of TM — just enough to stay sharp
export const MEET_WEEK_TM_PCT = 0.55;

export const PHASE_LABELS: Record<WavePhase, string> = {
  accumulation:    'Accumulation',
  intensification: 'Intensification',
  realization:     'Realization',
  deload:          'Deload',
  peaking:         'Peaking',
  meet_week:       'Meet Week',
};

export const PHASE_ABBR: Record<WavePhase, string> = {
  accumulation:    'A',
  intensification: 'I',
  realization:     'R',
  deload:          'D',
  peaking:         'P',
  meet_week:       'M',
};

export const PHASE_DESCRIPTIONS: Record<WavePhase, string> = {
  accumulation:    "High volume, moderate intensity. Complete every rep — you're building your base.",
  intensification: 'Less volume, heavier loads. Push the weights and keep technique solid.',
  realization:     'Peak intensity. Your top set is max reps — stop 1 rep before failure.',
  deload:          'Reduced load. Complete all sets without grinding. This is a recovery week.',
  peaking:         'Competition prep. A heavy single, plus down sets early on — the final 2 weeks strip to singles only.',
  meet_week:       'Rest up. Keep any movement light and technical. Save everything for the platform.',
};

export const WAVE_LABELS: Record<RepWave, string> = {
  10: '10-Rep Wave',
  8:  '8-Rep Wave',
  5:  '5-Rep Wave',
  3:  '3-Rep Wave',
};

// Maps manual cycle/week numbers to Juggernaut wave/phase values (for non-meet-date users)
export const CYCLE_TO_WAVE: Record<number, RepWave>  = { 1: 10, 2: 8, 3: 5, 4: 3 };
export const WEEK_TO_PHASE: Record<number, WavePhase> = { 1: 'accumulation', 2: 'intensification', 3: 'realization', 4: 'deload' };

// Longer phase labels used in workout summary UI — include action cues unlike PHASE_LABELS
export const PHASE_DETAIL_LABELS: Record<WavePhase, string> = {
  accumulation:    'Accumulation',
  intensification: 'Intensification',
  realization:     'Realization — push the final set',
  deload:          'Deload — easy effort, no grinding',
  peaking:         'Peaking — heavy single, then down sets',
  meet_week:       'Meet Week — rest up',
};

export const MAX_ACCESSORY_EXERCISES = 7;

export const PROFILE_TAB_LABELS: Record<ProfileTab, string> = {
  body:     'Body Stats',
  maxes:    'Maxes',
  training: 'Training',
  security: 'Account',
};
