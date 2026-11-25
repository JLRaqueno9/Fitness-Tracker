import { NextResponse, connection } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  await connection();

  const { data, error } = await supabase
    .from("exercises")
    .select("slug, name, unit, needs_reps, category, higher_is_better")
    .eq("kind", "test")
    .order("sort_order");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}