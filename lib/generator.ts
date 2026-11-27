import { metricOf, prettyDate, type ChangeType } from "./setup";

export type TestInfo = {
  slug: string;
  name: string;
  unit: string;
  higher_is_better: boolean | null;
  needs_reps: boolean;
};

export type SupportInfo = {
  id: number;
  slug: string;
  name: string;
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
  change_type: ChangeType;
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

export type Comparison = {
  status: Status;
  // the result before the last routine and the latest result, in the measure used to compare
  // results (estimated one-rep max for lifts). Both are null when status is "no_data".
  baseline: number | null;
  latest: number | null;
};

// Compares the user's result on a test before and after their last routine.
export function compare(test: TestInfo, results: ResultRow[], since: string): Comparison {
  const rs = results.filter((r) => r.exercise === test.slug);
  rs.sort((a, b) => (a.tested_at < b.tested_at ? -1 : a.tested_at > b.tested_at ? 1 : 0));

  const none: Comparison = { status: "no_data", baseline: null, latest: null };
  const before = rs.filter((r) => r.tested_at <= since);
  const after = rs.filter((r) => r.tested_at > since);
  if (after.length === 0) return none;

  const m = (r: ResultRow) => metricOf(r.value, r.reps, test.needs_reps);
  const latest = m(after[after.length - 1]);

  let baseline: number;
  if (before.length > 0) {
    baseline = m(before[before.length - 1]);
  } else if (after.length > 1) {
    baseline = m(after[0]);
  } else {
    return none;
  }

  const higherIsBetter = test.higher_is_better !== false;
  const better = higherIsBetter ? latest > baseline : latest < baseline;
  return { status: better ? "improved" : "not_improved", baseline, latest };
}

export function assess(test: TestInfo, results: ResultRow[], since: string): Status {
  return compare(test, results, since).status;
}

const fmt = (n: number) => String(Math.round(n * 10) / 10);

// "Your wall sit went from 60 to 75 seconds". Lifts compare an estimated max.
function describe(test: TestInfo, c: Comparison, verb: "improved" | "moved"): string {
  const label = test.needs_reps ? `${test.name} estimated max` : test.name;
  const from = fmt(c.baseline as number);
  const to = fmt(c.latest as number);
  if (c.baseline === c.latest) {
    return `Your ${label} stayed at ${to} ${test.unit}`;
  }
  return verb === "improved"
    ? `Your ${label} improved from ${from} to ${to} ${test.unit}`
    : `Your ${label} went from ${from} to ${to} ${test.unit}`;
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
        change_type: "new",
        notes: `This is your first routine for ${test.name}, so we started with ${s.name}.`,
      });
      continue;
    }

    const c = compare(test, input.results, prev.start_date);
    const since = prettyDate(prev.start_date, true);
    const prevName = input.supports[prev.exercise]?.name ?? "your last exercise";
    const prevIndex = options.findIndex((o) => o.slug === prev.exercise);
    const stillAvailable = prevIndex >= 0;
    const rotated = options[(prevIndex + 1) % options.length];

    if (c.status === "improved" && stillAvailable) {
      const s = options[prevIndex];
      const amount = nextAmount(prev.amount, s.default_amount);
      picks.push({
        for_test: test.slug,
        exercise: s.slug,
        sets: prev.sets,
        amount,
        change_type: "kept",
        notes:
          `${describe(test, c, "improved")} since ${since}, so we kept ${s.name}` +
          (amount > prev.amount
            ? ` and raised the amount from ${prev.amount} to ${amount} ${s.unit}.`
            : ` at ${amount} ${s.unit}, the highest amount we use for it.`),
      });
    } else if (!stillAvailable) {
      const s = options[0];
      picks.push({
        for_test: test.slug,
        exercise: s.slug,
        ...standard(s),
        change_type: "replaced",
        notes: `Because of your equipment and bodyweight settings in Setup, we replaced ${prevName} with ${s.name}.`,
      });
    } else if (rotated.slug === prev.exercise) {
      picks.push({
        for_test: test.slug,
        exercise: prev.exercise,
        sets: prev.sets,
        amount: prev.amount,
        change_type: "same",
        notes: `Only one exercise for ${test.name} matches your Setup (${prevName}), so we kept it at the same amount.`,
      });
    } else if (c.status === "not_improved") {
      picks.push({
        for_test: test.slug,
        exercise: rotated.slug,
        ...standard(rotated),
        change_type: "switched",
        notes:
          `${describe(test, c, "moved")} since ${since}, which is not an improvement, ` +
          `so we switched from ${prevName} to ${rotated.name}.`,
      });
    } else {
      picks.push({
        for_test: test.slug,
        exercise: rotated.slug,
        ...standard(rotated),
        change_type: "switched",
        notes:
          `You have not logged a new ${test.name} result since ${since}, so we could not tell whether your last exercise, ${prevName}, was working. ` +
          `We switched to ${rotated.name} for variety. Log a new result before generating to let us keep what works.`,
      });
    }
  }

  return { picks, skipped };
}
