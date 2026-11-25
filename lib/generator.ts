import { metricOf } from "./setup";

export type TestInfo = {
  slug: string;
  name: string;
  higher_is_better: boolean | null;
  needs_reps: boolean;
};

export type SupportInfo = {
  id: number;
  slug: string;
  unit: string;
  default_sets: number | null;
  default_amount: number | null;
  equipment: string;
};

export type ResultRow = {
  exercise: string;
  value: number;
  reps: number | null;
  tested_at: string;
};

export type PrevItem = {
  exercise: string;
  sets: number;
  amount: number;
  start_date: string;
};

export type Pick = {
  for_test: string;
  exercise: string;
  sets: number;
  amount: number;
  notes: string;
};

export type BuildInput = {
  tests: TestInfo[];
  links: { test_slug: string; support_slug: string }[];
  supports: Record<string, SupportInfo>;
  equipment: string[];
  preferBodyweight: boolean;
  results: ResultRow[];
  previous: Record<string, PrevItem>;
};

type Status = "improved" | "not_improved" | "no_data";

// Compares the user's result on a test before and after their last routine.
export function assess(test: TestInfo, results: ResultRow[], since: string): Status {
  const rs = results.filter((r) => r.exercise === test.slug);
  rs.sort((a, b) => (a.tested_at < b.tested_at ? -1 : a.tested_at > b.tested_at ? 1 : 0));

  const before = rs.filter((r) => r.tested_at <= since);
  const after = rs.filter((r) => r.tested_at > since);
  if (after.length === 0) return "no_data";

  const m = (r: ResultRow) => metricOf(r.value, r.reps, test.needs_reps);
  const latest = m(after[after.length - 1]);

  let baseline: number;
  if (before.length > 0) {
    baseline = m(before[before.length - 1]);
  } else if (after.length > 1) {
    baseline = m(after[0]);
  } else {
    return "no_data";
  }

  const higherIsBetter = test.higher_is_better !== false;
  const better = higherIsBetter ? latest > baseline : latest < baseline;
  return better ? "improved" : "not_improved";
}

// Raise the amount by about 10 percent, but never past 1.5x the standard amount.
export function nextAmount(previous: number, standard: number | null): number {
  const base = standard ?? 10;
  const cap = Math.max(Math.round(base * 1.5), base);
  const bump = Math.max(1, Math.round(previous * 0.1));
  return Math.max(previous, Math.min(previous + bump, cap));
}

export function eligibleFor(
  testSlug: string,
  links: BuildInput["links"],
  supports: BuildInput["supports"],
  equipment: string[],
  preferBodyweight: boolean
): SupportInfo[] {
  let options = links
    .filter((l) => l.test_slug === testSlug)
    .map((l) => supports[l.support_slug])
    .filter((s): s is SupportInfo => Boolean(s));

  options = options.filter((s) => s.equipment === "none" || equipment.includes(s.equipment));

  if (preferBodyweight) {
    const bodyweight = options.filter((s) => s.equipment === "none");
    if (bodyweight.length > 0) options = bodyweight;
  }

  // fixed order: the order the exercises were added to the library
  return options.sort((a, b) => a.id - b.id);
}

export function buildRoutine(input: BuildInput): { picks: Pick[]; skipped: string[] } {
  const picks: Pick[] = [];
  const skipped: string[] = [];

  for (const test of input.tests) {
    const options = eligibleFor(
      test.slug,
      input.links,
      input.supports,
      input.equipment,
      input.preferBodyweight
    );

    if (options.length === 0) {
      skipped.push(test.name);
      continue;
    }

    const standard = (s: SupportInfo) => ({
      sets: s.default_sets ?? 3,
      amount: s.default_amount ?? 10,
    });
    const prev = input.previous[test.slug];

    if (!prev) {
      const s = options[0];
      picks.push({
        for_test: test.slug,
        exercise: s.slug,
        ...standard(s),
        notes: "First routine for this test, so we started with the standard exercise.",
      });
      continue;
    }

    const status = assess(test, input.results, prev.start_date);
    const prevIndex = options.findIndex((o) => o.slug === prev.exercise);
    const stillAvailable = prevIndex >= 0;
    const rotated = options[(prevIndex + 1) % options.length];

    if (status === "improved" && stillAvailable) {
      const s = options[prevIndex];
      picks.push({
        for_test: test.slug,
        exercise: s.slug,
        sets: prev.sets,
        amount: nextAmount(prev.amount, s.default_amount),
        notes: "Your result improved since your last routine, so we kept this exercise and raised the amount slightly.",
      });
    } else if (!stillAvailable) {
      const s = options[0];
      picks.push({
        for_test: test.slug,
        exercise: s.slug,
        ...standard(s),
        notes: "Your last exercise doesn't match your equipment settings, so this is a replacement.",
      });
    } else if (rotated.slug === prev.exercise) {
      picks.push({
        for_test: test.slug,
        exercise: prev.exercise,
        sets: prev.sets,
        amount: prev.amount,
        notes: "No other exercise matches your equipment, so we kept this one at the same amount.",
      });
    } else if (status === "not_improved") {
      picks.push({
        for_test: test.slug,
        exercise: rotated.slug,
        ...standard(rotated),
        notes: "No improvement since your last routine, so we switched to a different exercise.",
      });
    } else {
      picks.push({
        for_test: test.slug,
        exercise: rotated.slug,
        ...standard(rotated),
        notes: "No new results since your last routine, so we are trying the other exercise for variety.",
      });
    }
  }

  return { picks, skipped };
}
