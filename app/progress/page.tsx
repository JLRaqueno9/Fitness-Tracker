"use client";
import { useEffect, useState } from "react";
import LineChart from "@/components/LineChart";
import { formatResult, metricOf, type Exercise, type Result } from "@/lib/setup";

const round1 = (n: number) => Math.round(n * 10) / 10;

export default function ProgressPage() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [selected, setSelected] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/exercises").then((r) => r.json()),
      fetch("/api/results").then((r) => r.json()),
    ])
      .then(([ex, rs]) => {
        const tests: Exercise[] = Array.isArray(ex)
          ? ex.filter((e: Exercise) => e.kind === "test")
          : [];
        const list: Result[] = Array.isArray(rs) ? rs : [];
        setExercises(tests);
        setResults(list);
        const withData = tests.find((t) => list.some((r) => r.exercise === t.slug));
        setSelected((withData ?? tests[0])?.slug ?? "");
      })
      .catch(() => undefined)
      .finally(() => setLoaded(true));
  }, []);

  const rows = exercises.map((ex) => {
    const rs = results.filter((r) => r.exercise === ex.slug);
    const metrics = rs.map((r) => metricOf(r.value, r.reps, ex.needs_reps));
    const higherIsBetter = ex.higher_is_better !== false;
    const best =
      metrics.length > 0 ? (higherIsBetter ? Math.max(...metrics) : Math.min(...metrics)) : null;
    const change = metrics.length > 1 ? round1(metrics[metrics.length - 1] - metrics[0]) : null;
    const better = change === null ? null : higherIsBetter ? change > 0 : change < 0;
    return { ex, rs, metrics, best, change, better, latest: rs[rs.length - 1] };
  });

  const active = rows.find((r) => r.ex.slug === selected);

  function renderGroup(title: string, group: typeof rows) {
    return (
      <>
        <tr>
          <th colSpan={5} className="pt-4 pb-1 text-left text-xs uppercase tracking-wide opacity-60">
            {title}
          </th>
        </tr>
        {group.map((row) => (
          <tr
            key={row.ex.slug}
            className={`border-b ${row.ex.slug === selected ? "bg-blue-600/10" : ""}`}
          >
            <td className="py-2 pr-2">
              <button
                type="button"
                onClick={() => setSelected(row.ex.slug)}
                className="text-left font-medium underline-offset-2 hover:underline"
              >
                {row.ex.name}
              </button>
            </td>
            <td className="py-2 pr-2">{row.latest ? formatResult(row.ex, row.latest) : "-"}</td>
            <td className="py-2 pr-2">{row.best !== null ? `${row.best} ${row.ex.unit}` : "-"}</td>
            <td className="py-2 pr-2">
              {row.change === null ? (
                "-"
              ) : (
                <span>
                  {row.change > 0 ? "+" : ""}
                  {row.change}
                  {row.change !== 0 && (row.better ? " (better)" : " (worse)")}
                </span>
              )}
            </td>
            <td className="py-2">{row.rs.length}</td>
          </tr>
        ))}
      </>
    );
  }

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="mb-1 text-2xl font-bold">Progress</h1>
      <p className="mb-4 opacity-80">
        Every test and lift you log. Select one to see its chart and history.
      </p>

      {loaded && exercises.length === 0 && <p>Could not load your exercises.</p>}

      {exercises.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-2 pr-2">Exercise</th>
                <th className="py-2 pr-2">Latest</th>
                <th className="py-2 pr-2">Best</th>
                <th className="py-2 pr-2">Change</th>
                <th className="py-2">Entries</th>
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

      <p className="mt-3 text-sm opacity-70">
        For lifts, Best and Change use an estimated one-rep max worked out from weight and reps.
        Change compares your latest result with your first.
      </p>

      {active && (
        <section className="mt-8 rounded border p-4">
          <h2 className="font-semibold">{active.ex.name}</h2>
          <p className="mb-2 text-sm opacity-70">
            {active.ex.needs_reps ? `${active.ex.unit} (estimated 1-rep max)` : active.ex.unit}
          </p>
          <LineChart
            points={active.rs.map((r, i) => ({ label: r.tested_at, value: active.metrics[i] }))}
          />
          {active.rs.length > 0 ? (
            <ul className="mt-3 text-sm">
              {[...active.rs].reverse().map((r) => (
                <li key={r.id} className="flex justify-between border-b py-1">
                  <span>{r.tested_at}</span>
                  <span>{formatResult(active.ex, r)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm">No results logged yet.</p>
          )}
        </section>
      )}
    </main>
  );
}
