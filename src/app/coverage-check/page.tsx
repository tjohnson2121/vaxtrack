import { CoverageCheckForm } from "@/components/CoverageCheckForm";

export default function CoverageCheckPage() {
  return (
    <main className="mx-auto max-w-3xl flex-1 px-4 py-12">
      <header className="mb-10">
        <p className="text-sm font-medium text-zinc-500">VaxTrack · V0</p>
        <h1 className="text-3xl font-bold tracking-tight">RSV coverage check</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Ontario, Quebec, and Nova Scotia. Decision support only — verify
          against current provincial guidance before billing.
        </p>
        <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
          Last updated: March 31, 2026
        </p>
      </header>
      <CoverageCheckForm />
    </main>
  );
}
