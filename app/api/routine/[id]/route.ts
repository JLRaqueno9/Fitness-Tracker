import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { cleanItems, cleanName, getUserId, notSignedIn } from "@/lib/server";
import { isDate } from "@/lib/setup";

type Ctx = { params: Promise<{ id: string }> };

// Edit a custom routine. Generated routines can't be edited, only copied.
export async function PUT(request: Request, { params }: Ctx) {
  const userId = await getUserId();
  if (!userId) return notSignedIn();

  const { id } = await params;
  const routineId = Number(id);
  if (!Number.isInteger(routineId)) {
    return NextResponse.json({ error: "Invalid routine" }, { status: 400 });
  }

  const { data: routine } = await supabase
    .from("routines")
    .select("id, kind")
    .eq("id", routineId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!routine) {
    return NextResponse.json({ error: "Routine not found" }, { status: 404 });
  }
  if (routine.kind !== "custom") {
    return NextResponse.json(
      { error: "Only custom routines can be edited. Use Customize to make a copy." },
      { status: 400 }
    );
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const name = cleanName(body.name);
  if (!name) {
    return NextResponse.json({ error: "Give your routine a name" }, { status: 400 });
  }
  const cleaned = await cleanItems(body.items);
  if ("error" in cleaned) {
    return NextResponse.json({ error: cleaned.error }, { status: 400 });
  }

  const update: { name: string; review_date?: string } = { name };
  if (isDate(body.review_date)) update.review_date = body.review_date;

  const { error } = await supabase.from("routines").update(update).eq("id", routineId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabase.from("routine_items").delete().eq("routine_id", routineId);
  const { error: itemsError } = await supabase.from("routine_items").insert(
    cleaned.items.map((i) => ({
      routine_id: routineId,
      exercise: i.exercise,
      sets: i.sets,
      amount: i.amount,
    }))
  );

  if (itemsError) {
    return NextResponse.json({ error: itemsError.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const userId = await getUserId();
  if (!userId) return notSignedIn();

  const { id } = await params;
  const routineId = Number(id);
  if (!Number.isInteger(routineId)) {
    return NextResponse.json({ error: "Invalid routine" }, { status: 400 });
  }

  const { error } = await supabase
    .from("routines")
    .delete()
    .eq("id", routineId)
    .eq("user_id", userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
