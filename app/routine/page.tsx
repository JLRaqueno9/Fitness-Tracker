"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import RoutineEditor, { type EditorPayload } from "@/components/RoutineEditor";
import {
  addDays,
  equipmentLabel,
  localToday,
  type Exercise,
  type Profile,
  type Routine,
} from "@/lib/setup";

type Editing = {
  key: number;
  id: number | null;
  title: string;
  initial: {
    name: string;
    reviewDate: string;
    items: { exercise: string; sets: number; amount: number }[];
  };
};

export default function RoutinePage() {
  const [supports, setSupports] = useState<Exercise[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [today, setToday] = useState("");
  const [loaded, setLoaded] = useState(false);

  async function loadRoutines() {
    const res = await fetch("/api/routine");
    const data = await res.json();
    if (Array.isArray(data)) setRoutines(data);
  }

  useEffect(() => {
    setToday(localToday());
    Promise.all([
      fetch("/api/exercises").then((r) => r.json()),
      fetch("/api/profile").then((r) => r.json()),
      fetch("/api/routine").then((r) => r.json()),
    ])
      .then(([ex, pr, ro]) => {
        if (Array.isArray(ex)) setSupports(ex.filter((e: Exercise) => e.kind === "support"));
        if (pr && Array.isArray(pr.focus_tests)) setProfile(pr);
        if (Array.isArray(ro)) setRoutines(ro);
      })
      .catch(() => setMessage("Could not load your routines"))
      .finally(() => setLoaded(true));
  }, []);

  const setupDone = profile !== null && profile.focus_tests.length === 7;

  async function generate() {
    setBusy(true);
    setMessage("");
    const res = await fetch("/api/routine", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "generate", today: localToday() }),
    });
    const body = await res.json();
    if (!res.ok) {
      setMessage(body.error || "Something went wrong");
      setBusy(false);
      return;
    }
    if (Array.isArray(body.skipped) && body.skipped.length > 0) {
      setMessage(
        `No suitable exercise was found for: ${body.skipped.join(", ")}. Check your equipment in Setup.`
      );
    }
    await loadRoutines();
    setBusy(false);
  }

  function openNew() {
    setEditing({
      key: Date.now(),
      id: null,
      title: "Build your own routine",
      initial: { name: "My routine", reviewDate: addDays(localToday(), 28), items: [] },
    });
  }

  function openCopy(r: Routine) {
    setEditing({
      key: Date.now(),
      id: null,
      title: "Customize a copy of this routine",
      initial: {
        name: `${r.name} (my version)`.slice(0, 60),
        reviewDate: r.review_date,
        items: r.items.map((i) => ({ exercise: i.exercise, sets: i.sets, amount: i.amount })),
      },
    });
  }

  function openEdit(r: Routine) {
    setEditing({
      key: Date.now(),
      id: r.id,
      title: "Edit routine",
      initial: {
        name: r.name,
        reviewDate: r.review_date,
        items: r.items.map((i) => ({ exercise: i.exercise, sets: i.sets, amount: i.amount })),
      },
    });
  }

  async function save(payload: EditorPayload): Promise<string | null> {
    if (!editing) return null;
    const isEdit = editing.id !== null;
    const res = await fetch(isEdit ? `/api/routine/${editing.id}` : "/api/routine", {
      method: isEdit ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        isEdit ? payload : { ...payload, action: "custom", today: localToday() }
      ),
    });
    const body = await res.json();
    if (!res.ok) return body.error || "Could not save";
    setEditing(null);
    await loadRoutines();
    return null;
  }

  async function remove(r: Routine) {
    if (!window.confirm(`Delete "${r.name}"?`)) return;
    const res = await fetch(`/api/routine/${r.id}`, { method: "DELETE" });
    if (res.ok) {
      await loadRoutines();
    } else {
      const body = await res.json();
      setMessage(body.error || "Could not delete");
    }
  }

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="mb-1 text-2xl font-bold">Routines</h1>
      <p className="mb-4 opacity-80">
        Generate a routine from your setup, or build your own. You can keep as many as you like.
      </p>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={generate}
          disabled={busy || !setupDone}
          className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-40"
        >
          {busy ? "Building..." : "Generate a routine"}
        </button>
        <button onClick={openNew} className="rounded border px-4 py-2">
          Build my own
        </button>
      </div>

      {loaded && !setupDone && (
        <p className="mt-3 text-sm">
          To generate a routine,{" "}
          <Link href="/setup" className="underline">
            choose your 5 tests, 2 lifts and equipment in Setup
          </Link>
          . You can build your own routine without it.
        </p>
      )}

      {message && <p className="mt-3">{message}</p>}

      {editing && (
        <div className="mt-6">
          <RoutineEditor
            key={editing.key}
            title={editing.title}
            supports={supports}
            initial={editing.initial}
            onSave={save}
            onCancel={() => setEditing(null)}
          />
        </div>
      )}

      {loaded && routines.length === 0 && !editing && (
        <p className="mt-6 opacity-80">You don't have any routines yet.</p>
      )}

      <ul className="mt-6 flex flex-col gap-6">
        {routines.map((r) => {
          const due = today !== "" && r.review_date <= today;
          return (
            <li key={r.id} className="rounded border p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-semibold">{r.name}</h2>
                <span className="rounded bg-gray-200 px-2 py-0.5 text-xs text-black">
                  {r.kind === "custom" ? "Custom" : "Generated"}
                </span>
              </div>
              <p className="mb-3 text-sm opacity-70">
                Started {r.start_date} · Retest on {r.review_date}
                {due && " · Retest due"}
              </p>

              <ul className="flex flex-col gap-3">
                {r.items.map((i) => (
                  <li key={i.id} className="rounded border p-3">
                    {i.testName && <p className="text-xs opacity-70">To improve: {i.testName}</p>}
                    <p className="font-medium">{i.name}</p>
                    <p>
                      {i.sets} × {i.amount} {i.unit}
                      {i.equipment !== "none" && (
                        <span className="opacity-70"> · needs {equipmentLabel(i.equipment)}</span>
                      )}
                    </p>
                    {i.notes && <p className="mt-1 text-xs opacity-70">{i.notes}</p>}
                  </li>
                ))}
              </ul>

              <div className="mt-3 flex flex-wrap gap-3 text-sm">
                {r.kind === "custom" ? (
                  <button onClick={() => openEdit(r)} className="underline">
                    Edit
                  </button>
                ) : (
                  <button onClick={() => openCopy(r)} className="underline">
                    Customize a copy
                  </button>
                )}
                <button onClick={() => remove(r)} className="underline">
                  Delete
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <p className="mt-8 text-sm opacity-70">
        Routines are general suggestions, not medical advice. Stop if something hurts, and check
        with a doctor if you have a health condition.
      </p>
    </main>
  );
}
