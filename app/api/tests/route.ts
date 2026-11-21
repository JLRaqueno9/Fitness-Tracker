import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: Request) {
  const { exercise, value, testedAt } = await request.json();

  const { data: found } = await supabase
    .from("exercises")
    .select("slug")
    .eq("slug", exercise)
    .eq("kind", "test")
    .maybeSingle();

  if (!found) {
    return NextResponse.json({ error: "Unknown exercise" }, { status: 400 });
  }

  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) {
    return NextResponse.json({ error: "Enter a positive number" }, { status: 400 });
  }

  const date = testedAt || new Date().toLocaleDateString("en-CA");

  const { error } = await supabase
    .from("test_results")
    .insert({ exercise, value: num, tested_at: date });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true }, { status: 201 });
}