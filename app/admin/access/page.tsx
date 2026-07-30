import { createClient } from "@/lib/supabase/server";
import { AdminAccessImport } from "@/components/admin-access-import";

export default async function AdminAccessPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("allowed_emails").select("email,is_admin,added_at").order("email");
  return <><div className="page-title"><div><h1>Account access</h1><p className="muted">Control which Google accounts may enter and which are administrators.</p></div></div>
    <div className="two-column"><div className="table-wrap"><table><thead><tr><th>Email</th><th>Role</th><th>Added</th></tr></thead><tbody>{data?.map((row:any)=><tr key={row.email}><td>{row.email}</td><td>{row.is_admin ? "Admin" : "Participant"}</td><td>{new Date(row.added_at).toLocaleString()}</td></tr>)}</tbody></table></div><AdminAccessImport /></div></>;
}
