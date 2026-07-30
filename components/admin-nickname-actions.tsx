"use client";

import { useState } from "react";

export function AdminNicknameActions({ id, status }: { id: string; status: string }) {
  const [loading, setLoading] = useState(false);
  async function update(nextStatus: "approved" | "hidden" | "deleted") {
    const reason = nextStatus === "approved" ? null : window.prompt("Moderation reason:") || "No reason supplied";
    setLoading(true);
    const response = await fetch(`/api/admin/nicknames/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: nextStatus, reason }),
    });
    const body = await response.json();
    if (!response.ok) alert(body.error || "Update failed.");
    else window.location.reload();
    setLoading(false);
  }
  return (
    <div className="button-row">
      {status !== "approved" && <button className="button secondary" disabled={loading} onClick={() => update("approved")}>Approve</button>}
      {status !== "hidden" && <button className="button warning" disabled={loading} onClick={() => update("hidden")}>Hide</button>}
      {status !== "deleted" && <button className="button danger" disabled={loading} onClick={() => update("deleted")}>Delete</button>}
    </div>
  );
}
