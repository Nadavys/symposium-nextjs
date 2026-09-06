export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "../../../lib/db";
import { createRoom, listRooms } from "../../../lib/roomRepo";
import { enforceRateLimit } from "../../../lib/requestRateLimit";
import { handleList } from "./handlers";

const CREATE_LIMIT_PER_HOUR = 40;
const DEFAULT_LIST_LIMIT = 50;
const MAX_LIST_LIMIT = 200;

export async function POST(request: NextRequest) {
  const db = await getDb();
  const limited = await enforceRateLimit(db, request, "create", CREATE_LIMIT_PER_HOUR);
  if (limited) return limited;

  const id = await createRoom(db);
  return NextResponse.json({ id }, { status: 201 });
}

export async function GET(request: NextRequest) {
  const db = await getDb();
  const limitParam = request.nextUrl.searchParams.get("limit");
  let limit = DEFAULT_LIST_LIMIT;
  if (limitParam != null) {
    const parsed = Number(limitParam);
    if (!Number.isInteger(parsed) || parsed < 1) {
      return NextResponse.json({ error: "limit must be a positive integer" }, { status: 400 });
    }
    limit = Math.min(parsed, MAX_LIST_LIMIT);
  }

  const { status, body } = await handleList({ listRooms: (l?: number) => listRooms(db, l) }, limit);
  return NextResponse.json(body, { status });
}
