import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { getSessionProfile } from "@/lib/auth";
import { LogoutButton } from "@/components/logout-button";

export const metadata: Metadata = { title: "Nickname Party", description: "Private nickname voting platform" };

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const profile = await getSessionProfile();
  return (
    <html lang="en"><body>
      {profile?.is_allowed && <header className="site-header"><div className="container header-inner">
        <Link className="brand" href="/">Nickname Party</Link>
        <nav className="nav"><Link href="/">People</Link><Link href="/my-activity">My activity</Link>{profile.role === "admin" && <Link href="/admin">Admin</Link>}<LogoutButton /></nav>
      </div></header>}
      {children}
    </body></html>
  );
}
