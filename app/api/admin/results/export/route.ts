import { NextRequest } from "next/server";
import { getSessionProfile } from "@/lib/auth";
import { getRequestMetadata } from "@/lib/http";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type ExportRow = {
  person_code: string;
  full_name: string;
  most_voted_nickname: string | null;
  vote_count: number | string | null;
};

function spreadsheetSafe(value: unknown): string {
  const text = String(value ?? "").replace(/\r\n?/g, "\n");
  return /^[=+\-@\t]/.test(text) ? `'${text}` : text;
}

function csvCell(value: unknown): string {
  const text = spreadsheetSafe(value).replace(/"/g, '""');
  return `"${text}"`;
}

export async function GET(request: NextRequest) {
  const profile = await getSessionProfile();
  if (!profile?.is_allowed || profile.role !== "admin") {
    return Response.json({ error: "Admin access required." }, { status: 403 });
  }

  const supabase = await createClient();
  const metadata = getRequestMetadata(request);
  const { data, error } = await supabase.rpc("get_admin_result_export", {
    _ip: metadata.ip,
    _user_agent: metadata.userAgent,
    _request_id: metadata.requestId,
  });

  if (error) {
    return Response.json(
      { error: `Could not generate results export: ${error.message}` },
      { status: 500 },
    );
  }

  const rows = (data || []) as ExportRow[];
  const header = ["ID", "Name", "Most Voted Nickname", "Vote Count"];
  const csvRows = [
    header.map(csvCell).join(","),
    ...rows.map((row) =>
      [
        row.person_code,
        row.full_name,
        row.most_voted_nickname || "",
        Number(row.vote_count || 0),
      ]
        .map(csvCell)
        .join(","),
    ),
  ];

  const date = new Date().toISOString().slice(0, 10);
  return new Response(`\uFEFF${csvRows.join("\r\n")}`, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="nickname-results-${date}.csv"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
