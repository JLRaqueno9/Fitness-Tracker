"use client";
import { useEffect, useState } from "react";
import LineChart from "@/components/LineChart";
import {
  formatGoal,
  formatResult,
  goalStatus,
  prettyDate,
  summarize,
  type Exercise,
  type Goal,
  type Result,
} from "@/lib/setup";

type Note = { kind: "ok" | "error"; text: string };

export default function ProgressPage() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [selected, setSelected] = useState("");
  const [loaded, setLoaded] = useState(false);

  const [goalValue, setGoalValue] = useState("");
  const [goalReps, setGoalReps] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<Note | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/exercises").then((r) => r.json()),
      fetch("/api/results").then((r) => r.json()),
      fetch("/api/goals").then((r) => r.json()),
    ])
      .then(([ex, rs, gs]) => {
        const tests: Exercise[] = Array.isArray(ex)
          ? ex.filter((e: Exercise) => e.kind === "test")
          : [];
        const list: Result[] = Array.isArray(rs) ? rs : [];
        setExercises(tests);
        setResults(list);
        setGoals(Array.isArray(gs) ? gs : []);
        const withData = tests.find((t) => list.some((r) => r.exercise === t.slug));
        setSelected((withData ?? tests[0])?.slug ?? "");
      })
      .catch(() => undefined)
      .finally(() => setLoaded(true));
  }, []);

  const goalFor = (slug: string) => goals.find((g) => g.exercise === slug);
  const rows = exercises.map((ex) => {
    const s = summarize(ex, results);
    const g = goalFor(ex.slug);
    return { ex, s, g, gs: g ? goalStatus(ex, g, s) : null };
  });
  const active = rows.find((r) => r.ex.slug === selected);

  // Fill the goal form with the saved goal whenever another exercise is selected.
  useEffect(() => {
    const g = goals.find((x) => x.exercise === selected);
    setGoalValue(g ? String(g.target_value) : "");
    setGoalReps(g?.target_reps ? String(g.target_reps) : "");
    setNote(null);
    // goals is left out on purpose: saving a goal should not reset the form
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  async function saveGoal(e: React.FormEvent) {
    e.preventDefault();
    if (!active) return;
    setBusy(true);
    setNote(null);
    const res = await fetch("/api/goals", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ exercise: active.ex.slug, value: goalValue, reps: goalReps }),
    });
    const data = await res.json();
    if (res.ok) {
      const saved: Goal = {
        exercise: active.ex.slug,
        target_value: Number(goalValue),
        target_reps: active.ex.needs_reps ? Number(goalReps) : null,
      };
      setGoals([...goals.filter((g) => g.exercise !== saved.exercise), saved]);
      setNote({ kind: "ok", text: "Goal saved." });
    } else {
      setNote({ kind: "error", text: data.error || "Could not save the goal. Try again." });
    }
    setBusy(false);
  }

  async function clearGoal() {
    if (!active) return;
    setBusy(true);
    setNote(null);
    const res = await fetch(`/api/goals?exercise=${encodeURIComponent(active.ex.slug)}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setGoals(goals.filter((g) => g.exercise !== active.ex.slug));
      setGoalValue("");
      setGoalReps("");
      setNote({ kind: "ok", text: "Goal cleared." });
    } else {
      setNote({ kind: "error", text: "Could not clear the goal. Try again." });
    }
    setBusy(false);
  }

  function renderGroup(title: string, group: typeof rows) {
    return (
      <>
        <tr className="group">
          <td colSpan={6}>{title}</td>
        </tr>
        {group.map(({ ex, s, g, gs }) => (
          <tr
            key={ex.slug}
            className={`row cursor-pointer ${ex.slug === selected ? "selected" : ""}`}
            onClick={() => setSelected(ex.slug)}
          >
            <td>
              <button
                type="button"
                onClick={() => setSelected(ex.slug)}
                aria-pressed={ex.slug === selected}
                className="text-left font-semibold"
              >
                {ex.name}
              </button>
            </td>
            <td>{s.latest ? formatResult(ex, s.latest) : <span className="text-muted">No result</span>}</td>
            <td className="hidden sm:table-cell">
              {g && gs ? (
                <span className="flex flex-wrap items-center gap-2">
                  {formatGoal(ex, g)}
                  {gs.reached && <span className="chip chip-good">Reached</span>}
                </span>
              ) : (
                <span className="text-muted">-</span>
              )}
            </td>
            <td className="hidden sm:table-cell">
              {s.best !== null ? `${s.best} ${ex.unit}` : <span className="text-muted">-</span>}
            </td>
            <td>
              {s.change === null || s.better === null ? (
                <span className="text-muted">-</span>
              ) : (
                <span className={`chip ${s.better ? "chip-good" : "chip-bad"}`}>
                  {s.change > 0 ? "+" : ""}
                  {s.change}
                  <span className="sr-only">{s.better ? " better" : " worse"}</span>
                </span>
              )}
            </td>
            <td className="hidden text-muted sm:table-cell">{s.rs.length}</td>
          </tr>
        ))}
      </>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 md:px-6 md:py-10">
      <h1 className="page-title">Progress</h1>
      <p className="page-sub">
        Every test and lift you log. Select one to see its chart and history, and to set a goal.
      </p>

      {loaded && exercises.length === 0 && (
        <p className="notice notice-bad mt-6">
          Could not load your exercises. Refresh the page to try again.
        </p>
      )}

      {exercises.length > 0 && (
        <div className="panel mt-6 overflow-x-auto">
          <table className="score">
            <thead>
              <tr>
                <th>Exercise</th>
                <th>Latest</th>
                <th className="hidden sm:table-cell">Goal</th>
                <th className="hidden sm:table-cell">Best</th>
                <th>Change</th>
                <th className="hidden sm:table-cell">Entries</th>
              </tr>
            </thead>
            <tbody>
              {renderGroup(
                "Fitness tests",
                rows.filter((r) => r.ex.category !== "lift")
              )}
              {renderGroup(
                "Lifts",
                rows.filter((r) => r.ex.category === "lift")
              )}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-3 max-w-prose text-sm text-muted">
        Change compares your latest result with your first. A goal is reached when your best result
        is at or past it: at or above it, or at or below it for tests where a lower number is
        better. For lifts, Best, Change and goals use an estimated one-rep max worked out from weight
        and reps.
      </p>

      {active && (
        <section className="panel mt-8 p-5 md:p-6">
          <h2 className="section-title">{active.ex.name}</h2>
          <p className="mb-4 mt-1 text-sm text-muted">
            {active.ex.needs_reps
              ? `Estimated one-rep max, in ${active.ex.unit}`
              : `Measured in ${active.ex.unit}`}
            {active.ex.higher_is_better === false ? ". A lower number is better." : ""}
          </p>

          <LineChart
            unit={active.ex.unit}
            goal={active.gs?.target ?? null}
            points={active.s.rs.map((r, i) => ({ label: r.tested_at, value: active.s.metrics[i] }))}
          />

          <div className="mt-6 max-w-xl border-t border-line pt-5">
            <h3 className="font-semibold">Goal</h3>

            {active.g && active.gs && (
              <div className="mt-3">
                <p className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="text-muted">Your goal</span>
                  <span className="font-semibold">{formatGoal(active.ex, active.g)}</span>
                  {active.gs.reached && <span className="chip chip-good">Goal reached</span>}
                </p>
                <div
                  className={`goal-bar mt-2 ${active.gs.reached ? "reached" : ""}`}
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={active.gs.percent}
                  aria-label="Progress toward your goal"
                >
                  <span style={{ width: `${active.gs.percent}%` }} />
                </div>
                <p className="mt-1.5 text-sm text-muted">
                  {active.gs.reached
                    ? "You have reached this goal. Set a higher one to keep going."
                    : active.s.rs.length === 0
                      ? "Log a result to start measuring progress toward this goal."
                      : `${active.gs.percent}% of the way from your first result.`}
                </p>
              </div>
            )}

            <form onSubmit={saveGoal} className="mt-4 flex flex-wrap items-end gap-3">
              <div className="w-40">
                <label htmlFor="goal-value" className="label">
                  {active.ex.needs_reps ? "Target weight" : "Target"}
                </label>
                <div className="field-wrap">
                  <input
                    id="goal-value"
                    type="number"
                    inputMode="decimal"
                    step="any"
                    min="0"
                    required
                    value={goalValue}
                    onChange={(e) => setGoalValue(e.target.value)}
                    className="field"
                  />
                  <span className="field-unit">{active.ex.unit}</span>
                </div>
              </div>

              {active.ex.needs_reps && (
                <div className="w-36">
                  <label htmlFor="goal-reps" className="label">
                    Target reps
                  </label>
                  <div className="field-wrap">
                    <input
                      id="goal-reps"
                      type="number"
                      inputMode="numeric"
                      step="1"
                      min="1"
                      required
                      value={goalReps}
                      onChange={(e) => setGoalReps(e.target.value)}
                      className="field"
                    />
                    <span className="field-unit">reps</span>
                  </div>
                </div>
              )}

              <button type="submit" disabled={busy} className="btn btn-primary">
                {active.g ? "Update goal" : "Save goal"}
              </button>
              {active.g && (
                <button type="button" onClick={clearGoal} disabled={busy} className="btn btn-outline">
                  Clear goal
                </button>
              )}
            </form>

            <div aria-live="polite">
              {note && (
                <p className={`notice mt-3 ${note.kind === "ok" ? "notice-good" : "notice-bad"}`}>
                  {note.text}
                </p>
              )}
            </div>
          </div>

          {active.s.rs.length > 0 && (
            <ul className="mt-6 max-w-xl text-sm">
              {[...active.s.rs].reverse().map((r) => (
                <li key={r.id} className="flex justify-between gap-4 border-t border-line py-2.5">
                  <span className="text-muted">{prettyDate(r.tested_at, true)}</span>
                  <span className="font-semibold tabular-nums">{formatResult(active.ex, r)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </main>
  );
}
