"use client";
import { useEffect, useState } from "react";
import { localToday, type Exercise } from "@/lib/setup";

export default function TrackPage() {
  const [tests, setTests] = useState<Exercise[]>([]);
  const [exercise, setExercise] = useState("");
  const [value, setValue] = useState("");
  const [reps, setReps] = useState("");
  const [date, setDate] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    setDate(localToday());
    fetch("/api/exercises")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const list = data.filter((e: Exercise) => e.kind === "test");
          setTests(list);
          if (list.length > 0) setExercise(list[0].slug);
        }
      })
      .catch(() => setMessage("Could not load the exercise list"));
  }, []);

  const selected = tests.find((t) => t.slug === exercise);
  const fitnessTests = tests.filter((t) => t.category !== "lift");
  const lifts = tests.filter((t) => t.category === "lift");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("Saving...");
    const res = await fetch("/api/tests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ exercise, value, reps, testedAt: date }),
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

  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="mb-1 text-2xl font-bold">Track a result</h1>
      <p className="mb-4 opacity-80">Log a result for any test or lift.</p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <select
          value={exercise}
          onChange={(e) => setExercise(e.target.value)}
          className="rounded border bg-white p-2 text-black"
        >
          <optgroup label="Fitness tests">
            {fitnessTests.map((t) => (
              <option key={t.slug} value={t.slug}>
                {t.name} ({t.unit})
              </option>
            ))}
          </optgroup>
          <optgroup label="Lifts">
            {lifts.map((t) => (
              <option key={t.slug} value={t.slug}>
                {t.name} ({t.unit})
              </option>
            ))}
          </optgroup>
        </select>

        <input
          type="number"
          step="any"
          min="0"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={
            selected
              ? selected.needs_reps
                ? `Weight (${selected.unit})`
                : `Result (${selected.unit})`
              : "Result"
          }
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
