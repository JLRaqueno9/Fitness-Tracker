import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import {
  cleanItems,
  cleanName,
  ensureProfile,
  getUserId,
  notSignedIn,
} from "@/lib/server";
import {
  buildRoutine,
  type PrevItem,
  type ResultRow,
  type SupportInfo,
  type TestInfo,
} from "@/lib/generator";
import { addDays, isDate, localToday } from "@/lib/setup";

type ExerciseInfo = { slug: string; name: string; unit: string; equipment: string };

// All of the user's saved routines, newest first, with exercise names filled in
export async function GET() {
  const userId = await getUserId();
  if (!userId) return notSignedIn();

  const { data: routines, error } = await supabase
    .from("routines")
    .select("id, name, kind, start_date, review_date")
    .eq("user_id", userId)
    .order("id", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = routines ?? [];
  if (rows.length === 0) {
    return NextResponse.json([]);
  }

  const { data: items, error: itemsError } = await supabase
    .from("routine_items")
    .select("id, routine_id, for_test, exercise, sets, amount, notes")
    .in(
      "routine_id",
      rows.map((r: { id: number }) => r.id)
    )
    .order("id", { ascending: true });

  if (itemsError) {
    return NextResponse.json({ error: itemsError.message }, { status: 500 });
  }

  const itemRows = items ?? [];
  const slugs = Array.from(
    new Set(
      itemRows.flatMap((i: { for_test: string | null; exercise: string }) =>
        i.for_test ? [i.for_test, i.exercise] : [i.exercise]
      )
    )
  ) as string[];

  const { data: info } = await supabase
    .from("exercises")
    .select("slug, name, unit, equipment")
    .in("slug", slugs);

  const lookup: Record<string, ExerciseInfo> = {};
  for (const e of (info ?? []) as ExerciseInfo[]) {
    lookup[e.slug] = e;
  }

  return NextResponse.json(
    rows.map((r: { id: number; name: string | null; kind: string; start_date: string; review_date: string }) => ({
      id: r.id,
      name: r.name ?? "Routine",
      kind: r.kind,
      start_date: r.start_date,
      review_date: r.review_date,
      items: itemRows
        .filter((i: { routine_id: number }) => i.routine_id === r.id)
        .map(
          (i: {
            id: number;
            for_test: string | null;
            exercise: string;
            sets: number;
            amount: number;
            notes: string | null;
          }) => ({
            id: i.id,
            for_test: i.for_test,
            testName: i.for_test ? lookup[i.for_test]?.name ?? i.for_test : null,
            exercise: i.exercise,
            name: lookup[i.exercise]?.name ?? i.exercise,
            unit: lookup[i.exercise]?.unit ?? "",
            equipment: lookup[i.exercise]?.equipment ?? "none",
            sets: i.sets,
            amount: i.amount,
            notes: i.notes,
          })
        ),
    }))
  );
}

// action "generate": build a routine from the user's setup and results
// action "custom":   save a routine the user built themselves
export async function POST(request: Request) {
  const userId = await getUserId();
  if (!userId) return notSignedIn();

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // the browser sends its own date, so evening users in North America get the right day
  const today = isDate(body.today) ? body.today : localToday();

  if (body.action === "custom") {
    const name = cleanName(body.name);
    if (!name) {
      return NextResponse.json({ error: "Give your routine a name" }, { status: 400 });
    }
    const cleaned = await cleanItems(body.items);
    if ("error" in cleaned) {
      return NextResponse.json({ error: cleaned.error }, { status: 400 });
    }
    const reviewDate = isDate(body.review_date) ? body.review_date : addDays(today, 28);

    await ensureProfile(userId);

    const { data: routine, error } = await supabase
      .from("routines")
      .insert({
        user_id: userId,
        name,
        kind: "custom",
        start_date: today,
        review_date: reviewDate,
      })
      .select("id")
      .single();

    if (error || !routine) {
      return NextResponse.json({ error: error?.message ?? "Could not save routine" }, { status: 500 });
    }

    const { error: itemsError } = await supabase.from("routine_items").insert(
      cleaned.items.map((i) => ({
        routine_id: routine.id,
        exercise: i.exercise,
        sets: i.sets,
        amount: i.amount,
      }))
    );

    if (itemsError) {
      await supabase.from("routines").delete().eq("id", routine.id);
      return NextResponse.json({ error: itemsError.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true }, { status: 201 });
  }

  if (body.action !== "generate") {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  // 1. the user's setup
  const { data: profile } = await supabase
    .from("profiles")
    .select("focus_tests, equipment, prefer_bodyweight")
    .eq("id", userId)
    .maybeSingle();

  const focus: string[] = profile?.focus_tests ?? [];
  if (focus.length !== 7) {
    return NextResponse.json(
      { error: "Choose your 5 tests and 2 lifts in Setup first" },
      { status: 400 }
    );
  }

  // 2. the exercises they chose, plus the supporting exercises linked to them
  const { data: testRows } = await supabase
    .from("exercises")
    .select("slug, name, higher_is_better, needs_reps")
    .in("slug", focus);

  const testBySlug: Record<string, TestInfo> = {};
  for (const t of (testRows ?? []) as TestInfo[]) {
    testBySlug[t.slug] = t;
  }
  const tests = focus.map((s) => testBySlug[s]).filter((t): t is TestInfo => Boolean(t));

  const { data: links, error: linksError } = await supabase
    .from("exercise_support")
    .select("test_slug, support_slug")
    .in("test_slug", focus);

  if (linksError) {
    return NextResponse.json({ error: linksError.message }, { status: 500 });
  }

  const linkRows = (links ?? []) as { test_slug: string; support_slug: string }[];
  const supportSlugs = Array.from(new Set(linkRows.map((l) => l.support_slug)));

  const { data: supportRows, error: supportError } = await supabase
    .from("exercises")
    .select("id, slug, unit, default_sets, default_amount, equipment")
    .in("slug", supportSlugs);

  if (supportError) {
    return NextResponse.json({ error: supportError.message }, { status: 500 });
  }

  const supports: Record<string, SupportInfo> = {};
  for (const s of (supportRows ?? []) as SupportInfo[]) {
    supports[s.slug] = s;
  }

  // 3. the user's own results on those tests
  const { data: resultRows } = await supabase
    .from("test_results")
    .select("exercise, value, reps, tested_at")
    .eq("user_id", userId)
    .in("exercise", focus)
    .order("tested_at", { ascending: true })
    .order("id", { ascending: true });

  // 4. what each test used in the user's most recent generated routine
  const { data: oldRoutines } = await supabase
    .from("routines")
    .select("id, start_date")
    .eq("user_id", userId)
    .eq("kind", "generated")
    .order("id", { ascending: false })
    .limit(20);

  const previous: Record<string, PrevItem> = {};
  const old = (oldRoutines ?? []) as { id: number; start_date: string }[];
  if (old.length > 0) {
    const { data: oldItems } = await supabase
      .from("routine_items")
      .select("routine_id, for_test, exercise, sets, amount")
      .in(
        "routine_id",
        old.map((r) => r.id)
      );

    for (const r of old) {
      for (const i of (oldItems ?? []) as {
        routine_id: number;
        for_test: string | null;
        exercise: string;
        sets: number;
        amount: number;
      }[]) {
        if (i.routine_id === r.id && i.for_test && !previous[i.for_test]) {
          previous[i.for_test] = {
            exercise: i.exercise,
            sets: i.sets,
            amount: i.amount,
            start_date: r.start_date,
          };
        }
      }
    }
  }

  const { picks, skipped } = buildRoutine({
    tests,
    links: linkRows,
    supports,
    equipment: profile?.equipment ?? [],
    preferBodyweight: profile?.prefer_bodyweight === true,
    results: (resultRows ?? []) as ResultRow[],
    previous,
  });

  if (picks.length === 0) {
    return NextResponse.json(
      { error: "No exercises match your equipment. Update your Setup.", skipped },
      { status: 400 }
    );
  }

  await ensureProfile(userId);

  const { data: routine, error } = await supabase
    .from("routines")
    .insert({
      user_id: userId,
      name: `Generated routine (${today})`,
      kind: "generated",
      start_date: today,
      review_date: addDays(today, 28),
    })
    .select("id")
    .single();

  if (error || !routine) {
    return NextResponse.json({ error: error?.message ?? "Could not save routine" }, { status: 500 });
  }

  const { error: itemsError } = await supabase.from("routine_items").insert(
    picks.map((p) => ({
      routine_id: routine.id,
      for_test: p.for_test,
      exercise: p.exercise,
      sets: p.sets,
      amount: p.amount,
      notes: p.notes,
    }))
  );

  if (itemsError) {
    await supabase.from("routines").delete().eq("id", routine.id);
    return NextResponse.json({ error: itemsError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, skipped }, { status: 201 });
}
