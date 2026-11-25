"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { chosenSlugs, loadSetup, type Setup } from "@/lib/setup";

type Item = {
  id: number;
  for_test: string;
  testName: string;
  name: string;
  sets: number;
  amount: number;
  unit: string;
  equipment: string;
};

type RoutineData = {
  routine: { id: number; start_date: string; review_date: string };
  items: Item[];
} | null;

export default function RoutinePage() {
  const [ready, setReady] = useState(false);
  const [setup, setSetup] = useState<Setup | null>(null);
  const [data, setData] = useState<RoutineData>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setSetup(loadSetup());
    setReady(true);
    fetch("/api/routine")
      .then((r) => r.json())
      .then((d) => setData(d && d.routine ? d : null));
  }, []);

  async function generate() {
    if (!setup) return;
    setBusy(true);
    setMessage("");
    const res = await fetch("/api/routine", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tests: chosenSlugs(setup),
        equipment: setup.equipment,
        preferBodyweight: setup.preferBodyweight,
      }),
    });
    const body = await res.json();
    if (!res.ok) {
      setMessage(body.error || "Something went wrong");
      setBusy(false);
      return;
    }
    if (Array.isArray(body.skipped) && body.skipped.length > 0) {
      setMessage(`No suitable exercise was found for: ${body.skipped.join(", ")}.`);
    }
    const fresh = await fetch("/api/routine").then((r) => r.json());
    setData(fresh && fresh.routine ? fresh : null);
    setBusy(false);
  }

  if (!ready) return null;

  if (!setup) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <h1 className="mb-2 text-2xl font-bold">Routine</h1>
        <p className="mb-4">Choose your tests, lifts and equipment first.</p>
        <Link href="/setup" className="rounded bg-blue-600 px-4 py-2 text-white">
          Go to Setup
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="mb-1 text-2xl font-bold">Your routine</h1>
      <p className="mb-4 opacity-80">
        One supporting exercise for each test or lift you chose, picked to match your equipment.
      </p>

      <button
        onClick={generate}
        disabled={busy}
        className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-40"
      >
        {busy ? "Building..." : data ? "Generate a new routine" : "Generate my routine"}
      </button>
      {message && <p className="mt-3">{message}</p>}

      {data && (
        <section className="mt-6">
          <p className="mb-3 text-sm opacity-80">
            Started {data.routine.start_date} · Retest on {data.routine.review_date}
          </p>
          <ul className="flex flex-col gap-3">
            {data.items.map((item) => (
              <li key={item.id} className="rounded border p-4">
                <p className="text-sm opacity-70">To improve: {item.testName}</p>
                <p className="font-semibold">{item.name}</p>
                <p>
                  {item.sets} × {item.amount} {item.unit}
                  {item.equipment !== "none" && (
                    <span className="opacity-70"> · needs {item.equipment}</span>
                  )}
                </p>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-sm opacity-70">
            This routine is a general suggestion, not medical advice. Stop if something hurts, and
            check with a doctor if you have a health condition.
          </p>
        </section>
      )}
    </main>
  );
}
