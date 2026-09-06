"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { timeAgo, retryAfterSuffix } from "../../lib/format";
import Header from "../components/Header";

interface RoomSummary {
  id: string;
  name: string | null;
  status: "idle" | "debating" | "error";
  latestIndex: number;
  createdAt: number;
  lastActivityAt: number;
}

const STATUS_TAG: Record<RoomSummary["status"], { label: string; className: string }> = {
  idle: { label: "idle", className: "bg-[var(--color-neutral-100)] text-[var(--color-neutral-800)]" },
  debating: { label: "debating…", className: "bg-[var(--color-accent-100)] text-[var(--color-accent-800)]" },
  error: { label: "errored", className: "bg-[var(--color-accent-2-100)] text-[var(--color-accent-2-800)]" },
};

export default function RoomsPage() {
  const [rooms, setRooms] = useState<RoomSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    fetch("/api/rooms")
      .then((res) => res.json())
      .then((data: { rooms: RoomSummary[] }) => {
        if (!cancelled) setRooms(data.rooms);
      })
      .catch(() => {
        if (!cancelled) setError("failed to load rooms");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function createRoom() {
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/rooms", { method: "POST" });
      if (res.status === 429) {
        throw new Error(`too many rooms created${retryAfterSuffix(res.headers.get("Retry-After")) || " — wait a bit and try again"}`);
      }
      if (!res.ok) throw new Error("failed to create room");
      const { id } = await res.json();
      router.push(`/room/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "something went wrong");
      setCreating(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <Header
        active="rooms"
        meta={{ left: "Rooms", center: "", right: `${rooms?.length ?? 0} active` }}
      />

      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-[var(--space-6)] px-6 pt-[var(--space-8)] pb-[var(--space-8)]">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-[44px] m-0">Rooms</h1>
            <p className="text-muted text-sm mt-1 mb-0">Every debate the panel has held, newest activity first.</p>
          </div>
          <button
            onClick={createRoom}
            disabled={creating}
            className="inline-flex min-h-10 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-divider)] px-4 text-sm font-semibold hover:bg-[var(--color-text)]/[0.07] active:bg-[var(--color-text)]/[0.14] disabled:opacity-45"
          >
            {creating ? "Creating…" : "New room"}
          </button>
        </div>

        {error && <p className="text-sm text-[var(--color-accent-2)]">{error}</p>}

        {rooms === null && !error && <p className="text-sm text-muted">Loading…</p>}

        {rooms !== null && rooms.length === 0 && (
          <p className="text-sm text-muted">No rooms yet — start one with &ldquo;New room&rdquo;.</p>
        )}

        {rooms !== null && rooms.length > 0 && (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="w-[56%] text-left text-[11px] tracking-[0.08em] uppercase text-[var(--color-text)]/60 py-[var(--space-2)] border-b border-[var(--color-divider)]">
                  Question
                </th>
                <th className="text-left text-[11px] tracking-[0.08em] uppercase text-[var(--color-text)]/60 py-[var(--space-2)] border-b border-[var(--color-divider)]">
                  Turns
                </th>
                <th className="text-left text-[11px] tracking-[0.08em] uppercase text-[var(--color-text)]/60 py-[var(--space-2)] border-b border-[var(--color-divider)]">
                  Last activity
                </th>
                <th className="text-right text-[11px] tracking-[0.08em] uppercase text-[var(--color-text)]/60 py-[var(--space-2)] border-b border-[var(--color-divider)]">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {rooms.map((r) => {
                const tag = STATUS_TAG[r.status];
                return (
                  <tr
                    key={r.id}
                    onClick={() => router.push(`/room/${r.id}`)}
                    className="cursor-pointer hover:bg-[var(--color-text)]/[0.04]"
                  >
                    <td className="py-[var(--space-2)] border-b border-[var(--color-text)]/[0.08]">
                      <Link href={`/room/${r.id}`} className="text-base no-underline">
                        {r.name ?? "(untitled)"}
                      </Link>
                    </td>
                    <td className="py-[var(--space-2)] border-b border-[var(--color-text)]/[0.08]">
                      {r.latestIndex + 1}
                    </td>
                    <td className="py-[var(--space-2)] border-b border-[var(--color-text)]/[0.08] text-muted">
                      {timeAgo(r.lastActivityAt)}
                    </td>
                    <td className="py-[var(--space-2)] border-b border-[var(--color-text)]/[0.08] text-right">
                      <span className={`inline-flex items-center rounded-sm px-[10px] py-[3px] text-[11px] ${tag.className}`}>
                        {tag.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
