import { NextResponse, connection } from "next/server";
import { supabase } from "@/lib/supabase";


type Support = {
  slug: string;
  unit: string;
  default_sets: number | null;
  default_amount: number | null;
  equipment: string;
};

type Info = { name: string; unit: string; equipment: string };

// Latest routine, with exercise names filled in
export async function GET() {
  await connection();
  const { data: routine, error } = await supabase
    .from("routines")
    .select("id, start_date, review_date")
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!routine) {
    return NextResponse.json(null);
  }

  const { data: items, error: itemsError } = await supabase
    .from("routine_items")
    .select("id, for_test, exercise, sets, amount")
    .eq("routine_id", routine.id)
    .order("id");

  if (itemsError) {
    return NextResponse.json({ error: itemsError.message }, { status: 500 });
  }

  const rows = items ?? [];
  const slugs = Array.from(
    new Set(rows.flatMap((i) => [i.for_test as string, i.exercise as string]))
  ).filter(Boolean);

  const { data: ex } = await supabase
    .from("exercises")
    .select("slug, name, unit, equipment")
    .in("slug", slugs);

  const lookup: Record<string, Info> = {};
  for (const e of ex ?? []) {
    lookup[e.slug as string] = e as Info;
  }

  return NextResponse.json({
    routine,
    items: rows.map((i) => ({
      id: i.id,
      for_test: i.for_test,
      exercise: i.exercise,
      sets: i.sets,
      amount: i.amount,
      testName: lookup[i.for_test]?.name ?? i.for_test,
      name: lookup[i.exercise]?.name ?? i.exercise,
      unit: lookup[i.exercise]?.unit ?? "",
      equipment: lookup[i.exercise]?.equipment ?? "none",
    })),
  });
}

// Build a new routine: one supporting exercise for each chosen test
export async function POST(request: Request) {
  const body = await request.json();

  const isString = (t: unknown): t is string => typeof t === "string";
  const tests: string[] = Array.isArray(body.tests) ? body.tests.filter(isString) : [];
  const owned: string[] = Array.isArray(body.equipment) ? body.equipment.filter(isString) : [];
  const preferBodyweight = body.preferBodyweight === true;

  if (tests.length === 0 || tests.length > 20) {
    return NextResponse.json({ error: "Choose your exercises in Setup first" }, { status: 400 });
  }

  const { data: links, error: linksError } = await supabase
    .from("exercise_support")
    .select("test_slug, support_slug")
    .in("test_slug", tests);

  if (linksError) {
    return NextResponse.json({ error: linksError.message }, { status: 500 });
  }

  const linkRows = links ?? [];
  const supportSlugs = Array.from(new Set(linkRows.map((l) => l.support_slug as string)));

  const { data: supports, error: supportsError } = await supabase
    .from("exercises")
    .select("slug, unit, default_sets, default_amount, equipment")
    .in("slug", supportSlugs);

  if (supportsError) {
    return NextResponse.json({ error: supportsError.message }, { status: 500 });
  }

  const supportBySlug: Record<string, Support> = {};
  for (const s of (supports ?? []) as Support[]) {
    supportBySlug[s.slug] = s;
  }

  const { data: names } = await supabase.from("exercises").select("slug, name").in("slug", tests);
  const nameBySlug: Record<string, string> = {};
  for (const n of names ?? []) {
    nameBySlug[n.slug as string] = n.name as string;
  }

  const picks: { for_test: string; support: Support }[] = [];
  const skipped: string[] = [];

  for (const test of tests) {
    let options: Support[] = linkRows
      .filter((l) => l.test_slug === test)
      .map((l) => supportBySlug[l.support_slug as string])
      .filter((s) => Boolean(s));

    // keep only exercises the user can do with their equipment
    options = options.filter((s) => s.equipment === "none" || owned.includes(s.equipment));

    // if they prefer bodyweight, use it whenever a bodyweight option exists
    if (preferBodyweight) {
      const bodyweight = options.filter((s) => s.equipment === "none");
      if (bodyweight.length > 0) options = bodyweight;
    }

    if (options.length === 0) {
      skipped.push(nameBySlug[test] ?? test);
      continue;
    }
    picks.push({ for_test: test, support: options[Math.floor(Math.random() * options.length)] });
  }

  if (picks.length === 0) {
    return NextResponse.json(
      { error: "No exercises match your equipment. Update your Setup.", skipped },
      { status: 400 }
    );
  }

  const start = new Date();
  const review = new Date(start.getTime() + 28 * 24 * 60 * 60 * 1000);
  const fmt = (d: Date) => d.toLocaleDateString("en-CA");

  const { data: routine, error: routineError } = await supabase
    .from("routines")
    .insert({ start_date: fmt(start), review_date: fmt(review) })
    .select("id")
    .single();

  if (routineError || !routine) {
    return NextResponse.json({ error: routineError?.message ?? "Could not save routine" }, { status: 500 });
  }

  const { error: itemsError } = await supabase.from("routine_items").insert(
    picks.map((p) => ({
      routine_id: routine.id,
      for_test: p.for_test,
      exercise: p.support.slug,
      sets: p.support.default_sets ?? 3,
      amount: p.support.default_amount ?? 10,
    }))
  );

  if (itemsError) {
    return NextResponse.json({ error: itemsError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, skipped }, { status: 201 });
}
