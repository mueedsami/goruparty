import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getRequestMetadata, jsonError } from "@/lib/http";
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body?.personId || !body?.nicknameId) return jsonError("Person and nickname are required.");
  const supabase = await createClient(); const meta = getRequestMetadata(request);
  const { error } = await supabase.rpc("cast_vote", { _person_id: body.personId, _nickname_id: body.nicknameId, _ip: meta.ip, _user_agent: meta.userAgent, _request_id: meta.requestId });
  if (error) return jsonError(error.message);
  return Response.json({ ok:true });
}
export async function DELETE(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body?.personId) return jsonError("Person is required.");
  const supabase = await createClient(); const meta = getRequestMetadata(request);
  const { error } = await supabase.rpc("remove_vote", { _person_id: body.personId, _ip: meta.ip, _user_agent: meta.userAgent, _request_id: meta.requestId });
  if (error) return jsonError(error.message);
  return Response.json({ ok:true });
}
