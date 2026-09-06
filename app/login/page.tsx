"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { setName } from "../../lib/identity";

export default function LoginPage() {
  const [name, setNameInput] = useState("");
  const [passcode, setPasscode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error === "wrong passcode" ? "wrong passcode" : "failed to log in");
      }
      if (name.trim()) setName(name.trim());
      const next = new URLSearchParams(window.location.search).get("next") || "/";
      router.push(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6">
      <form onSubmit={submit} className="w-full max-w-sm flex flex-col gap-4">
        <h1 className="text-2xl font-semibold m-0">Symposium</h1>
        <p className="text-muted text-sm m-0">This is a private demo — enter the passcode to continue.</p>

        <div className="flex flex-col gap-1">
          <label htmlFor="name" className="text-xs text-[var(--color-text)]/70">
            Your name
          </label>
          <input
            id="name"
            value={name}
            onChange={(e) => setNameInput(e.target.value)}
            placeholder="Guest"
            className="rounded-[var(--radius-md)] border border-[var(--color-divider)] bg-[var(--color-surface)] p-3 text-base focus-visible:border-[var(--color-accent)]"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="passcode" className="text-xs text-[var(--color-text)]/70">
            Passcode
          </label>
          <input
            id="passcode"
            type="password"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            autoFocus
            className="rounded-[var(--radius-md)] border border-[var(--color-divider)] bg-[var(--color-surface)] p-3 text-base focus-visible:border-[var(--color-accent)]"
          />
        </div>

        <button
          type="submit"
          disabled={busy || !passcode.trim()}
          className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-accent)] px-[var(--space-4)] font-semibold text-[var(--color-bg)] hover:bg-[var(--color-accent-600)] active:bg-[var(--color-accent-700)] disabled:opacity-45"
        >
          {busy ? "Checking…" : "Enter"}
        </button>
        {error && <p className="text-sm text-[var(--color-accent-2)] m-0">{error}</p>}
      </form>
    </div>
  );
}
