import { createClient } from "@/lib/supabase/server";
export default async function AdminPage() {
  const supabase = await createClient();
  const [{ count: people }, { count: nicknames }, { count: votes }, { count: logs }] = await Promise.all([
    supabase.from("people").select("id", { count:"exact", head:true }),
    supabase.from("nickname_suggestions").select("id", { count:"exact", head:true }),
    supabase.from("votes").select("id", { count:"exact", head:true }),
    supabase.from("audit_logs").select("id", { count:"exact", head:true }),
  ]);
  return <><div className="page-title"><div><h1>Admin overview</h1><p className="muted">Moderation and traceability control centre.</p></div></div><section className="stats"><div className="card stat">People<strong>{people || 0}</strong></div><div className="card stat">Nicknames<strong>{nicknames || 0}</strong></div><div className="card stat">Votes<strong>{votes || 0}</strong></div><div className="card stat">Audit events<strong>{logs || 0}</strong></div></section></>;
}
