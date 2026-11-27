"use client";
import { useState } from "react";
import { difficultyLabel, type Exercise } from "@/lib/setup";

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
      setError("Give your routine a name.");
      return;
    }
    if (rows.length === 0) {
      setError("Add at least one exercise.");
      return;
    }

    const items = rows.map((r) => ({
      exercise: r.exercise,
      sets: Number(r.sets),
      amount: Number(r.amount),
    }));
    for (const i of items) {
      if (!Number.isInteger(i.sets) || i.sets < 1 || i.sets > 10) {
        setError("Sets must be a whole number from 1 to 10.");
        return;
      }
      if (!Number.isInteger(i.amount) || i.amount < 1 || i.amount > 300) {
        setError("Amount must be a whole number from 1 to 300.");
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
    <section className="panel border-2 border-ink p-5 shadow-lg md:p-6" aria-label={title}>
      <h2 className="section-title mb-5">{title}</h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="routine-name" className="label">
            Routine name
          </label>
          <input
            id="routine-name"
            type="text"
            value={name}
            maxLength={60}
            onChange={(e) => setName(e.target.value)}
            className="field"
          />
        </div>
        <div>
          <label htmlFor="routine-retest" className="label">
            Retest on
          </label>
          <input
            id="routine-retest"
            type="date"
            value={reviewDate}
            onChange={(e) => setReviewDate(e.target.value)}
            className="field"
          />
        </div>
      </div>

      <h3 className="mb-3 mt-8 font-semibold">Exercises</h3>

      {rows.length === 0 && (
        <p className="rounded-xl border border-dashed border-line p-4 text-sm text-muted">
          No exercises yet. Add the first one below.
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {rows.map((r, i) => {
          const ex = bySlug[r.exercise];
          return (
            <li
              key={i}
              className="grid grid-cols-[1fr_1fr] items-end gap-3 rounded-xl bg-sunken p-3 sm:grid-cols-[1fr_5rem_11rem_auto]"
            >
              <div className="col-span-2 sm:col-span-1">
                <label htmlFor={`ex-${i}`} className="label">
                  Exercise
                </label>
                <select
                  id={`ex-${i}`}
                  value={r.exercise}
                  onChange={(e) => changeExercise(i, e.target.value)}
                  className="field"
                >
                  {supports.map((s) => (
                    <option key={s.slug} value={s.slug}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor={`sets-${i}`} className="label">
                  Sets
                </label>
                <input
                  id={`sets-${i}`}
                  type="number"
                  inputMode="numeric"
                  min="1"
                  max="10"
                  step="1"
                  value={r.sets}
                  onChange={(e) => update(i, { sets: e.target.value })}
                  className="field"
                />
              </div>
              <div>
                <label htmlFor={`amount-${i}`} className="label">
                  Amount
                </label>
                <div className="field-wrap">
                  <input
                    id={`amount-${i}`}
                    type="number"
                    inputMode="numeric"
                    min="1"
                    max="300"
                    step="1"
                    value={r.amount}
                    onChange={(e) => update(i, { amount: e.target.value })}
                    className="field"
                  />
                  <span className="field-unit">{ex?.unit ?? ""}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => removeRow(i)}
                className="btn-quiet btn-danger col-span-2 justify-self-end sm:col-span-1 sm:self-center"
              >
                Remove
              </button>
              {ex?.instructions && (
                <p className="col-span-2 -mt-1 text-sm text-muted sm:col-span-4">
                  {difficultyLabel(ex.difficulty) ? `${difficultyLabel(ex.difficulty)}. ` : ""}
                  {ex.instructions}
                </p>
              )}
            </li>
          );
        })}
      </ul>

      <button type="button" onClick={addRow} className="btn btn-outline btn-sm mt-4">
        Add exercise
      </button>

      {error && (
        <p role="alert" className="notice notice-bad mt-5">
          {error}
        </p>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        <button type="button" onClick={save} disabled={busy} className="btn btn-primary">
          {busy ? "Saving..." : "Save routine"}
        </button>
        <button type="button" onClick={onCancel} className="btn btn-outline">
          Cancel
        </button>
      </div>
    </section>
  );
}
