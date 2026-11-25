"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { EQUIPMENT_OPTIONS, loadSetup, saveSetup, type Exercise } from "@/lib/setup";

export default function SetupPage() {
  const router = useRouter();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [pickedTests, setPickedTests] = useState<string[]>([]);
  const [pickedLifts, setPickedLifts] = useState<string[]>([]);
  const [equipment, setEquipment] = useState<string[]>([]);
  const [preferBodyweight, setPreferBodyweight] = useState(false);

  useEffect(() => {
    fetch("/api/exercises")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) setExercises(d);
      });
    const saved = loadSetup();
    if (saved) {
      setPickedTests(saved.tests);
      setPickedLifts(saved.lifts);
      setEquipment(saved.equipment);
      setPreferBodyweight(saved.preferBodyweight);
    }
  }, []);

  function toggle(list: string[], setList: (v: string[]) => void, slug: string, max: number) {
    if (list.includes(slug)) {
      setList(list.filter((s) => s !== slug));
    } else if (list.length < max) {
      setList([...list, slug]);
    }
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    saveSetup({ tests: pickedTests, lifts: pickedLifts, equipment, preferBodyweight });
    router.push("/");
  }

  const tests = exercises.filter((e) => e.category === "fitness test");
  const lifts = exercises.filter((e) => e.category === "lift");
  const ready = pickedTests.length === 5 && pickedLifts.length === 2;

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="mb-1 text-2xl font-bold">Setup</h1>
      <p className="mb-6 opacity-80">
        Choose what you want to track and what equipment you have. You can change this at any time.
      </p>

      <form onSubmit={handleSave} className="flex flex-col gap-8">
        <section>
          <h2 className="mb-2 text-lg font-semibold">Fitness tests ({pickedTests.length}/5)</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {tests.map((e) => {
              const checked = pickedTests.includes(e.slug);
              return (
                <label key={e.slug} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={!checked && pickedTests.length >= 5}
                    onChange={() => toggle(pickedTests, setPickedTests, e.slug, 5)}
                  />
                  {e.name}
                </label>
              );
            })}
          </div>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold">Lifts ({pickedLifts.length}/2)</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {lifts.map((e) => {
              const checked = pickedLifts.includes(e.slug);
              return (
                <label key={e.slug} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={!checked && pickedLifts.length >= 2}
                    onChange={() => toggle(pickedLifts, setPickedLifts, e.slug, 2)}
                  />
                  {e.name}
                </label>
              );
            })}
          </div>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold">Equipment you can use</h2>
          <div className="flex flex-col gap-2">
            {EQUIPMENT_OPTIONS.map((o) => (
              <label key={o.slug} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={equipment.includes(o.slug)}
                  onChange={() =>
                    setEquipment(
                      equipment.includes(o.slug)
                        ? equipment.filter((s) => s !== o.slug)
                        : [...equipment, o.slug]
                    )
                  }
                />
                {o.label}
              </label>
            ))}
          </div>
          <label className="mt-4 flex items-center gap-2">
            <input
              type="checkbox"
              checked={preferBodyweight}
              onChange={(e) => setPreferBodyweight(e.target.checked)}
            />
            I prefer bodyweight exercises when possible
          </label>
        </section>

        <div>
          <button
            type="submit"
            disabled={!ready}
            className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-40"
          >
            Save setup
          </button>
          {!ready && (
            <p className="mt-2 text-sm opacity-70">Pick exactly 5 tests and 2 lifts to continue.</p>
          )}
        </div>
      </form>
    </main>
  );
}
