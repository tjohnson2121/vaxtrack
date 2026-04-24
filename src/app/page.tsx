import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-zinc-50 dark:bg-zinc-950">
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-6 py-16">
        <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          VaxTrack
        </h1>
        <p className="mt-3 text-base text-zinc-600 dark:text-zinc-400">
          RSV program alignment — Ontario, Quebec, and Nova Scotia.
        </p>
        <div className="mt-10">
          <Link
            href="/coverage-check"
            className="inline-flex items-center justify-center rounded-xl bg-teal-700 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500"
          >
            Coverage check
          </Link>
        </div>
        <p className="mt-8 text-xs leading-relaxed text-zinc-500">
          Decision support only. Confirm eligibility against current provincial
          programs, product monographs, and payer policy before clinical or
          billing decisions.
        </p>
      </main>
    </div>
  );
}
