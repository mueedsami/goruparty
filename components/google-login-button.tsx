"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/browser";

export function GoogleLoginButton() {
  const [loading, setLoading] = useState(false);

  async function login() {
    setLoading(true);
    const supabase = createClient();
    const origin = window.location.origin;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${origin}/auth/callback` },
    });
    if (error) {
      alert(error.message);
      setLoading(false);
    }
  }

  return (
    <button className="button primary large" onClick={login} disabled={loading}>
      {loading ? "Opening Google…" : "Continue with Google"}
    </button>
  );
}
