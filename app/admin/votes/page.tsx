import { createClient } from "@/lib/supabase/server";
export default async function AdminVotesPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("votes").select("id,created_at,updated_at,people(full_name,person_code),nickname_suggestions(nickname),profiles!votes_voter_id_fkey(full_name,email)").order("updated_at", { ascending:false }).limit(1000);
  return <><div className="page-title"><div><h1>Vote records</h1><p className="muted">Latest 1,000 current votes. Vote changes remain in audit logs.</p></div></div><div className="table-wrap"><table><thead><tr><th>Person</th><th>Nickname</th><th>Voter</th><th>Updated</th></tr></thead><tbody>{data?.map((v:any)=><tr key={v.id}><td>{v.people?.full_name}<br/><span className="muted">{v.people?.person_code}</span></td><td>{v.nickname_suggestions?.nickname}</td><td>{v.profiles?.full_name || "—"}<br/><span className="muted">{v.profiles?.email}</span></td><td>{new Date(v.updated_at).toLocaleString()}</td></tr>)}</tbody></table></div></>;
}
