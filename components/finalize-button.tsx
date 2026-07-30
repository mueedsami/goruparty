"use client";

import { useState } from "react";

export function FinalizeButton({ personId, nicknameId }: { personId: string; nicknameId: string }) {
  const [loading, setLoading] = useState(false);
  return (
    <button className="button primary" disabled={loading} onClick={async () => {
      if (!confirm("Set this as the final nickname?")) return;
      setLoading(true);
      const response = await fetch("/api/admin/finalize", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ personId, nicknameId }),
      });
      const body = await response.json();
      if (!response.ok) alert(body.error || "Could not finalize.");
      else window.location.reload();
      setLoading(false);
    }}>{loading ? "Finalizing…" : "Finalize"}</button>
  );
}
