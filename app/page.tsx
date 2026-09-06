"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { getOrCreateUserId, getName } from "../lib/identity";
import { retryAfterSuffix } from "../lib/format";
import { usePanel } from "./usePanel";
import Header from "./components/Header";

export default function Home() {
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const panel = usePanel();

  async function start(e: FormEvent) {
    e.preventDefault();
    const content = question.trim();
    if (!content) return;
    setBusy(true);
    setError(null);
    try {
      const createRes = await fetch("/api/rooms", { method: "POST" });
      if (createRes.status === 429) {
        throw new Error(`too many debates started${retryAfterSuffix(createRes.headers.get("Retry-After")) || " — wait a bit and try again"}`);
      }
      if (!createRes.ok) throw new Error("failed to create room");
      const { id } = await createRes.json();

      const askRes = await fetch(`/api/rooms/${id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: getOrCreateUserId(), authorName: getName(), content }),
      });
      if (askRes.status === 429) {
        throw new Error(`too many questions${retryAfterSuffix(askRes.headers.get("Retry-After")) || " — wait a bit and try again"}`);
      }
      if (!askRes.ok) throw new Error("failed to ask");

      router.push(`/room/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "something went wrong");
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <Header
        active="home"
        meta={{ left: "", center: "", right: "" }}
      />

      <main className="mx-auto w-full max-w-2xl flex-1 px-6 flex flex-col justify-center pb-24">
        <div className="flex flex-col gap-12">
          <div>
            <h1 className="text-7xl sm:text-9xl leading-[0.9] font-heading font-semibold tracking-tighter italic mb-6">
              Symposium<span className="text-[var(--color-accent-2)]">.</span>
            </h1>
            <p className="font-heading text-2xl sm:text-3xl leading-snug opacity-70 max-w-[20ch]">
              Four philosophers debate your question in real-time.
            </p>
          </div>

          <form onSubmit={start} className="w-full flex flex-col gap-6">
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask the panel..."
              rows={2}
              className="w-full bg-transparent border-b-2 border-[var(--color-text)] py-4 text-2xl font-body placeholder:text-[var(--color-text)]/20 focus-visible:border-[var(--color-accent-2)] transition-colors resize-none"
            />
            
            <div className="flex items-center gap-6">
              <button
                type="submit"
                disabled={busy || !question.trim()}
                className="inline-flex h-14 items-center justify-center bg-[var(--color-text)] px-8 text-lg font-heading font-semibold text-[var(--color-bg)] hover:bg-[var(--color-accent-2)] transition-colors disabled:opacity-30"
              >
                {busy ? "STARTING..." : "BEGIN DEBATE"}
              </button>
              <a href="/rooms" className="text-xs uppercase tracking-[0.2em] font-bold opacity-40 hover:opacity-100 transition-opacity">
                Browse Rooms
              </a>
            </div>
            {error && <p className="text-sm text-[var(--color-accent-2)] font-semibold uppercase">{error}</p>}
          </form>

          <div className="flex flex-wrap gap-x-8 gap-y-2 pt-8 border-t border-[var(--color-divider)]">
            {panel.map((p) => (
              <span key={p.id} className="text-xs uppercase tracking-widest font-bold opacity-30">
                {p.name}
              </span>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
