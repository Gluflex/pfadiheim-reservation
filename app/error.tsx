"use client";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-zinc-50 dark:bg-zinc-950">
      <div className="max-w-md text-center">
        <h2 className="font-display text-3xl font-black tracking-tight mb-3 text-zinc-900 dark:text-zinc-100">
          Etwas ist schiefgelaufen.
        </h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6">
          Probiers nochmal. Wenn das Problem bleibt, schreib an{" "}
          <a href="mailto:af@pfadibaar.ch" className="text-emerald-700 dark:text-emerald-400 underline font-medium">
            af@pfadibaar.ch
          </a>
          .
        </p>
        <button
          onClick={reset}
          className="px-5 py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold transition-colors"
        >
          Neu laden
        </button>
      </div>
    </div>
  );
}
