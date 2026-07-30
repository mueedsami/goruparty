import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getRequestMetadata, jsonError } from "@/lib/http";
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id:string }> }) {
  const { id } = await params; const body = await request.json().catch(()=>null);
  if (!["approved","hidden","deleted"].includes(body?.status)) return jsonError("Invalid status.");
  const supabase = await createClient(); const meta = getRequestMetadata(request);
  const { error } = await supabase.rpc("moderate_nickname", { _nickname_id:id, _status:body.status, _reason:body.reason || null, _ip:meta.ip, _user_agent:meta.userAgent, _request_id:meta.requestId });
  if (error) return jsonError(error.message,403);
  return Response.json({ok:true});
}
