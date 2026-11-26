"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";

const links = [
  {
    href: "/",
    label: "Overview",
    icon: <path d="M4 11.5 12 5l8 6.5V19a1 1 0 0 1-1 1h-4v-5H9v5H5a1 1 0 0 1-1-1z" />,
  },
  {
    href: "/track",
    label: "Track",
    icon: (
      <>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 8v8M8 12h8" />
      </>
    ),
  },
  {
    href: "/progress",
    label: "Progress",
    icon: <path d="M4 19V5M4 19h16M8 15l3-4 3 2 5-6" />,
  },
  {
    href: "/routine",
    label: "Routines",
    icon: <path d="M9 6h11M9 12h11M9 18h11M4.5 6l1 1 1.8-2M4.5 12l1 1 1.8-2M4.5 18l1 1 1.8-2" />,
  },
  {
    href: "/setup",
    label: "Setup",
    icon: (
      <>
        <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
        <circle cx="16" cy="7" r="2" />
        <circle cx="8" cy="17" r="2" />
      </>
    ),
  },
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

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <>
      <header className="bg-hero text-on-hero">
        <div className="mx-auto flex min-h-14 max-w-5xl items-stretch gap-6 px-4 md:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <span aria-hidden="true" className="block h-6 w-2 rounded-sm bg-accent" />
            <span className="font-display text-2xl font-bold leading-none">Fitness Test Tracker</span>
          </Link>

          <nav aria-label="Main" className="ml-auto hidden items-stretch md:flex">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                aria-current={isActive(l.href) ? "page" : undefined}
                className={`flex items-center border-y-4 border-t-transparent px-3.5 text-sm font-semibold transition-colors ${
                  isActive(l.href)
                    ? "border-b-accent"
                    : "border-b-transparent text-hero-muted hover:text-on-hero"
                }`}
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <button
            onClick={signOut}
            className="ml-auto flex items-center rounded px-1 text-sm font-semibold text-hero-muted underline-offset-4 hover:text-on-hero hover:underline md:ml-2"
          >
            Log out
          </button>
        </div>
      </header>

      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface md:hidden"
      >
        <ul className="grid grid-cols-5">
          {links.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                aria-current={isActive(l.href) ? "page" : undefined}
                className={`flex flex-col items-center gap-1 border-t-4 pb-2 pt-1.5 text-[0.7rem] font-semibold ${
                  isActive(l.href) ? "border-t-accent text-ink" : "border-t-transparent text-muted"
                }`}
              >
                <svg
                  viewBox="0 0 24 24"
                  width="22"
                  height="22"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  {l.icon}
                </svg>
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
