import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const EXERCISES = ["pushups", "plank", "run"];

export async function POST(request: Request) {
  const { exercise, value, testedAt } = await request.json();

  if (!EXERCISES.includes(exercise)) {
    return NextResponse.json({ error: "Unknown exercise" }, { status: 400 });
  }

  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) {
    return NextResponse.json({ error: "Enter a positive number" }, { status: 400 });
  }

  const date = testedAt || new Date().toISOString().slice(0, 10);

  const { error } = await supabase
    .from("test_results")
    .insert({ exercise, value: num, tested_at: date });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true }, { status: 201 });
}