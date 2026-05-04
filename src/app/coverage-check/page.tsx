import { CoverageCheckForm } from "@/components/CoverageCheckForm";

export default function CoverageCheckPage() {
  return (
    <main className="mx-auto max-w-3xl flex-1 px-4 py-12">
      <header className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Coverage check
        </h1>
      </header>
      <CoverageCheckForm />
    </main>
  );
}
