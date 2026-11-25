import Link from "next/link";

const links = [
  { href: "/", label: "Overview" },
  { href: "/track", label: "Track" },
  { href: "/progress", label: "Progress" },
  { href: "/routine", label: "Routine" },
  { href: "/setup", label: "Setup" },
];

export default function Nav() {
  return (
    <nav className="border-b">
      <div className="mx-auto flex max-w-3xl flex-wrap gap-4 p-4">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="font-medium hover:underline">
            {l.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
