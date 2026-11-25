import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { ensureProfile, getUserId, notSignedIn } from "@/lib/server";
import { isDate, localToday } from "@/lib/setup";

export async function POST(request: Request) {
  const userId = await getUserId();
  if (!userId) return notSignedIn();

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { exercise, value, reps, testedAt } = body;

  const { data: found } = await supabase
    .from("exercises")
    .select("slug, needs_reps")
    .eq("slug", exercise)
    .eq("kind", "test")
    .maybeSingle();

  if (!found) {
    return NextResponse.json({ error: "Unknown exercise" }, { status: 400 });
  }

  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0 || num > 100000) {
    return NextResponse.json({ error: "Enter a positive number" }, { status: 400 });
  }

  let repCount: number | null = null;
  if (found.needs_reps) {
    repCount = Number(reps);
    if (!Number.isInteger(repCount) || repCount < 1 || repCount > 1000) {
      return NextResponse.json({ error: "Enter the number of reps" }, { status: 400 });
    }
  }

  const date = isDate(testedAt) ? testedAt : localToday();

  await ensureProfile(userId);

  const { error } = await supabase
    .from("test_results")
    .insert({ user_id: userId, exercise, value: num, reps: repCount, tested_at: date });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true }, { status: 201 });
}
