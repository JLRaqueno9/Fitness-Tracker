import { NextResponse, connection } from "next/server";
import { supabase } from "@/lib/supabase";



export async function GET(request: Request) {
  await connection();
  const slugs = (new URL(request.url).searchParams.get("slugs") || "")
    .split(",")
    .filter(Boolean);

  if (slugs.length === 0) {
    return NextResponse.json([]);
  }

  const { data, error } = await supabase
    .from("test_results")
    .select("id, exercise, value, reps, tested_at")
    .in("exercise", slugs)
    .order("tested_at")
    .order("id");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}
