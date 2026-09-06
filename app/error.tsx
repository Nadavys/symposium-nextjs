"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-zinc-50 px-6 text-center dark:bg-black">
      <h1 className="text-xl font-semibold text-black dark:text-zinc-50">Something went wrong</h1>
      <p className="max-w-md text-sm text-zinc-600 dark:text-zinc-400">
        An unexpected error occurred. You can try again, or head back to the home page.
      </p>
      <div className="flex gap-3">
        <button
          onClick={() => reset()}
          className="rounded-full bg-foreground px-4 py-2 text-sm text-background"
        >
          Try again
        </button>
        <a href="/" className="rounded-full border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700">
          Go home
        </a>
      </div>
    </div>
  );
}
