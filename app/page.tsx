"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import Sparkline from "@/components/Sparkline";
import {
  prettyDate,
  summarize,
  type Exercise,
  type Result,
  type Routine,
  type Summary,
} from "@/lib/setup";

function Tile({ ex, s }: { ex: Exercise; s: Summary }) {
  const lane = s.better === true ? "tile-good" : s.better === false ? "tile-bad" : "";
  const reps = ex.needs_reps && s.latest?.reps ? ` × ${s.latest.reps}` : "";

  return (
    <div className={`tile ${lane}`}>
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold leading-snug">{ex.name}</h3>
        {s.change !== null && s.better !== null && (
          <span className={`chip ${s.better ? "chip-good" : "chip-bad"}`}>
            {s.change > 0 ? "+" : ""}
            {s.change}
            <span className="sr-only">
              {s.better ? " better than your first result" : " worse than your first result"}
            </span>
          </span>
        )}
      </div>

      {s.latest ? (
        <div className="mt-3 flex items-end justify-between gap-3">
          <div>
            <p className="font-display text-4xl font-bold leading-none tabular-nums">
              {s.latest.value}
              <span className="ml-1.5 font-sans text-sm font-semibold text-muted">
                {ex.unit}
                {reps}
              </span>
            </p>
            <p className="mt-1.5 text-xs text-muted">{prettyDate(s.latest.tested_at)}</p>
          </div>
          <Sparkline values={s.metrics} />
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted">No result yet</p>
      )}
    </div>
  );
}

export default function Home() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/exercises").then((r) => r.json()),
      fetch("/api/results").then((r) => r.json()),
      fetch("/api/routine").then((r) => r.json()),
    ])
      .then(([ex, rs, ro]) => {
        if (Array.isArray(ex)) setExercises(ex.filter((e: Exercise) => e.kind === "test"));
        if (Array.isArray(rs)) setResults(rs);
        if (Array.isArray(ro)) setRoutines(ro);
      })
      .catch(() => undefined)
      .finally(() => setLoaded(true));
  }, []);

  const summaries = exercises.map((ex) => ({ ex, s: summarize(ex, results) }));
  const tested = summaries.filter((x) => x.s.latest).length;
  const newest = routines[0];

  const fitnessTests = summaries.filter((x) => x.ex.category !== "lift");
  const lifts = summaries.filter((x) => x.ex.category === "lift");

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 md:px-6 md:py-10">
      <h1 className="page-title">Overview</h1>
      <p className="page-sub">
        {loaded
          ? `${tested} of ${exercises.length} tests and lifts have a result.`
          : "Loading your results..."}
      </p>

      {loaded && results.length === 0 && (
        <section className="panel mt-6 flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="section-title">Log your first result</h2>
            <p className="mt-1 text-muted">
              Start with any test or lift. Your progress and routines build from there.
            </p>
          </div>
          <Link href="/track" className="btn btn-primary shrink-0">
            Log a result
          </Link>
        </section>
      )}

      <section className="mt-8">
        <div className="mb-4 flex items-baseline justify-between gap-4">
          <h2 className="section-title">Latest results</h2>
          <Link href="/progress" className="btn-quiet">
            See progress
          </Link>
        </div>

        <h3 className="mb-3 text-sm font-semibold text-muted">Fitness tests</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {fitnessTests.map(({ ex, s }) => (
            <Tile key={ex.slug} ex={ex} s={s} />
          ))}
        </div>

        <h3 className="mb-3 mt-8 text-sm font-semibold text-muted">Lifts</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {lifts.map(({ ex, s }) => (
            <Tile key={ex.slug} ex={ex} s={s} />
          ))}
        </div>
      </section>

      <section className="panel mt-10 flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="section-title">Routines</h2>
          {newest ? (
            <p className="mt-1 text-muted">
              {routines.length === 1 ? "1 routine saved." : `${routines.length} routines saved.`} Latest:{" "}
              <span className="font-semibold text-ink">{newest.name}</span>, with {newest.items.length}{" "}
              exercises and a retest on {prettyDate(newest.review_date, true)}.
            </p>
          ) : (
            <p className="mt-1 text-muted">
              You have no routines yet. Generate one from your setup, or build your own.
            </p>
          )}
        </div>
        <Link href="/routine" className="btn btn-outline shrink-0">
          {newest ? "View routines" : "Create a routine"}
        </Link>
      </section>
    </main>
  );
}
