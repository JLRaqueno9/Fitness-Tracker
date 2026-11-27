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
  difficulty: number | null;
  instructions: string | null;
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
  // how this item came to be in a generated routine; null for custom routines and older items
  change_type: ChangeType | null;
  difficulty: number | null;
  instructions: string | null;
};

export type ChangeType = "new" | "kept" | "switched" | "replaced" | "same";

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

export function prettyDate(date: string, withYear = false): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: withYear ? "numeric" : undefined,
    timeZone: "UTC",
  });
}

export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(to) - Date.parse(from)) / 86400000);
}

export type Summary = {
  rs: Result[];
  metrics: number[];
  latest: Result | undefined;
  best: number | null;
  change: number | null;
  // true = moving the right way, false = moving the wrong way, null = no change or not enough data
  better: boolean | null;
};

export function summarize(ex: Exercise, all: Result[]): Summary {
  const rs = all.filter((r) => r.exercise === ex.slug);
  const metrics = rs.map((r) => metricOf(r.value, r.reps, ex.needs_reps));
  const higherIsBetter = ex.higher_is_better !== false;
  const best =
    metrics.length > 0 ? (higherIsBetter ? Math.max(...metrics) : Math.min(...metrics)) : null;
  const change =
    metrics.length > 1 ? Math.round((metrics[metrics.length - 1] - metrics[0]) * 10) / 10 : null;
  const better = change === null || change === 0 ? null : higherIsBetter ? change > 0 : change < 0;
  return { rs, metrics, latest: rs[rs.length - 1], best, change, better };
}

export type Goal = {
  exercise: string;
  target_value: number;
  target_reps: number | null;
};

export type GoalStatus = {
  // the goal, in the same measure used to compare results (estimated one-rep max for lifts)
  target: number;
  reached: boolean;
  // 0 to 100, how far the best result is from the goal, measured from the first result
  percent: number;
};

// A goal is reached when the best result is at or past it:
// at or above for most tests, at or below for tests where lower is better.
// Lifts compare the estimated one-rep max, the same as the progress chart.
export function goalStatus(ex: Exercise, goal: Goal, s: Summary): GoalStatus {
  const target = metricOf(goal.target_value, goal.target_reps, ex.needs_reps);
  const higherIsBetter = ex.higher_is_better !== false;
  const best = s.best;
  const reached = best !== null && (higherIsBetter ? best >= target : best <= target);

  let percent = 0;
  if (reached) {
    percent = 100;
  } else if (s.metrics.length > 0) {
    const start = s.metrics[0];
    const span = target - start;
    const done = (best ?? start) - start;
    percent = span === 0 ? 0 : Math.max(0, Math.min(100, Math.round((done / span) * 100)));
  }
  return { target, reached, percent };
}

export function formatGoal(ex: Exercise, goal: Goal): string {
  return ex.needs_reps && goal.target_reps
    ? `${goal.target_value} ${ex.unit} × ${goal.target_reps} reps`
    : `${goal.target_value} ${ex.unit}`;
}

export function difficultyLabel(level: number | null): string | null {
  if (level === 1) return "Beginner";
  if (level === 2) return "Intermediate";
  if (level === 3) return "Advanced";
  return null;
}

export function changeLabel(type: ChangeType | null): string | null {
  switch (type) {
    case "new":
      return "New";
    case "kept":
      return "Kept and increased";
    case "switched":
      return "Switched";
    case "replaced":
      return "Replaced";
    case "same":
      return "Kept the same";
    default:
      return null;
  }
}
