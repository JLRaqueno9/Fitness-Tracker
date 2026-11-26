import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { ensureProfile, getUserId, notSignedIn } from "@/lib/server";

// The signed-in user's goals, one per exercise at most
export async function GET() {
  const userId = await getUserId();
  if (!userId) return notSignedIn();

  const { data, error } = await supabase
    .from("goals")
    .select("exercise, target_value, target_reps")
    .eq("user_id", userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

// Saves or replaces the goal for one exercise
export async function PUT(request: Request) {
  const userId = await getUserId();
  if (!userId) return notSignedIn();

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { exercise, value, reps } = body;

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
    return NextResponse.json({ error: "Enter a goal greater than 0" }, { status: 400 });
  }

  let repCount: number | null = null;
  if (found.needs_reps) {
    repCount = Number(reps);
    if (!Number.isInteger(repCount) || repCount < 1 || repCount > 1000) {
      return NextResponse.json({ error: "Enter the number of reps for the goal" }, { status: 400 });
    }
  }

  await ensureProfile(userId);

  const { error } = await supabase.from("goals").upsert(
    {
      user_id: userId,
      exercise,
      target_value: num,
      target_reps: repCount,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,exercise" }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

// Clears the goal for one exercise: DELETE /api/goals?exercise=wall-sit
export async function DELETE(request: Request) {
  const userId = await getUserId();
  if (!userId) return notSignedIn();

  const exercise = new URL(request.url).searchParams.get("exercise");
  if (!exercise) {
    return NextResponse.json({ error: "Missing exercise" }, { status: 400 });
  }

  const { error } = await supabase
    .from("goals")
    .delete()
    .eq("user_id", userId)
    .eq("exercise", exercise);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
