import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireUser();
  const { q = "" } = await searchParams;
  const supabase = await createClient();
  const { data: settings } = await supabase.from("event_settings").select("event_name,event_status,results_visible").eq("id", 1).single();
  const { data, error } = await supabase.rpc("get_people_directory");
  if (error) throw new Error(error.message);
  const people = (data || []).filter((person: any) => `${person.full_name} ${person.person_code}`.toLowerCase().includes(q.toLowerCase()));

  return <main><div className="container">
    <section className="hero"><div className="badge">{String(settings?.event_status || "draft").replaceAll("_", " ")}</div><h1>{settings?.event_name || "Nickname Party"}</h1><p>Choose a person, suggest a nickname, and vote for the best option. User identities remain visible only to administrators.</p></section>
    <form className="search"><input className="input" name="q" defaultValue={q} placeholder="Search by name or ID" /></form>
    <section className="grid">{people.map((person: any) => <Link key={person.id} href={`/people/${person.id}`} className="card person-card">
      {person.photo_url ? <img className="avatar" src={person.photo_url} alt="" /> : <div className="avatar">{String(person.full_name).slice(0,1)}</div>}
      <div><h2>{person.full_name}</h2><p className="muted">{person.person_code}</p></div>
      <div>{person.final_nickname ? <span className="badge">Final: {person.final_nickname}</span> : person.leading_nickname ? <span className="badge">Leading: {person.leading_nickname}</span> : <span className="muted">No nicknames yet</span>}</div>
      <p className="muted">{person.nickname_count} suggestions{settings?.results_visible ? ` · ${person.total_votes} votes` : ""}</p>
    </Link>)}</section>
  </div></main>;
}
