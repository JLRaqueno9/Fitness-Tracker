"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  formatResult,
  localToday,
  type Exercise,
  type Profile,
  type Result,
  type Routine,
} from "@/lib/setup";

export default function Home() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [today, setToday] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setToday(localToday());
    Promise.all([
      fetch("/api/exercises").then((r) => r.json()),
      fetch("/api/results").then((r) => r.json()),
      fetch("/api/routine").then((r) => r.json()),
      fetch("/api/profile").then((r) => r.json()),
    ])
      .then(([ex, rs, ro, pr]) => {
        if (Array.isArray(ex)) setExercises(ex.filter((e: Exercise) => e.kind === "test"));
        if (Array.isArray(rs)) setResults(rs);
        if (Array.isArray(ro)) setRoutines(ro);
        if (pr && Array.isArray(pr.focus_tests)) setProfile(pr);
      })
      .catch(() => undefined)
      .finally(() => setLoaded(true));
  }, []);

  // results arrive oldest first, so the last one for each exercise is the latest
  const latest: Record<string, Result> = {};
  for (const r of results) latest[r.exercise] = r;

  const setupDone = profile !== null && profile.focus_tests.length === 7;
  const newest = routines[0];
  const retestDue = Boolean(newest && today && newest.review_date <= today);

  function card(ex: Exercise) {
    const r = latest[ex.slug];
    return (
      <div key={ex.slug} className="rounded border p-3">
        <p className="text-sm opacity-70">{ex.name}</p>
        <p className="font-semibold">{r ? formatResult(ex, r) : "No result yet"}</p>
        {r && <p className="text-xs opacity-60">{r.tested_at}</p>}
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="mb-1 text-3xl font-bold">Fitness Test Tracker</h1>
      <p className="mb-6 opacity-80">
        Log your fitness tests and lifts, watch your progress, and get routines to improve them.
      </p>

      <section className="mb-8">
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">Latest results</h2>
          <span className="flex gap-4 text-sm">
            <Link href="/track" className="underline">
              Log a result
            </Link>
            <Link href="/progress" className="underline">
              Progress
            </Link>
          </span>
        </div>

        <h3 className="mb-2 mt-4 text-sm uppercase tracking-wide opacity-60">Fitness tests</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {exercises.filter((e) => e.category !== "lift").map(card)}
        </div>

        <h3 className="mb-2 mt-6 text-sm uppercase tracking-wide opacity-60">Lifts</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {exercises.filter((e) => e.category === "lift").map(card)}
        </div>
      </section>

      <section className="rounded border p-4">
        <h2 className="mb-1 text-lg font-semibold">Routines</h2>

        {newest ? (
          <>
            <p>
              {routines.length} saved · latest: {newest.name}, retest on {newest.review_date}
            </p>
            {retestDue && (
              <p className="mt-1 font-semibold">Your review date has passed. Time to retest!</p>
            )}
          </>
        ) : (
          <p>You don't have a routine yet.</p>
        )}

        {loaded && !setupDone && (
          <p className="mt-2 text-sm">
            To generate a routine, choose what it focuses on in{" "}
            <Link href="/setup" className="underline">
              Setup
            </Link>
            .
          </p>
        )}

        <Link href="/routine" className="mt-3 inline-block underline">
          {newest ? "View routines" : "Create a routine"}
        </Link>
      </section>
    </main>
  );
}
