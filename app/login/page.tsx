import { GoogleLoginButton } from "@/components/google-login-button";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  return <main className="login-shell"><section className="card login-card">
    <div className="badge">Private event</div>
    <h1>Nickname Party</h1>
    <p className="muted">Sign in with your approved Google account to suggest nicknames and vote.</p>
    {params.error === "not_allowed" && <div className="notice">This Google account is not approved for this event.</div>}
    <GoogleLoginButton />
  </section></main>;
}
