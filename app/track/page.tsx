"use client";
import { useEffect, useState } from "react";
import { goalStatus, localToday, summarize, type Exercise, type Goal, type Result } from "@/lib/setup";

type Status = { kind: "idle" | "saving" | "ok" | "error"; text: string };

export default function TrackPage() {
  const [tests, setTests] = useState<Exercise[]>([]);
  const [exercise, setExercise] = useState("");
  const [value, setValue] = useState("");
  const [reps, setReps] = useState("");
  const [date, setDate] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle", text: "" });

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
      .catch(() => setStatus({ kind: "error", text: "Could not load the exercise list. Refresh the page to try again." }));
  }, []);

  const selected = tests.find((t) => t.slug === exercise);
  const fitnessTests = tests.filter((t) => t.category !== "lift");
  const lifts = tests.filter((t) => t.category === "lift");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus({ kind: "saving", text: "Saving..." });
    const res = await fetch("/api/tests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ exercise, value, reps, testedAt: date }),
    });
    const data = await res.json();
    if (res.ok) {
      let text = "Result saved.";
      // If this result reaches the goal set on the Progress page, say so.
      try {
        const goals: Goal[] = await fetch("/api/goals").then((r) => r.json());
        const goal = Array.isArray(goals) ? goals.find((g) => g.exercise === exercise) : undefined;
        if (goal && selected) {
          const justNow: Result = {
            id: 0,
            exercise,
            value: Number(value),
            reps: selected.needs_reps ? Number(reps) : null,
            tested_at: date,
          };
          if (goalStatus(selected, goal, summarize(selected, [justNow])).reached) {
            text = "Result saved. Goal reached!";
          }
        }
      } catch {
        // the result is saved either way
      }
      setStatus({ kind: "ok", text });
      setValue("");
      setReps("");
    } else {
      setStatus({ kind: "error", text: data.error || "Something went wrong. Try again." });
    }
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-6 md:px-6 md:py-10">
      <h1 className="page-title">Track a result</h1>
      <p className="page-sub">Log any test or lift. Lifts take a weight and a number of reps.</p>

      <form onSubmit={handleSubmit} className="panel mt-6 flex flex-col gap-5 p-5 md:p-6">
        <div>
          <label htmlFor="exercise" className="label">
            Exercise
          </label>
          <select
            id="exercise"
            value={exercise}
            onChange={(e) => {
              setExercise(e.target.value);
              setStatus({ kind: "idle", text: "" });
            }}
            className="field"
          >
            <optgroup label="Fitness tests">
              {fitnessTests.map((t) => (
                <option key={t.slug} value={t.slug}>
                  {t.name}
                </option>
              ))}
            </optgroup>
            <optgroup label="Lifts">
              {lifts.map((t) => (
                <option key={t.slug} value={t.slug}>
                  {t.name}
                </option>
              ))}
            </optgroup>
          </select>
        </div>

        <div className={selected?.needs_reps ? "grid grid-cols-2 gap-4" : ""}>
          <div>
            <label htmlFor="value" className="label">
              {selected?.needs_reps ? "Weight" : "Result"}
            </label>
            <div className="field-wrap">
              <input
                id="value"
                type="number"
                inputMode="decimal"
                step="any"
                min="0"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                required
                className="field"
              />
              {selected && <span className="field-unit">{selected.unit}</span>}
            </div>
          </div>

          {selected?.needs_reps && (
            <div>
              <label htmlFor="reps" className="label">
                Reps
              </label>
              <div className="field-wrap">
                <input
                  id="reps"
                  type="number"
                  inputMode="numeric"
                  step="1"
                  min="1"
                  value={reps}
                  onChange={(e) => setReps(e.target.value)}
                  required
                  className="field"
                />
                <span className="field-unit">reps</span>
              </div>
            </div>
          )}
        </div>

        <div>
          <label htmlFor="date" className="label">
            Date
          </label>
          <input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="field"
          />
        </div>

        <button type="submit" disabled={status.kind === "saving"} className="btn btn-primary w-full">
          Save result
        </button>

        <div aria-live="polite">
          {status.kind === "ok" && <p className="notice notice-good">{status.text}</p>}
          {status.kind === "error" && <p className="notice notice-bad">{status.text}</p>}
        </div>
      </form>
    </main>
  );
}
