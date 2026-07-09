"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NavBar() {
  const pathname = usePathname();

  const linkClass = (href) =>
    `px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
      pathname === href
        ? "bg-brand text-white"
        : "text-inkfaint hover:text-ink hover:bg-black/5"
    }`;

  return (
    <header className="border-b border-line bg-card">
      <div className="mx-auto max-w-5xl px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gold text-white font-display text-sm">
            N
          </span>
          <span className="font-display text-lg tracking-tight">
            Natimpo <span className="text-brand">Points</span>
          </span>
        </Link>
        <nav className="flex items-center gap-1">
          <Link href="/" className={linkClass("/")}>
            Payout run
          </Link>
          <Link href="/map" className={linkClass("/map")}>
            Shop &amp; manager map
          </Link>
        </nav>
      </div>
    </header>
  );
}
