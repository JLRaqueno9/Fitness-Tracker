"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { chosenSlugs, loadSetup, type Exercise, type Result, type Setup } from "@/lib/setup";

type RoutineData = {
  routine: { id: number; start_date: string; review_date: string };
  items: { id: number }[];
} | null;

export default function Home() {
  const [ready, setReady] = useState(false);
  const [setup, setSetup] = useState<Setup | null>(null);
  const [all, setAll] = useState<Exercise[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [routine, setRoutine] = useState<RoutineData>(null);
  const [today, setToday] = useState("");

  useEffect(() => {
    const s = loadSetup();
    setSetup(s);
    setReady(true);
    setToday(new Date().toLocaleDateString("en-CA"));
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
    fetch("/api/routine")
      .then((r) => r.json())
      .then((d) => setRoutine(d && d.routine ? d : null));
  }, []);

  const chosen = chosenSlugs(setup);
  const mine = all.filter((e) => chosen.includes(e.slug));

  function latestText(ex: Exercise): string {
    const rs = results.filter((r) => r.exercise === ex.slug);
    const r = rs[rs.length - 1];
    if (!r) return "No result yet";
    return ex.needs_reps ? `${r.value} ${ex.unit} × ${r.reps} reps` : `${r.value} ${ex.unit}`;
  }

  const retestDue = Boolean(routine && today && routine.routine.review_date <= today);

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="mb-1 text-3xl font-bold">Fitness Test Tracker</h1>
      <p className="mb-6 opacity-80">
        Log your fitness tests, watch your progress, and get a routine to improve them.
      </p>

      {ready && !setup && (
        <section className="mb-6 rounded border p-4">
          <h2 className="mb-1 font-semibold">Start here</h2>
          <p className="mb-3">
            Pick 5 tests and 2 lifts to track, and tell us what equipment you have.
          </p>
          <Link href="/setup" className="rounded bg-blue-600 px-4 py-2 text-white">
            Set up my tracker
          </Link>
        </section>
      )}

      {setup && (
        <>
          <section className="mb-6">
            <div className="mb-2 flex items-baseline justify-between">
              <h2 className="text-lg font-semibold">Latest results</h2>
              <Link href="/track" className="text-sm underline">
                Log a result
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {mine.map((ex) => (
                <div key={ex.slug} className="rounded border p-3">
                  <p className="text-sm opacity-70">{ex.name}</p>
                  <p className="font-semibold">{latestText(ex)}</p>
                </div>
              ))}
            </div>
            <p className="mt-2 text-sm opacity-70">
              <Link href="/progress" className="underline">
                See full progress charts
              </Link>
            </p>
          </section>

          <section className="rounded border p-4">
            <h2 className="mb-1 text-lg font-semibold">Your routine</h2>
            {routine ? (
              <>
                <p>
                  {routine.items.length} exercises · retest on {routine.routine.review_date}
                </p>
                {retestDue && (
                  <p className="mt-1 font-semibold">Your review date has passed. Time to retest!</p>
                )}
              </>
            ) : (
              <p>You have not generated a routine yet.</p>
            )}
            <Link href="/routine" className="mt-3 inline-block underline">
              {routine ? "View routine" : "Generate a routine"}
            </Link>
          </section>
        </>
      )}
    </main>
  );
}
