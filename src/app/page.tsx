import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-zinc-50 dark:bg-zinc-950">
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-6 py-16">
        <p className="text-sm font-medium text-teal-700 dark:text-teal-400">
          Pharmacist workflow · V0 pilot
        </p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          VaxTrack
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
          Structured public vaccine coverage checks with confidence and
          rationale. This build covers{" "}
          <strong className="text-zinc-800 dark:text-zinc-200">RSV</strong> in{" "}
          <strong className="text-zinc-800 dark:text-zinc-200">
            Ontario, Quebec, and Nova Scotia
          </strong>
          .
        </p>
        <div className="mt-10">
          <Link
            href="/coverage-check"
            className="inline-flex items-center justify-center rounded-xl bg-teal-700 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500"
          >
            Open coverage check
          </Link>
        </div>
        <p className="mt-8 text-xs text-zinc-500">
          Rules are encoded for demonstration; validate against official
          program pages before clinical or billing use.
        </p>
      </main>
    </div>
  );
}
