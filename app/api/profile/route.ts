import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { ensureProfile, getUserId, notSignedIn } from "@/lib/server";
import { EQUIPMENT_OPTIONS } from "@/lib/setup";

export async function GET() {
  const userId = await getUserId();
  if (!userId) return notSignedIn();

  const { data, error } = await supabase
    .from("profiles")
    .select("focus_tests, equipment, prefer_bodyweight")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    focus_tests: data?.focus_tests ?? [],
    equipment: data?.equipment ?? [],
    prefer_bodyweight: data?.prefer_bodyweight ?? false,
  });
}

// Saves which 5 tests and 2 lifts the routine focuses on, plus equipment.
export async function PUT(request: Request) {
  const userId = await getUserId();
  if (!userId) return notSignedIn();

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const isString = (v: unknown): v is string => typeof v === "string";
  const focus = Array.from(
    new Set(Array.isArray(body.focus_tests) ? body.focus_tests.filter(isString) : [])
  ) as string[];

  const { data: rows } = await supabase
    .from("exercises")
    .select("slug, category")
    .eq("kind", "test")
    .in("slug", focus);

  const found = rows ?? [];
  const testCount = found.filter((r: { category: string }) => r.category === "fitness test").length;
  const liftCount = found.filter((r: { category: string }) => r.category === "lift").length;

  if (focus.length !== 7 || found.length !== 7 || testCount !== 5 || liftCount !== 2) {
    return NextResponse.json({ error: "Choose exactly 5 tests and 2 lifts" }, { status: 400 });
  }

  const allowed = EQUIPMENT_OPTIONS.map((o) => o.slug);
  const equipment = (Array.isArray(body.equipment) ? body.equipment.filter(isString) : []).filter(
    (e: string) => allowed.includes(e)
  );

  await ensureProfile(userId);

  const { error } = await supabase.from("profiles").upsert(
    {
      id: userId,
      focus_tests: focus,
      equipment,
      prefer_bodyweight: body.prefer_bodyweight === true,
    },
    { onConflict: "id" }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
