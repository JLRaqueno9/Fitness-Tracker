"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";

const links = [
  { href: "/", label: "Overview" },
  { href: "/track", label: "Track" },
  { href: "/progress", label: "Progress" },
  { href: "/routine", label: "Routine" },
  { href: "/setup", label: "Setup" },
];

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname === "/login") return null;

  async function signOut() {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <nav className="border-b">
      <div className="mx-auto flex max-w-3xl flex-wrap gap-4 p-4">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="font-medium hover:underline">
            {l.label}
          </Link>
        ))}
        <button onClick={signOut} className="ml-auto font-medium hover:underline">
          Log out
        </button>
      </div>
    </nav>
  );
}