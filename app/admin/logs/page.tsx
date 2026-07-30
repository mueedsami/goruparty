import { createClient } from "@/lib/supabase/server";
export default async function AdminLogsPage({ searchParams }: { searchParams: Promise<{ action?: string; email?: string }> }) {
  const { action = "", email = "" } = await searchParams;
  const supabase = await createClient();
  let query = supabase.from("audit_logs").select("id,actor_email_snapshot,action_type,entity_type,entity_id,ip_address,user_agent,request_id,old_data,new_data,created_at").order("created_at", { ascending:false }).limit(500);
  if (action) query = query.ilike("action_type", `%${action}%`);
  if (email) query = query.ilike("actor_email_snapshot", `%${email}%`);
  const { data } = await query;
  return <><div className="page-title"><div><h1>Immutable audit logs</h1><p className="muted">Latest 500 matching events.</p></div></div><form className="card search" style={{display:"grid",gridTemplateColumns:"1fr 1fr auto",gap:10}}><input className="input" name="action" defaultValue={action} placeholder="Action type"/><input className="input" name="email" defaultValue={email} placeholder="Actor email"/><button className="button primary">Filter</button></form><div className="table-wrap"><table><thead><tr><th>Time</th><th>Actor</th><th>Action</th><th>Network</th><th>Snapshot</th></tr></thead><tbody>{data?.map((log:any)=><tr key={log.id}><td>{new Date(log.created_at).toLocaleString()}</td><td>{log.actor_email_snapshot || "system"}</td><td><strong>{log.action_type}</strong><br/><span className="muted">{log.entity_type} · {log.entity_id}</span><br/><span className="muted">Request: {log.request_id}</span></td><td>{log.ip_address || "—"}<br/><span className="muted">{log.user_agent || "—"}</span></td><td><pre className="json">{JSON.stringify({old:log.old_data,new:log.new_data},null,2)}</pre></td></tr>)}</tbody></table></div></>;
}
