import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getRequestMetadata, jsonError } from "@/lib/http";

function parseCsv(csv: string) {
  const lines = csv.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  return lines.slice(1).map((line) => {
    const [email, isAdmin] = line.split(",").map((value) => value.trim().replace(/^"|"$/g, ""));
    return { email: email?.toLowerCase(), is_admin: isAdmin?.toLowerCase() === "true" };
  }).filter((row) => row.email);
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const rows = parseCsv(String(body?.csv || ""));
  if (!rows.length) return jsonError("No valid email rows found.");
  if (rows.length > 500) return jsonError("Maximum 500 rows per import.");
  const supabase = await createClient();
  const meta = getRequestMetadata(request);
  const { data, error } = await supabase.rpc("admin_import_allowed_emails", {
    _rows: rows,
    _ip: meta.ip,
    _user_agent: meta.userAgent,
    _request_id: meta.requestId,
  });
  if (error) return jsonError(error.message, 403);
  return Response.json({ imported: data });
}
