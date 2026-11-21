"use client";
import { useEffect, useState } from "react";

type Test = { slug: string; name: string; unit: string };

export default function LogTestPage() {
  const [tests, setTests] = useState<Test[]>([]);
  const [exercise, setExercise] = useState("");
  const [value, setValue] = useState("");
  const [date, setDate] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    setDate(new Date().toLocaleDateString("en-CA"));
  }, []);

  useEffect(() => {
    fetch("/api/exercises")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setTests(data);
          if (data.length > 0) setExercise(data[0].slug);
        }
      });
  }, []);

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
          {tests.map((t) => (
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