export type Exercise = {
  slug: string;
  name: string;
  unit: string;
  needs_reps: boolean;
  category: string | null;
  higher_is_better: boolean | null;
};

export type Setup = {
  tests: string[];
  lifts: string[];
  equipment: string[];
  preferBodyweight: boolean;
};

export type Result = {
  id: number;
  exercise: string;
  value: number;
  reps: number | null;
  tested_at: string;
};

const KEY = "fitness-setup-v1";

export const EQUIPMENT_OPTIONS = [
  { slug: "dumbbells", label: "Dumbbells" },
  { slug: "machines", label: "Gym machines (lat pulldown, leg press, cables)" },
  { slug: "pullup-bar", label: "Pull-up bar" },
  { slug: "med-ball", label: "Medicine ball" },
  { slug: "box", label: "Box or sturdy step" },
];

export function loadSetup(): Setup | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Setup) : null;
  } catch {
    return null;
  }
}

export function saveSetup(setup: Setup) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(setup));
  } catch {
    return;
  }
}

export function chosenSlugs(setup: Setup | null): string[] {
  return setup ? [...setup.tests, ...setup.lifts] : [];
}

// Lifts are logged as weight plus reps, so progress is compared using an
// estimated one-rep max. Everything else is compared using the raw value.
export function metric(result: Result, exercise: Exercise): number {
  const value = Number(result.value);
  if (exercise.needs_reps && result.reps) {
    return Math.round(value * (1 + result.reps / 30) * 10) / 10;
  }
  return value;
}
