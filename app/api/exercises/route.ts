import { NextResponse, connection } from "next/server";
import { supabase } from "@/lib/supabase";

// Every test, lift and supporting exercise. Pages filter by kind.
export async function GET() {
  await connection();

  const { data, error } = await supabase
    .from("exercises")
    .select(
      "id, slug, name, kind, category, unit, needs_reps, higher_is_better, default_sets, default_amount, equipment"
    )
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("id", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}
