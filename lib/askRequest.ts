export interface AskRequestBody {
  userId: string;
  authorName: string;
  content: string;
}

const MAX_NAME_LENGTH = 100;
const MAX_CONTENT_LENGTH = 2000;

function isNonEmptyString(v: unknown, max: number): v is string {
  return typeof v === "string" && v.trim().length > 0 && v.length <= max;
}

// Guards the fields that flow into lib/roomRepo.ts's tryAcquireAndAsk (which
// assumes `content` is a trimmable string) — a missing/non-string field there
// throws a raw TypeError instead of a clean 400.
export function validateAskRequest(body: unknown): AskRequestBody | null {
  if (typeof body !== "object" || body === null) return null;
  const { userId, authorName, content } = body as Record<string, unknown>;
  if (!isNonEmptyString(userId, MAX_NAME_LENGTH)) return null;
  if (!isNonEmptyString(authorName, MAX_NAME_LENGTH)) return null;
  if (!isNonEmptyString(content, MAX_CONTENT_LENGTH)) return null;
  return { userId, authorName, content };
}
