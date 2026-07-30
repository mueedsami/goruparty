"use client";

import { useState } from "react";

export function VoteButton({ personId, nicknameId, selected, disabled }: {
  personId: string;
  nicknameId: string;
  selected: boolean;
  disabled: boolean;
}) {
  const [loading, setLoading] = useState(false);

  async function vote() {
    setLoading(true);
    const response = await fetch("/api/votes", {
      method: selected ? "DELETE" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ personId, nicknameId }),
    });
    const body = await response.json();
    if (!response.ok) {
      alert(body.error || "Vote failed.");
      setLoading(false);
      return;
    }
    window.location.reload();
  }

  return (
    <button className={selected ? "button selected" : "button secondary"} disabled={disabled || loading} onClick={vote}>
      {loading ? "Saving…" : selected ? "Remove vote" : "Vote"}
    </button>
  );
}
