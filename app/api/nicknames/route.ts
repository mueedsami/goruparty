import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getRequestMetadata, jsonError } from "@/lib/http";
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body?.personId || typeof body.nickname !== "string") return jsonError("Person and nickname are required.");
  const supabase = await createClient();
  const meta = getRequestMetadata(request);
  const { data, error } = await supabase.rpc("submit_nickname", { _person_id: body.personId, _nickname: body.nickname, _ip: meta.ip, _user_agent: meta.userAgent, _request_id: meta.requestId });
  if (error) return jsonError(error.message, error.message.includes("not authenticated") ? 401 : 400);
  return Response.json({ id: data });
}
