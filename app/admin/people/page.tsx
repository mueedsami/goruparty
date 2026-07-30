import { createClient } from "@/lib/supabase/server";
import { AdminImport } from "@/components/admin-import";
export default async function AdminPeoplePage() {
  const supabase = await createClient();
  const { data } = await supabase.from("people").select("id,person_code,full_name,is_active,created_at").order("person_code");
  return <><div className="page-title"><div><h1>People</h1><p className="muted">Import the finalized list of 114 people.</p></div></div><div className="two-column"><div className="table-wrap"><table><thead><tr><th>Code</th><th>Name</th><th>Status</th></tr></thead><tbody>{data?.map((p:any)=><tr key={p.id}><td>{p.person_code}</td><td>{p.full_name}</td><td>{p.is_active ? "Active" : "Inactive"}</td></tr>)}</tbody></table></div><AdminImport /></div></>;
}
