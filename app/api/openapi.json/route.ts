export const runtime = "nodejs";

import { NextResponse } from "next/server";

const spec = {
  openapi: "3.0.3",
  info: {
    title: "Symposium API",
    version: "1.0.0",
    description:
      "Ask a question and watch Nietzsche, Marx, Beauvoir, and Foucault debate it — an AI dramatization, not the real philosophers.",
  },
  servers: [{ url: "/api" }],
  paths: {
    "/rooms": {
      post: {
        summary: "Create a room",
        description: "Creates an empty, idle debate room and returns its id.",
        responses: {
          "201": {
            description: "Room created",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { id: { type: "string", format: "uuid" } },
                  required: ["id"],
                },
                example: { id: "b3f1c2a0-...-9f2e" },
              },
            },
          },
          "429": { $ref: "#/components/responses/RateLimited" },
        },
      },
      get: {
        summary: "List rooms",
        description: "Returns room summaries (no message bodies), newest-active-first.",
        parameters: [
          {
            name: "limit",
            in: "query",
            required: false,
            schema: { type: "integer", default: 50, maximum: 200 },
            description: "Max rooms to return (capped at 200).",
          },
        ],
        responses: {
          "200": {
            description: "Room summaries",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    rooms: { type: "array", items: { $ref: "#/components/schemas/RoomSummary" } },
                  },
                  required: ["rooms"],
                },
              },
            },
          },
          "400": {
            description: "Invalid `limit`",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorBody" },
                example: { error: "limit must be a positive integer" },
              },
            },
          },
        },
      },
    },
    "/rooms/{id}": {
      get: {
        summary: "Get a room's state, optionally since an index",
        description:
          "Returns the room's current name/status/latestIndex plus messages. Pass `since` to get only messages with a strictly greater index — omit it for the full transcript.",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
          {
            name: "since",
            in: "query",
            required: false,
            schema: { type: "integer", minimum: 0 },
            description: "Exclusive cursor — only messages with index > since are returned.",
          },
        ],
        responses: {
          "200": {
            description: "Room state",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/RoomState" },
              },
            },
          },
          "400": {
            description: "`since` is not a non-negative integer",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorBody" },
                example: { error: "since must be a non-negative integer" },
              },
            },
          },
          "404": { $ref: "#/components/responses/RoomNotFound" },
        },
      },
    },
    "/rooms/{id}/stream": {
      get: {
        summary: "Subscribe to a room's live updates (Server-Sent Events)",
        description:
          "Opens a `text/event-stream` connection backed by a MongoDB change stream on the room's document. Emits the full current room state (same shape as GET /rooms/{id}) as a `message` event immediately on connect, then again after every write to the room, pushed instantly with no client-side re-fetching. Emits a `not_found` event and closes if the room doesn't exist, or a `rate_limited` event if the stream itself is throttled. Reconnect automatically (e.g. via the browser's EventSource) to resume after any drop.",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": {
            description: "SSE stream of RoomState snapshots",
            content: {
              "text/event-stream": {
                schema: { $ref: "#/components/schemas/RoomState" },
              },
            },
          },
          "429": { $ref: "#/components/responses/RateLimited" },
        },
      },
    },
    "/rooms/{id}/messages": {
      post: {
        summary: "Ask the panel a question",
        description:
          "Acquires the room's lock and saves the question if the room is idle (or previously errored), then kicks off a full round in the background. Returns immediately — subscribe to GET /rooms/{id}/stream to watch the round unfold live, or fetch GET /rooms/{id} for a one-shot snapshot.",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/AskRequest" },
            },
          },
        },
        responses: {
          "202": {
            description: "Question accepted; the round has started",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { ok: { type: "boolean", enum: [true] } },
                },
              },
            },
          },
          "400": {
            description: "Malformed JSON body, or userId/authorName/content missing, blank, or too long",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorBody" },
                example: { error: "userId, authorName, and content are required non-empty strings" },
              },
            },
          },
          "404": { $ref: "#/components/responses/RoomNotFound" },
          "409": {
            description: "A round is already in progress for this room",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorBody" },
                example: { error: "a round is already in progress" },
              },
            },
          },
          "429": { $ref: "#/components/responses/RateLimited" },
        },
      },
    },
  },
  components: {
    schemas: {
      Message: {
        type: "object",
        properties: {
          index: { type: "integer", description: "Per-room, gap-free, ascending index" },
          role: { type: "string", enum: ["user", "philosopher"] },
          speakerId: { type: "string" },
          authorName: { type: "string" },
          content: { type: "string" },
          createdAt: { type: "integer", description: "Epoch ms" },
        },
        required: ["index", "role", "speakerId", "authorName", "content", "createdAt"],
      },
      RoomSummary: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          name: { type: "string", nullable: true },
          status: { type: "string", enum: ["idle", "debating", "error"] },
          latestIndex: { type: "integer" },
          createdAt: { type: "integer", description: "Epoch ms" },
          lastActivityAt: { type: "integer", description: "Epoch ms" },
        },
        required: ["id", "name", "status", "latestIndex", "createdAt", "lastActivityAt"],
      },
      RoomState: {
        type: "object",
        properties: {
          name: { type: "string", nullable: true },
          status: { type: "string", enum: ["idle", "debating", "error"] },
          latestIndex: { type: "integer" },
          messages: { type: "array", items: { $ref: "#/components/schemas/Message" } },
        },
        required: ["name", "status", "latestIndex", "messages"],
      },
      AskRequest: {
        type: "object",
        properties: {
          userId: { type: "string", description: "Stable per-browser id (see lib/identity.ts)" },
          authorName: { type: "string" },
          content: { type: "string" },
        },
        required: ["userId", "authorName", "content"],
      },
      ErrorBody: {
        type: "object",
        properties: { error: { type: "string" } },
        required: ["error"],
      },
    },
    responses: {
      RoomNotFound: {
        description: "No room exists with this id",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorBody" },
            example: { error: "room not found" },
          },
        },
      },
      RateLimited: {
        description: "Too many requests from this client — see Retry-After",
        headers: {
          "Retry-After": { schema: { type: "integer" }, description: "Seconds until the window resets" },
        },
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorBody" },
            example: { error: "too many requests, try again later" },
          },
        },
      },
    },
  },
};

export async function GET() {
  return NextResponse.json(spec);
}
