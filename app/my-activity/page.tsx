import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function MyActivityPage() {
  const profile = await requireUser();
  const supabase = await createClient();
  const [{ data: suggestions }, { data: votes }] = await Promise.all([
    supabase.from("nickname_suggestions").select("id,nickname,status,created_at,people(full_name,person_code)").eq("submitted_by", profile.id).order("created_at", { ascending:false }),
    supabase.from("votes").select("id,created_at,people(full_name,person_code),nickname_suggestions(nickname)").eq("voter_id", profile.id).order("created_at", { ascending:false }),
  ]);
  return <main><div className="container"><div className="page-title"><div><h1>My activity</h1><p className="muted">Only you and administrators can see this page.</p></div></div>
    <div className="two-column"><section className="card"><h2>My suggestions</h2><div className="nickname-list">{suggestions?.map((item:any)=><div className="nickname-row" key={item.id}><div><strong>{item.nickname}</strong><p className="muted">{item.people?.full_name} · {item.people?.person_code}</p></div><span className={`badge ${item.status}`}>{item.status}</span></div>)}{!suggestions?.length && <p className="muted">No suggestions yet.</p>}</div></section>
    <section className="card"><h2>My votes</h2><div className="nickname-list">{votes?.map((item:any)=><div key={item.id}><strong>{item.nickname_suggestions?.nickname}</strong><p className="muted">{item.people?.full_name} · {item.people?.person_code}</p></div>)}{!votes?.length && <p className="muted">No votes yet.</p>}</div></section></div>
  </div></main>;
}
