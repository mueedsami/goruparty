import { createClient } from "@/lib/supabase/server";
import { SettingsForm } from "@/components/settings-form";
export default async function AdminSettingsPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("event_settings").select("*").eq("id",1).single();
  return <><div className="page-title"><div><h1>Event settings</h1><p className="muted">Control submissions, voting, access, and when vote totals become visible to participants.</p></div></div><SettingsForm settings={data || {}}/></>;
}
