export function calculateOneRepMax(weight: number, reps: number): number {
  return Math.round(weight * (1 + reps / 30));
}

export function calculateTrainingMax(oneRepMax: number): number {
  return Math.round(oneRepMax * 0.9);
}

export function getCycleProgression(cycle: number, type: string): number {
  if (type === 'bench' || type === 'ohp') {
    return (cycle - 1) * 5;
  }
  return (cycle - 1) * 10;
}

export function calculateWorkoutWeights(
  type: string,
  oneRepMax: number,
  cycle: number,
  week: number
): { set1: number; set2: number; set3: number } {
  const trainingMax = calculateTrainingMax(oneRepMax) + getCycleProgression(cycle, type);

  if (week === 1) {
    return {
      set1: Math.round(trainingMax * 0.65 / 5) * 5,
      set2: Math.round(trainingMax * 0.75 / 5) * 5,
      set3: Math.round(trainingMax * 0.85 / 5) * 5,
    };
  } else if (week === 2) {
    return {
      set1: Math.round(trainingMax * 0.70 / 5) * 5,
      set2: Math.round(trainingMax * 0.80 / 5) * 5,
      set3: Math.round(trainingMax * 0.90 / 5) * 5,
    };
  } else if (week === 3) {
    return {
      set1: Math.round(trainingMax * 0.75 / 5) * 5,
      set2: Math.round(trainingMax * 0.85 / 5) * 5,
      set3: Math.round(trainingMax * 0.95 / 5) * 5,
    };
  } else {
    return {
      set1: Math.round(trainingMax * 0.40 / 5) * 5,
      set2: Math.round(trainingMax * 0.50 / 5) * 5,
      set3: Math.round(trainingMax * 0.60 / 5) * 5,
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
    e = 4.731582e-5;
    f = -9.054e-8;
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

  const wilksCoefficient = 500 / denominator;

  return Math.round((total * wilksCoefficient) * 100) / 100;
}

export function calculateWilks2Score(
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
    a = -125.4255398;
    b = 13.71219419;
    c = -0.03307250631;
    d = -0.001050400051;
    e = 9.38773881462799e-6;
    f = -2.3334613884954e-8;
  } else {
    a = 47.46178854;
    b = 8.472061379;
    c = 0.07369410346;
    d = -0.001395833811;
    e = 7.07665973070743e-6;
    f = -1.20804336482315e-8;
  }

  const denominator = a + b * bodyweight + c * Math.pow(bodyweight, 2) +
    d * Math.pow(bodyweight, 3) + e * Math.pow(bodyweight, 4) +
    f * Math.pow(bodyweight, 5);

  const wilks2Coefficient = 600 / denominator;

  return Math.round((total * wilks2Coefficient) * 100) / 100;
}

export function calculateDOTSScore(
  squatMax: number,
  benchMax: number,
  deadliftMax: number,
  bodyweight: number,
  gender: string
): number {
  if (bodyweight <= 0) return 0;

  const total = squatMax + benchMax + deadliftMax;

  let a, b, c, d, e;

  if (gender === 'female') {
    a = -57.96288;
    b = 13.6175032;
    c = -0.1126655495;
    d = 0.0005158568;
    e = -0.0000010706;
  } else {
    a = -307.75076;
    b = 24.0900756;
    c = -0.1918759221;
    d = 0.0007391293;
    e = -0.000001093;
  }

  const denominator = a + b * bodyweight + c * Math.pow(bodyweight, 2) +
    d * Math.pow(bodyweight, 3) + e * Math.pow(bodyweight, 4);

  const dotsCoefficient = 500 / denominator;

  return Math.round((total * dotsCoefficient) * 100) / 100;
}

export function calculateIPFGLScore(
  squatMax: number,
  benchMax: number,
  deadliftMax: number,
  bodyweight: number,
  gender: string
): number {
  if (bodyweight <= 0) return 0;

  const total = squatMax + benchMax + deadliftMax;

  let a, b, c;

  if (gender === 'female') {
    a = 610.32796;
    b = 1045.59282;
    c = 0.03048;
  } else {
    a = 1199.72839;
    b = 1025.18162;
    c = 0.00921;
  }

  const denominator = (a - b * Math.exp(-c * bodyweight));

  const ipfglPoints = 100 / denominator;

  return Math.round((total * ipfglPoints) * 100) / 100;
}

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}
