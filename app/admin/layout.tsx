import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return <main><div className="container"><nav className="admin-tabs"><Link href="/admin">Overview</Link><Link href="/admin/people">People</Link><Link href="/admin/access">Access</Link><Link href="/admin/nicknames">Nicknames</Link><Link href="/admin/votes">Votes</Link><Link href="/admin/logs">Audit logs</Link><Link href="/admin/settings">Settings</Link></nav>{children}</div></main>;
}
