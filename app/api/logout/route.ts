import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getRequestMetadata } from "@/lib/http";
export async function POST(request: NextRequest) {
  const supabase = await createClient(); const meta = getRequestMetadata(request);
  await supabase.rpc("record_logout", { _ip: meta.ip, _user_agent: meta.userAgent, _request_id: meta.requestId });
  await supabase.auth.signOut();
  return Response.json({ ok:true });
}
