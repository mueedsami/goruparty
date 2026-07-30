"use client";

import { useState } from "react";

export function LogoutButton() {
  const [loading, setLoading] = useState(false);
  return (
    <button
      className="button ghost"
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        await fetch("/api/logout", { method: "POST" });
        window.location.href = "/login";
      }}
    >
      {loading ? "Signing out…" : "Sign out"}
    </button>
  );
}
