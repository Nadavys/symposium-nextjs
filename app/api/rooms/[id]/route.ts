export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "../../../../lib/db";
import { getSince } from "../../../../lib/roomRepo";
import { handleGet } from "../handlers";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const sinceParam = request.nextUrl.searchParams.get("since");
  let since: number | undefined;
  if (sinceParam !== null) {
    const parsed = sinceParam.trim() === "" ? NaN : Number(sinceParam);
    if (!Number.isInteger(parsed) || parsed < 0) {
      return NextResponse.json({ error: "since must be a non-negative integer" }, { status: 400 });
    }
    since = parsed;
  }
  const db = await getDb();
  const deps = { getSince: (roomId: string, s?: number) => getSince(db, roomId, s) };
  const res = await handleGet(deps, id, since);
  return NextResponse.json(res.body, { status: res.status });
}
