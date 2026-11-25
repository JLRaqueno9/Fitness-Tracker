"use client";
import { useState } from "react";
import type { Exercise } from "@/lib/setup";

export type EditorPayload = {
  name: string;
  review_date: string;
  items: { exercise: string; sets: number; amount: number }[];
};

type Row = { exercise: string; sets: string; amount: string };

type Props = {
  title: string;
  supports: Exercise[];
  initial: {
    name: string;
    reviewDate: string;
    items: { exercise: string; sets: number; amount: number }[];
  };
  // returns an error message, or null when saved
  onSave: (payload: EditorPayload) => Promise<string | null>;
  onCancel: () => void;
};

export default function RoutineEditor({ title, supports, initial, onSave, onCancel }: Props) {
  const [name, setName] = useState(initial.name);
  const [reviewDate, setReviewDate] = useState(initial.reviewDate);
  const [rows, setRows] = useState<Row[]>(
    initial.items.map((i) => ({
      exercise: i.exercise,
      sets: String(i.sets),
      amount: String(i.amount),
    }))
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const bySlug: Record<string, Exercise> = {};
  for (const s of supports) bySlug[s.slug] = s;

  function update(index: number, patch: Partial<Row>) {
    setRows(rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function changeExercise(index: number, slug: string) {
    const ex = bySlug[slug];
    update(index, {
      exercise: slug,
      sets: String(ex?.default_sets ?? 3),
      amount: String(ex?.default_amount ?? 10),
    });
  }

  function addRow() {
    const ex = supports[0];
    if (!ex) return;
    setRows([
      ...rows,
      {
        exercise: ex.slug,
        sets: String(ex.default_sets ?? 3),
        amount: String(ex.default_amount ?? 10),
      },
    ]);
  }

  function removeRow(index: number) {
    setRows(rows.filter((_, i) => i !== index));
  }

  async function save() {
    setError("");
    if (!name.trim()) {
      setError("Give your routine a name");
      return;
    }
    if (rows.length === 0) {
      setError("Add at least one exercise");
      return;
    }

    const items = rows.map((r) => ({
      exercise: r.exercise,
      sets: Number(r.sets),
      amount: Number(r.amount),
    }));
    for (const i of items) {
      if (!Number.isInteger(i.sets) || i.sets < 1 || i.sets > 10) {
        setError("Sets must be a whole number from 1 to 10");
        return;
      }
      if (!Number.isInteger(i.amount) || i.amount < 1 || i.amount > 300) {
        setError("Amount must be a whole number from 1 to 300");
        return;
      }
    }

    setBusy(true);
    const problem = await onSave({ name: name.trim(), review_date: reviewDate, items });
    if (problem) {
      setError(problem);
      setBusy(false);
    }
  }

  return (
    <section className="mb-8 rounded border-2 border-blue-600 p-4">
      <h2 className="mb-3 text-lg font-semibold">{title}</h2>

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          Routine name
          <input
            type="text"
            value={name}
            maxLength={60}
            onChange={(e) => setName(e.target.value)}
            className="rounded border bg-white p-2 text-black"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Retest on
          <input
            type="date"
            value={reviewDate}
            onChange={(e) => setReviewDate(e.target.value)}
            className="rounded border bg-white p-2 text-black"
          />
        </label>
      </div>

      <ul className="flex flex-col gap-3">
        {rows.map((r, i) => {
          const ex = bySlug[r.exercise];
          return (
            <li key={i} className="flex flex-wrap items-end gap-2 rounded border p-3">
              <label className="flex min-w-48 flex-1 flex-col gap-1 text-sm">
                Exercise
                <select
                  value={r.exercise}
                  onChange={(e) => changeExercise(i, e.target.value)}
                  className="rounded border bg-white p-2 text-black"
                >
                  {supports.map((s) => (
                    <option key={s.slug} value={s.slug}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex w-20 flex-col gap-1 text-sm">
                Sets
                <input
                  type="number"
                  min="1"
                  max="10"
                  step="1"
                  value={r.sets}
                  onChange={(e) => update(i, { sets: e.target.value })}
                  className="rounded border bg-white p-2 text-black"
                />
              </label>
              <label className="flex w-28 flex-col gap-1 text-sm">
                {ex?.unit ?? "Amount"}
                <input
                  type="number"
                  min="1"
                  max="300"
                  step="1"
                  value={r.amount}
                  onChange={(e) => update(i, { amount: e.target.value })}
                  className="rounded border bg-white p-2 text-black"
                />
              </label>
              <button
                type="button"
                onClick={() => removeRow(i)}
                className="rounded border px-3 py-2 text-sm"
              >
                Remove
              </button>
            </li>
          );
        })}
      </ul>

      {rows.length === 0 && <p className="text-sm opacity-70">No exercises yet. Add one below.</p>}

      <button type="button" onClick={addRow} className="mt-3 rounded border px-3 py-2 text-sm">
        + Add exercise
      </button>

      {error && <p className="mt-3 text-red-600">{error}</p>}

      <div className="mt-4 flex gap-3">
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-40"
        >
          {busy ? "Saving..." : "Save routine"}
        </button>
        <button type="button" onClick={onCancel} className="rounded border px-4 py-2">
          Cancel
        </button>
      </div>
    </section>
  );
}
