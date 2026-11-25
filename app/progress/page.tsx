"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import LineChart from "@/components/LineChart";
import {
  chosenSlugs,
  loadSetup,
  metric,
  type Exercise,
  type Result,
  type Setup,
} from "@/lib/setup";

export default function ProgressPage() {
  const [ready, setReady] = useState(false);
  const [setup, setSetup] = useState<Setup | null>(null);
  const [all, setAll] = useState<Exercise[]>([]);
  const [results, setResults] = useState<Result[]>([]);

  useEffect(() => {
    const s = loadSetup();
    setSetup(s);
    setReady(true);
    fetch("/api/exercises")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) setAll(d);
      });
    const slugs = chosenSlugs(s);
    if (slugs.length > 0) {
      fetch(`/api/results?slugs=${slugs.join(",")}`)
        .then((r) => r.json())
        .then((d) => {
          if (Array.isArray(d)) setResults(d);
        });
    }
  }, []);

  if (!ready) return null;

  if (!setup) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <h1 className="mb-2 text-2xl font-bold">Progress</h1>
        <p className="mb-4">Choose your tests and lifts first.</p>
        <Link href="/setup" className="rounded bg-blue-600 px-4 py-2 text-white">
          Go to Setup
        </Link>
      </main>
    );
  }

  const chosen = chosenSlugs(setup);
  const mine = all.filter((e) => chosen.includes(e.slug));

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="mb-1 text-2xl font-bold">Progress</h1>
      <p className="mb-6 opacity-80">
        Lifts show an estimated one-rep max, worked out from your weight and reps.
      </p>

      <div className="grid gap-6 sm:grid-cols-2">
        {mine.map((ex) => {
          const rs = results.filter((r) => r.exercise === ex.slug);
          const points = rs.map((r) => ({ label: r.tested_at, value: metric(r, ex) }));
          const unitLabel = ex.needs_reps ? "lb (estimated 1-rep max)" : ex.unit;
          const first = points[0];
          const latest = points[points.length - 1];
          const change = first && latest ? Math.round((latest.value - first.value) * 10) / 10 : 0;
          const improving = ex.higher_is_better === false ? change < 0 : change > 0;

          return (
            <section key={ex.slug} className="rounded border p-4">
              <h2 className="font-semibold">{ex.name}</h2>
              <p className="mb-2 text-sm opacity-70">{unitLabel}</p>
              <LineChart points={points} />
              {latest ? (
                <p className="mt-2 text-sm">
                  Latest: <strong>{latest.value}</strong>
                  {points.length > 1 && (
                    <span>
                      {" "}
                      · Change since first: {change > 0 ? "+" : ""}
                      {change}
                      {change !== 0 && (improving ? " (improving)" : " (not improving yet)")}
                    </span>
                  )}
                </p>
              ) : (
                <p className="mt-2 text-sm">
                  <Link href="/track" className="underline">
                    Log your first result
                  </Link>
                </p>
              )}
            </section>
          );
        })}
      </div>
    </main>
  );
}
