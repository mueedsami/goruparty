import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { NicknameForm } from "@/components/nickname-form";
import { VoteButton } from "@/components/vote-button";

export default async function PersonPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: person }, { data: details, error }, { data: settings }] = await Promise.all([
    supabase.from("people").select("id,person_code,full_name,photo_url,finalized_nickname_id").eq("id", id).eq("is_active", true).maybeSingle(),
    supabase.rpc("get_person_nicknames", { _person_id: id }),
    supabase.from("event_settings").select("submissions_open,voting_open,results_visible").eq("id", 1).single(),
  ]);
  if (!person) notFound();
  if (error) throw new Error(error.message);
  const rows = details || [];

  return <main><div className="container">
    <section className="detail-head">{person.photo_url ? <img className="avatar large" src={person.photo_url} alt="" /> : <div className="avatar large">{person.full_name.slice(0,1)}</div>}<div><p className="muted">{person.person_code}</p><h1>{person.full_name}</h1></div></section>
    <div className="two-column"><section className="card"><h2>Nickname options</h2><div className="nickname-list">
      {rows.length === 0 && <p className="muted">No approved nicknames yet.</p>}
      {rows.map((row: any) => <div className="nickname-row" key={row.nickname_id}><div className="nickname-main"><strong>{row.nickname}</strong>{row.is_final && <span className="badge">Final nickname</span>}{settings?.results_visible && <span className="muted">{row.vote_count} {Number(row.vote_count) === 1 ? "vote" : "votes"}</span>}</div><div className="button-row"><VoteButton personId={id} nicknameId={row.nickname_id} selected={row.has_voted} disabled={!settings?.voting_open || Boolean(person.finalized_nickname_id)} /></div></div>)}
    </div></section><NicknameForm personId={id} disabled={!settings?.submissions_open || Boolean(person.finalized_nickname_id)} /></div>
  </div></main>;
}
