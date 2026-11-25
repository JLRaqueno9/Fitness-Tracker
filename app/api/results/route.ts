import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getUserId, notSignedIn } from "@/lib/server";

// All of the signed-in user's results, for every test and lift
export async function GET() {
  const userId = await getUserId();
  if (!userId) return notSignedIn();

  const { data, error } = await supabase
    .from("test_results")
    .select("id, exercise, value, reps, tested_at")
    .eq("user_id", userId)
    .order("tested_at", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}
