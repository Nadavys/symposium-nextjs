"use client";

import { useEffect, useMemo, useState, useRef, type FormEvent } from "react";
import Image from "next/image";
import { useRoomStream } from "./useRoomStream";
import { getOrCreateUserId, getName, setName } from "../../../lib/identity";
import { usePanel } from "../../usePanel";
import Header from "../../components/Header";
import type { Message } from "../../../lib/messages";

interface Round {
  number: number;
  ask?: Message;
  turns: Message[];
}

// Groups the flat transcript into rounds for display: the very first message
// (the room's opening question) renders as the page's own headline, not a
// "guest asks" callout — every user message after it starts a new round.
function groupRounds(messages: Message[]): { firstQuestion: Message | null; rounds: Round[] } {
  if (messages.length === 0) return { firstQuestion: null, rounds: [] };
  const [first, ...rest] = messages;
  const firstQuestion = first.role === "user" ? first : null;
  const remaining = firstQuestion ? rest : messages;

  const rounds: Round[] = [];
  let current: Round | null = null;
  for (const m of remaining) {
    if (m.role === "user") {
      current = { number: rounds.length + 1, ask: m, turns: [] };
      rounds.push(current);
    } else {
      if (!current) {
        current = { number: rounds.length + 1, turns: [] };
        rounds.push(current);
      }
      current.turns.push(m);
    }
  }
  return { firstQuestion, rounds };
}

function PlateNumeral({ value }: { value: number }) {
  const label = String(value).padStart(2, "0");
  return (
    <span className="text-[40px] font-heading font-bold opacity-20">
      {label}
    </span>
  );
}

