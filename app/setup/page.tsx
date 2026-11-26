"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { EQUIPMENT_OPTIONS, type Exercise } from "@/lib/setup";

function Count({ n, of }: { n: number; of: number }) {
  return <span className={`chip ${n === of ? "chip-good" : ""}`}>{`${n} of ${of} chosen`}</span>;
}

export default function SetupPage() {
  const router = useRouter();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [pickedTests, setPickedTests] = useState<string[]>([]);
  const [pickedLifts, setPickedLifts] = useState<string[]>([]);
  const [equipment, setEquipment] = useState<string[]>([]);
  const [preferBodyweight, setPreferBodyweight] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/exercises").then((r) => r.json()),
      fetch("/api/profile").then((r) => r.json()),
    ])
      .then(([ex, profile]) => {
        const tests: Exercise[] = Array.isArray(ex)
          ? ex.filter((e: Exercise) => e.kind === "test")
          : [];
        setExercises(tests);
        if (profile && Array.isArray(profile.focus_tests)) {
          const saved: string[] = profile.focus_tests;
          setPickedTests(
            tests.filter((t) => t.category !== "lift" && saved.includes(t.slug)).map((t) => t.slug)
          );
          setPickedLifts(
            tests.filter((t) => t.category === "lift" && saved.includes(t.slug)).map((t) => t.slug)
          );
          setEquipment(Array.isArray(profile.equipment) ? profile.equipment : []);
          setPreferBodyweight(profile.prefer_bodyweight === true);
        }
      })
      .catch(() => setMessage("Could not load your setup. Refresh the page to try again."));
  }, []);

  function toggle(list: string[], setList: (v: string[]) => void, slug: string, max: number) {
    if (list.includes(slug)) {
      setList(list.filter((s) => s !== slug));
    } else if (list.length < max) {
      setList([...list, slug]);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    const res = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        focus_tests: [...pickedTests, ...pickedLifts],
        equipment,
        prefer_bodyweight: preferBodyweight,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      router.push("/routine");
    } else {
      setMessage(data.error || "Something went wrong. Try again.");
      setBusy(false);
    }
  }

  const tests = exercises.filter((e) => e.category !== "lift");
  const lifts = exercises.filter((e) => e.category === "lift");
  const ready = pickedTests.length === 5 && pickedLifts.length === 2;

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 md:px-6 md:py-10">
      <h1 className="page-title">Setup</h1>
      <p className="page-sub">
        Choose what your routine focuses on. You can still log results for every test and lift, and
        you can change this at any time.
      </p>

      <form onSubmit={handleSave} className="mt-8 flex flex-col gap-10">
        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="section-title">Fitness tests</h2>
            <Count n={pickedTests.length} of={5} />
          </div>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {tests.map((e) => {
              const checked = pickedTests.includes(e.slug);
              return (
                <label key={e.slug} className="choice">
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
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="section-title">Lifts</h2>
            <Count n={pickedLifts.length} of={2} />
          </div>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {lifts.map((e) => {
              const checked = pickedLifts.includes(e.slug);
              return (
                <label key={e.slug} className="choice">
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
          <h2 className="section-title mb-1">Equipment you can use</h2>
          <p className="mb-3 text-sm text-muted">
            Routines only include exercises you can do with what you pick here.
          </p>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {EQUIPMENT_OPTIONS.map((o) => (
              <label key={o.slug} className="choice">
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
          <label className="choice mt-2.5">
            <input
              type="checkbox"
              checked={preferBodyweight}
              onChange={(e) => setPreferBodyweight(e.target.checked)}
            />
            I prefer bodyweight exercises when possible
          </label>
        </section>

        <div>
          <button type="submit" disabled={!ready || busy} className="btn btn-primary w-full sm:w-auto">
            {busy ? "Saving..." : "Save setup"}
          </button>
          {!ready && (
            <p className="mt-3 text-sm text-muted">Choose exactly 5 fitness tests and 2 lifts to save.</p>
          )}
          {message && <p className="notice notice-bad mt-3">{message}</p>}
        </div>
      </form>
    </main>
  );
}
