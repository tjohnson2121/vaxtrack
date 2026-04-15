import { CoverageCheckForm } from "@/components/CoverageCheckForm";

export default function CoverageCheckPage() {
  return (
    <main className="mx-auto max-w-3xl flex-1 px-4 py-12">
      <header className="mb-10">
        <p className="text-sm font-medium text-zinc-500">VaxTrack · V0</p>
        <h1 className="text-3xl font-bold tracking-tight">RSV coverage gap</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Ontario, Quebec, and Nova Scotia. Stack: Health Canada monograph (off-label
          excluded) → provincial payment → optional NACI-strong filter for the
          GreenShield gap. Decision support only — verify against current program
          pages and DPD before billing.
        </p>
        <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
          Last updated: April 14, 2026
        </p>
      </header>
      <CoverageCheckForm />
    </main>
  );
}
