"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import RoutineEditor, { type EditorPayload } from "@/components/RoutineEditor";
import {
  addDays,
  changeLabel,
  difficultyLabel,
  equipmentLabel,
  localToday,
  prettyDate,
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
      .catch(() => setMessage("Could not load your routines. Refresh the page to try again."))
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
      setMessage(body.error || "Something went wrong. Try again.");
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
      title: "Customize a copy",
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
      body: JSON.stringify(isEdit ? payload : { ...payload, action: "custom", today: localToday() }),
    });
    const body = await res.json();
    if (!res.ok) return body.error || "Could not save the routine.";
    setEditing(null);
    await loadRoutines();
    return null;
  }

  async function remove(r: Routine) {
    if (!window.confirm(`Delete "${r.name}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/routine/${r.id}`, { method: "DELETE" });
    if (res.ok) {
      await loadRoutines();
    } else {
      const body = await res.json();
      setMessage(body.error || "Could not delete the routine.");
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 md:px-6 md:py-10">
      <h1 className="page-title">Routines</h1>
      <p className="page-sub">
        Generate a routine from your setup and results, or build your own. You can keep as many as
        you like.
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <button onClick={generate} disabled={busy || !setupDone} className="btn btn-primary">
          {busy ? "Building..." : "Generate a routine"}
        </button>
        <button onClick={openNew} className="btn btn-outline">
          Build my own
        </button>
      </div>

      {loaded && !setupDone && (
        <p className="notice mt-4">
          To generate a routine,{" "}
          <Link href="/setup" className="font-semibold underline underline-offset-2">
            choose your 5 tests, 2 lifts and equipment in Setup
          </Link>
          . You can build your own without it.
        </p>
      )}

      {message && (
        <p role="status" className="notice notice-bad mt-4">
          {message}
        </p>
      )}

      {editing && (
        <div className="mt-8">
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
        <div className="mt-8 rounded-2xl border border-dashed border-line p-8 text-center">
          <h2 className="section-title">No routines yet</h2>
          <p className="mx-auto mt-2 max-w-sm text-muted">
            Generate one from your setup and results, or build your own from the full exercise
            library.
          </p>
        </div>
      )}

      <ul className="mt-8 flex flex-col gap-6">
        {routines.map((r) => {
          const due = today !== "" && r.review_date <= today;
          return (
            <li key={r.id} className="panel p-5 md:p-6">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <h2 className="section-title">{r.name}</h2>
                <span className="chip">{r.kind === "custom" ? "Custom" : "Generated"}</span>
                {due && <span className="chip chip-accent">Retest due</span>}
              </div>

              <dl className="mt-2 flex flex-wrap gap-x-8 gap-y-1 text-sm">
                <div className="flex gap-2">
                  <dt className="text-muted">Started</dt>
                  <dd className="font-semibold">{prettyDate(r.start_date, true)}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="text-muted">Retest on</dt>
                  <dd className="font-semibold">{prettyDate(r.review_date, true)}</dd>
                </div>
              </dl>

              <ul className="mt-5">
                {r.items.map((i) => (
                  <li
                    key={i.id}
                    className="flex items-start justify-between gap-4 border-t border-line py-3.5"
                  >
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-semibold leading-snug">
                        {i.name}
                        {difficultyLabel(i.difficulty) && (
                          <span className={`chip chip-level-${i.difficulty}`}>
                            {difficultyLabel(i.difficulty)}
                          </span>
                        )}
                      </p>
                      {i.instructions && (
                        <p className="mt-1 max-w-prose text-sm">{i.instructions}</p>
                      )}
                      {i.testName && <p className="mt-1 text-sm text-muted">To improve: {i.testName}</p>}
                      {i.equipment !== "none" && (
                        <p className="text-sm text-muted">Needs {equipmentLabel(i.equipment)}</p>
                      )}
                      {i.notes && (
                        <p className={`reason mt-2 ${i.change_type ? `reason-${i.change_type}` : ""}`}>
                          {changeLabel(i.change_type) && (
                            <span className="mb-1 block text-xs font-bold">{changeLabel(i.change_type)}</span>
                          )}
                          {i.notes}
                        </p>
                      )}
                    </div>
                    <p className="shrink-0 text-right font-display text-3xl font-bold leading-none tabular-nums">
                      {i.sets} × {i.amount}
                      <span className="mt-1 block font-sans text-xs font-semibold text-muted">{i.unit}</span>
                    </p>
                  </li>
                ))}
              </ul>

              <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
                {r.kind === "custom" ? (
                  <button onClick={() => openEdit(r)} className="btn-quiet">
                    Edit
                  </button>
                ) : (
                  <button onClick={() => openCopy(r)} className="btn-quiet">
                    Customize a copy
                  </button>
                )}
                <button onClick={() => remove(r)} className="btn-quiet btn-danger">
                  Delete
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <p className="mt-10 max-w-prose text-sm text-muted">
        Routines are general suggestions, not medical advice. Stop if something hurts, and check with
        a doctor if you have a health condition.
      </p>
    </main>
  );
}
