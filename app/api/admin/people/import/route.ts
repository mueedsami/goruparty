import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getRequestMetadata, jsonError } from "@/lib/http";
function parseCsv(csv: string) {
  const lines = csv.split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  return lines.slice(1).map(line => {
    const cells = line.split(",").map(v=>v.trim().replace(/^"|"$/g,""));
    return { person_code: cells[0], full_name: cells[1], photo_url: cells[2] || null };
  }).filter(row=>row.person_code && row.full_name);
}
export async function POST(request: NextRequest) {
  const body = await request.json().catch(()=>null);
  const rows = parseCsv(String(body?.csv || ""));
  if (!rows.length) return jsonError("No valid CSV rows found.");
  if (rows.length > 500) return jsonError("Maximum 500 rows per import.");
  const supabase = await createClient(); const meta = getRequestMetadata(request);
  const { data, error } = await supabase.rpc("admin_import_people", { _rows: rows, _ip: meta.ip, _user_agent: meta.userAgent, _request_id: meta.requestId });
  if (error) return jsonError(error.message, 403);
  return Response.json({ imported:data });
}
