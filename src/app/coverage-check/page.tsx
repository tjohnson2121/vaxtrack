import { CoverageCheckForm } from "@/components/CoverageCheckForm";

export default function CoverageCheckPage() {
  return (
    <main className="mx-auto max-w-3xl flex-1 px-4 py-12">
      <header className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          RSV coverage check
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Ontario, Quebec, and Nova Scotia.
        </p>
      </header>
      <CoverageCheckForm />
    </main>
  );
}
