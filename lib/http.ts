import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";

export function getRequestMetadata(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  return {
    ip: forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || null,
    userAgent: request.headers.get("user-agent"),
    requestId: request.headers.get("x-request-id") || randomUUID(),
  };
}

export function jsonError(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}
