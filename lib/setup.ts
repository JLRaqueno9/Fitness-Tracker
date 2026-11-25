export type Exercise = {
  slug: string;
  name: string;
  kind: "test" | "support";
  category: string | null;
  unit: string;
  needs_reps: boolean;
  higher_is_better: boolean | null;
  default_sets: number | null;
  default_amount: number | null;
  equipment: string;
};

export type Result = {
  id: number;
  exercise: string;
  value: number;
  reps: number | null;
  tested_at: string;
};

export type Profile = {
  focus_tests: string[];
  equipment: string[];
  prefer_bodyweight: boolean;
};

export type RoutineItem = {
  id: number;
  for_test: string | null;
  testName: string | null;
  exercise: string;
  name: string;
  unit: string;
  equipment: string;
  sets: number;
  amount: number;
  notes: string | null;
};

export type Routine = {
  id: number;
  name: string;
  kind: "generated" | "custom";
  start_date: string;
  review_date: string;
  items: RoutineItem[];
};

export const EQUIPMENT_OPTIONS = [
  { slug: "dumbbells", label: "Dumbbells" },
  { slug: "machines", label: "Gym machines (lat pulldown, leg press, cables)" },
  { slug: "pullup-bar", label: "Pull-up bar" },
  { slug: "med-ball", label: "Medicine ball" },
  { slug: "box", label: "Box or sturdy step" },
];

export function equipmentLabel(slug: string): string {
  const labels: Record<string, string> = {
    dumbbells: "dumbbells",
    machines: "gym machines",
    "pullup-bar": "a pull-up bar",
    "med-ball": "a medicine ball",
    box: "a box or step",
  };
  return labels[slug] ?? slug;
}

// Lifts are logged as weight plus reps, so progress is compared using an
// estimated one-rep max. Every other test is compared using the raw value.
export function metricOf(value: number, reps: number | null, needsReps: boolean): number {
  const v = Number(value);
  if (needsReps && reps) {
    return Math.round(v * (1 + reps / 30) * 10) / 10;
  }
  return v;
}

export function formatResult(ex: Exercise, r: Result): string {
  return ex.needs_reps && r.reps
    ? `${r.value} ${ex.unit} × ${r.reps} reps`
    : `${r.value} ${ex.unit}`;
}

export function isDate(s: unknown): s is string {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
}

export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

// Only call this inside effects and event handlers, never while rendering.
export function localToday(): string {
  return new Date().toLocaleDateString("en-CA");
}
