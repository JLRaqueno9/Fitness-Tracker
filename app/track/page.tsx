"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { chosenSlugs, loadSetup, type Exercise, type Setup } from "@/lib/setup";

export default function TrackPage() {
  const [ready, setReady] = useState(false);
  const [setup, setSetup] = useState<Setup | null>(null);
  const [all, setAll] = useState<Exercise[]>([]);
  const [exercise, setExercise] = useState("");
  const [value, setValue] = useState("");
  const [reps, setReps] = useState("");
  const [date, setDate] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    setSetup(loadSetup());
    setReady(true);
    setDate(new Date().toLocaleDateString("en-CA"));
    fetch("/api/exercises")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) setAll(d);
      });
  }, []);

  const chosen = chosenSlugs(setup);
  const mine = all.filter((e) => chosen.includes(e.slug));
  const selected = mine.find((e) => e.slug === exercise) ?? mine[0];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setMessage("Saving...");
    const res = await fetch("/api/tests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ exercise: selected.slug, value, reps, testedAt: date }),
    });
    const data = await res.json();
    if (res.ok) {
      setMessage("Saved!");
      setValue("");
      setReps("");
    } else {
      setMessage(data.error || "Something went wrong");
    }
  }

  if (!ready) return null;

  if (!setup) {
    return (
      <main className="mx-auto max-w-md p-6">
        <h1 className="mb-2 text-2xl font-bold">Track</h1>
        <p className="mb-4">Choose your tests and lifts first.</p>
        <Link href="/setup" className="rounded bg-blue-600 px-4 py-2 text-white">
          Go to Setup
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="mb-4 text-2xl font-bold">Track a result</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <select
          value={selected?.slug ?? ""}
          onChange={(e) => setExercise(e.target.value)}
          className="rounded border bg-white p-2 text-black"
        >
          {mine.map((t) => (
            <option key={t.slug} value={t.slug}>
              {t.name} ({t.unit})
            </option>
          ))}
        </select>
        <input
          type="number"
          step="any"
          min="0"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={selected ? `Result (${selected.unit})` : "Result"}
          required
          className="rounded border bg-white p-2 text-black"
        />
        {selected?.needs_reps && (
          <input
            type="number"
            step="1"
            min="1"
            value={reps}
            onChange={(e) => setReps(e.target.value)}
            placeholder="Reps"
            required
            className="rounded border bg-white p-2 text-black"
          />
        )}
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded border bg-white p-2 text-black"
        />
        <button type="submit" className="rounded bg-blue-600 p-2 text-white">
          Save result
        </button>
      </form>
      <p className="mt-3">{message}</p>
    </main>
  );
}
