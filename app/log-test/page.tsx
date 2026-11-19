"use client";
import { useState } from "react";

export default function LogTestPage() {
  const [exercise, setExercise] = useState("pushups");
  const [value, setValue] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("Saving...");
    const res = await fetch("/api/tests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ exercise, value, testedAt: date }),
    });
    const data = await res.json();
    if (res.ok) {
      setMessage("Saved!");
      setValue("");
    } else {
      setMessage(data.error || "Something went wrong");
    }
  }

  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="mb-4 text-2xl font-bold">Log a test</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <select
          value={exercise}
          onChange={(e) => setExercise(e.target.value)}
          className="border p-2"
        >
          <option value="pushups">Push-ups (reps)</option>
          <option value="plank">Plank (seconds)</option>
          <option value="run">Run (minutes)</option>
        </select>
        <input
          type="number"
          step="any"
          min="0"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Result"
          required
          className="border p-2"
        />
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="border p-2"
        />
        <button type="submit" className="bg-black p-2 text-white">
          Save result
        </button>
      </form>
      <p className="mt-3">{message}</p>
    </main>
  );
}