export default function RoomView({ roomId }: { roomId: string }) {
  const { messages, status, canAsk, ask, notFound, connected, rateLimited } = useRoomStream(roomId);
  const panel = usePanel();
  const portraitById = useMemo(() => Object.fromEntries(panel.map((p) => [p.id, p])), [panel]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [authorName, setAuthorName] = useState("Guest");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setUserId(getOrCreateUserId());
    setAuthorName(getName());
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length, status]);

  const { firstQuestion, rounds } = useMemo(() => groupRounds(messages), [messages]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const content = draft.trim();
    if (!content || !userId || submitting) return;
    setSubmitting(true);
    try {
      const res = await ask({ userId, authorName, content });
      if (res.ok) {
        setDraft("");
        setError(null);
      } else {
        setError(res.error ?? "failed to submit question");
      }
    } finally {
      setSubmitting(false);
    }
  }

  const header = (
    <Header
      meta={{
        left: "Symposium",
        center: "",
        right: rateLimited ? "Reconnecting shortly…" : connected ? "Live" : "Connecting…",
      }}
    />
  );

  if (notFound) {
    return (
      <div className="flex flex-1 flex-col">
        {header}
        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-2 px-6 py-10">
          <p className="text-lg">This room doesn&rsquo;t exist.</p>
          <p className="text-sm text-muted">It may have expired, or the link may be wrong.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      {header}

      <div className="mx-auto w-full max-w-4xl flex-1 px-4 sm:px-6 pb-[var(--space-8)]">
        {rateLimited && (
          <p role="status" className="pt-[var(--space-4)] text-sm text-[var(--color-accent-2)]">
            Too many connections right now — this view will reconnect automatically in a few seconds.
          </p>
        )}

        {firstQuestion && (
          <div className="flex flex-col md:grid md:grid-cols-[minmax(0,1fr)_200px] gap-6 md:gap-[var(--space-8)] pt-6 md:pt-[var(--space-8)] border-b border-[var(--color-divider)] pb-[var(--space-8)]">
            <div>
              <h6 className="text-[var(--color-accent-2)] text-[10px] tracking-[0.2em] uppercase mb-[var(--space-2)]">The Inquiry</h6>
              <h1 className="text-3xl sm:text-4xl md:text-5xl leading-[1.1] mb-[var(--space-4)] font-heading italic">{firstQuestion.content}</h1>
              <p className="text-muted text-[11px] sm:text-[13px] m-0 font-medium tracking-wide uppercase">
                Initiated by {firstQuestion.authorName} • Four Voices
              </p>
            </div>
            {panel.length > 0 && (
              <div className="grid grid-cols-4 md:grid-cols-2 gap-2 border-t md:border-t-0 border-[var(--color-divider)] pt-4 md:pt-0">
                {panel.map((p) => (
                  <div key={p.id} className="w-full aspect-square md:h-[88px] overflow-hidden grayscale border border-[var(--color-divider)]">
                    <Image src={p.portrait} alt={p.name} width={88} height={88} className="h-full w-full object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {messages.length === 0 && (
          <p className="text-muted pt-[var(--space-8)]">{connected ? "No messages yet." : "Connecting…"}</p>
        )}

        {rounds.map((round) => (
          <div key={round.number}>
            {round.ask && (
              <div className="flex flex-col md:grid md:grid-cols-[132px_minmax(0,1fr)] gap-[var(--space-2)] md:gap-[var(--space-4)] pt-[var(--space-6)]">
                <div className="hidden md:block" />
                <div>
                  <span className="text-[10px] tracking-[0.1em] uppercase text-[var(--color-accent-2)]">
                    {round.ask.authorName} asks
                  </span>
                  <p className="mt-[5px] text-base sm:text-[18px] leading-[1.55] italic max-w-[52ch]">{round.ask.content}</p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-[var(--space-3)] pt-[var(--space-8)]">
              <PlateNumeral value={round.number} />
              <span className="text-[11px] tracking-[0.2em] uppercase text-[var(--color-text)]/40 font-bold">
                {round.number === 1 ? "First round" : round.number === 2 ? "Second round" : `Round ${round.number}`}
              </span>
            </div>

            <ol className="list-none m-0 p-0 flex flex-col gap-10 md:gap-[var(--space-8)] pt-[var(--space-6)]">
              {round.turns.map((m) => {
                const portrait = portraitById[m.speakerId]?.portrait;
                return (
                  <li key={m.index} className="flex flex-col md:grid md:grid-cols-[132px_minmax(0,1fr)] gap-3 md:gap-[var(--space-6)] items-start">
                    {portrait && (
                      <div className="w-16 h-16 md:w-[132px] md:h-[164px] overflow-hidden grayscale border border-[var(--color-divider)] flex-shrink-0">
                        <Image src={portrait} alt={m.authorName} width={132} height={164} className="h-full w-full object-cover" />
                      </div>
                    )}
                    <div>
                      <h3 className="m-0 mb-1 md:mb-2 font-heading text-xl md:text-2xl tracking-tight">{m.authorName}</h3>
                      <p className="m-0 text-base md:text-[19px] leading-[1.6] max-w-[52ch] text-balance font-body">{m.content}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        ))}

        {status === "error" && (
          <p role="alert" className="pt-[var(--space-6)] text-sm text-[var(--color-accent-2)]">
            Something went wrong generating the last response. You can ask again.
          </p>
        )}

        {status === "debating" && (
          <div className="flex flex-col md:grid md:grid-cols-[132px_minmax(0,1fr)] gap-3 md:gap-[var(--space-6)] items-start pt-[var(--space-8)] animate-pulse">
            <div className="w-16 h-16 md:w-[132px] md:h-[164px] bg-[var(--color-surface)] border border-[var(--color-divider)] flex items-center justify-center grayscale">
              <span className="text-xl md:text-2xl opacity-20 font-heading">?</span>
            </div>
            <div>
              <h3 className="m-0 mb-1 md:mb-2 font-heading text-xl md:text-2xl tracking-tight opacity-40 italic">The panel is thinking</h3>
              <div className="flex gap-1 pt-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-text)] opacity-40 animate-[bounce_1.4s_infinite_0ms]"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-text)] opacity-40 animate-[bounce_1.4s_infinite_200ms]"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-text)] opacity-40 animate-[bounce_1.4s_infinite_400ms]"></span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} className="h-px" />

        <div className="flex flex-col md:grid md:grid-cols-[132px_minmax(0,1fr)] gap-4 md:gap-[var(--space-4)] pt-[var(--space-8)]">
          <div className="hidden md:block text-[11px] tracking-[0.1em] uppercase text-[var(--color-accent)] pt-[var(--space-2)]">
            {status === "debating" ? "Debating…" : ""}
          </div>
          <form onSubmit={submit}>
            <div className="flex flex-col sm:flex-row gap-[var(--space-2)] items-start">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                disabled={!canAsk || submitting}
                placeholder={canAsk ? "Ask the panel…" : "Wait for the round to finish…"}
                className="w-full flex-1 min-h-11 rounded-[var(--radius-md)] border border-[var(--color-divider)] bg-[var(--color-surface)] p-3 text-base placeholder:text-[var(--color-text)]/65 disabled:opacity-45 focus-visible:border-[var(--color-accent)]"
              />
              <button
                type="submit"
                disabled={!canAsk || !draft.trim() || submitting}
                className="w-full sm:w-auto min-h-11 rounded-[var(--radius-md)] bg-[var(--color-accent)] px-[var(--space-4)] font-semibold text-[var(--color-bg)] hover:bg-[var(--color-accent-600)] active:bg-[var(--color-accent-700)] disabled:opacity-45"
              >
                {submitting ? "Asking…" : "Ask"}
              </button>
            </div>
            <p className="text-muted text-xs mt-[var(--space-2)] mb-0">
              Asking as{" "}
              <input
                value={authorName}
                onChange={(e) => {
                  setAuthorName(e.target.value);
                  setName(e.target.value);
                }}
                className="inline w-28 border-b border-[var(--color-divider)] bg-transparent text-[var(--color-text)] focus-visible:border-[var(--color-accent)]"
              />
              {status === "debating" && <span className="md:hidden ml-2 text-[var(--color-accent)] uppercase tracking-tighter">Debating…</span>}
            </p>
            {error && <p className="text-sm text-[var(--color-accent-2)] mt-[var(--space-2)]">{error}</p>}
          </form>
        </div>
      </div>
    </div>
  );
}
