export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { PANEL, DISPLAY_NAME, PORTRAIT, TAGLINE } from "../../../lib/roster";

// Single source of truth for "who's on the panel" is lib/roster.ts — the UI
// fetches it rather than hardcoding the philosopher list in JSX copy, so a
// roster change only requires editing this one file.
export async function GET() {
  return NextResponse.json({
    philosophers: PANEL.map((id) => ({
      id, name: DISPLAY_NAME[id], portrait: PORTRAIT[id], tagline: TAGLINE[id],
    })),
  });
}
