export function calculateOneRepMax(weight: number, reps: number): number {
  return Math.round(weight * (1 + reps / 30));
}

export function calculateTrainingMax(oneRepMax: number): number {
  return Math.round(oneRepMax * 0.9);
}

export function getCycleProgression(cycle: number): number {
  return (cycle - 1) * 10;
}

export function calculateWorkoutWeights(
  oneRepMax: number,
  cycle: number,
  week: number
): { set1: number; set2: number; set3: number } {
  const trainingMax = calculateTrainingMax(oneRepMax) + getCycleProgression(cycle);

  if (week === 1) {
    return {
      set1: Math.round(trainingMax * 0.65),
      set2: Math.round(trainingMax * 0.75),
      set3: Math.round(trainingMax * 0.85),
    };
  } else if (week === 2) {
    return {
      set1: Math.round(trainingMax * 0.70),
      set2: Math.round(trainingMax * 0.80),
      set3: Math.round(trainingMax * 0.90),
    };
  } else if (week === 3) {
    return {
      set1: Math.round(trainingMax * 0.75),
      set2: Math.round(trainingMax * 0.85),
      set3: Math.round(trainingMax * 0.95),
    };
  } else {
    return {
      set1: Math.round(trainingMax * 0.40),
      set2: Math.round(trainingMax * 0.50),
      set3: Math.round(trainingMax * 0.60),
    };
  }
}

export function getWeekSubtext(week: number): string {
  if (week === 1) return '5 reps';
  if (week === 2) return '3 reps';
  if (week === 3) return '5-3-1 reps';
  return 'deload';
}

export function calculateWilksScore(
  squatMax: number,
  benchMax: number,
  deadliftMax: number,
  bodyweight: number,
  gender: string
): number {
  if (bodyweight <= 0) return 0;

  const total = squatMax + benchMax + deadliftMax;

  let a, b, c, d, e, f;

  if (gender === 'female') {
    a = 594.31747775582;
    b = -27.23842536447;
    c = 0.82112226871;
    d = -0.00930733913;
    e = 0.00004731582;
    f = -0.00000009054;
  } else {
    a = -216.0475144;
    b = 16.2606339;
    c = -0.002388645;
    d = -0.00113732;
    e = 7.01863e-6;
    f = -1.291e-8;
  }

  const denominator = a + b * bodyweight + c * Math.pow(bodyweight, 2) +
    d * Math.pow(bodyweight, 3) + e * Math.pow(bodyweight, 4) +
    f * Math.pow(bodyweight, 5);

  const coeff = 500 / denominator;

  return Math.round((total * coeff) * 100) / 100;
}

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}
