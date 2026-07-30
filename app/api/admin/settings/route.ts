import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getRequestMetadata, jsonError } from "@/lib/http";
export async function PATCH(request:NextRequest){const b=await request.json().catch(()=>null);if(!b)return jsonError("Invalid request.");const s=await createClient();const m=getRequestMetadata(request);const {error}=await s.rpc("update_event_settings",{_event_name:b.eventName,_event_status:b.eventStatus,_submissions_open:Boolean(b.submissionsOpen),_voting_open:Boolean(b.votingOpen),_results_visible:Boolean(b.resultsVisible),_require_whitelist:Boolean(b.requireWhitelist),_ip:m.ip,_user_agent:m.userAgent,_request_id:m.requestId});if(error)return jsonError(error.message,403);return Response.json({ok:true});}
