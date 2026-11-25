import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { supabase } from "@/lib/supabase";

// Who is making this request? Reads the login cookie. Returns null if signed out.
export async function getUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const client = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          // the proxy refreshes login cookies, so nothing to do here
        },
      },
    }
  );
  const { data } = await client.auth.getClaims();
  const sub = data?.claims?.sub;
  return typeof sub === "string" ? sub : null;
}

export function notSignedIn() {
  return NextResponse.json({ error: "Not signed in" }, { status: 401 });
}

// Results and routines point at a profiles row, so make sure it exists.
export async function ensureProfile(userId: string) {
  await supabase
    .from("profiles")
    .upsert({ id: userId }, { onConflict: "id", ignoreDuplicates: true });
}

export type CleanItem = { exercise: string; sets: number; amount: number };

export async function cleanItems(
  raw: unknown
): Promise<{ items: CleanItem[] } | { error: string }> {
  if (!Array.isArray(raw) || raw.length === 0) {
    return { error: "Add at least one exercise" };
  }
  if (raw.length > 20) {
    return { error: "A routine can have at most 20 exercises" };
  }

  const items: CleanItem[] = [];
  for (const entry of raw) {
    const row = (entry ?? {}) as Record<string, unknown>;
    const exercise = typeof row.exercise === "string" ? row.exercise : "";
    const sets = Number(row.sets);
    const amount = Number(row.amount);

    if (!exercise) return { error: "Choose an exercise for every row" };
    if (!Number.isInteger(sets) || sets < 1 || sets > 10) {
      return { error: "Sets must be a whole number from 1 to 10" };
    }
    if (!Number.isInteger(amount) || amount < 1 || amount > 300) {
      return { error: "Amount must be a whole number from 1 to 300" };
    }
    items.push({ exercise, sets, amount });
  }

  const slugs = Array.from(new Set(items.map((i) => i.exercise)));
  const { data } = await supabase
    .from("exercises")
    .select("slug")
    .eq("kind", "support")
    .in("slug", slugs);

  if ((data ?? []).length !== slugs.length) {
    return { error: "One of the exercises is not valid" };
  }
  return { items };
}

export function cleanName(raw: unknown): string {
  return typeof raw === "string" ? raw.trim().slice(0, 60) : "";
}
