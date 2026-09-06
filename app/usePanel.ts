"use client";

import { useEffect, useState } from "react";

export interface PanelPhilosopher {
  id: string;
  name: string;
  portrait: string;
  tagline: string;
}

// The panel roster comes from the server (GET /api/panel, backed by
// lib/roster.ts) rather than being duplicated as hardcoded names in JSX copy.
export function usePanel(): PanelPhilosopher[] {
  const [panel, setPanel] = useState<PanelPhilosopher[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/panel")
      .then((res) => res.json())
      .then((data: { philosophers: PanelPhilosopher[] }) => {
        if (!cancelled) setPanel(data.philosophers);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return panel;
}
