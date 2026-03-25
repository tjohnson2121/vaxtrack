"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const linkClass =
  "rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100";

export function AppNav() {
  const pathname = usePathname();
  const active = (path: string) =>
    pathname === path
      ? "bg-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
      : "";

  return (
    <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto flex max-w-5xl items-center gap-1 px-4 py-3">
        <Link
          href="/"
          className={`mr-4 rounded-lg px-3 py-2 text-sm font-semibold text-teal-800 dark:text-teal-400 ${active("/")}`}
        >
          VaxTrack
        </Link>
        <nav className="flex flex-wrap gap-1">
          <Link
            href="/coverage-check"
            className={`${linkClass} ${active("/coverage-check")}`}
          >
            Coverage check
          </Link>
        </nav>
      </div>
    </header>
  );
}
