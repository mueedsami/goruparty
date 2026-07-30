import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getRequestMetadata } from "@/lib/http";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") || "/";
  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const meta = getRequestMetadata(request);
      await supabase.rpc("record_login", { _ip: meta.ip, _user_agent: meta.userAgent, _request_id: meta.requestId });
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from("profiles").select("is_allowed").eq("id", user.id).maybeSingle();
        if (!profile?.is_allowed) return NextResponse.redirect(new URL("/login?error=not_allowed", url.origin));
      }
      return NextResponse.redirect(new URL(next, url.origin));
    }
  }
  return NextResponse.redirect(new URL("/login?error=auth", url.origin));
}
