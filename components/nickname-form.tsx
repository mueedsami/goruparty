"use client";

import { FormEvent, useState } from "react";

export function NicknameForm({ personId, disabled }: { personId: string; disabled: boolean }) {
  const [nickname, setNickname] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const response = await fetch("/api/nicknames", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ personId, nickname }),
    });
    const body = await response.json();
    if (!response.ok) {
      setMessage(body.error || "Could not submit nickname.");
      setLoading(false);
      return;
    }
    setNickname("");
    setMessage("Nickname submitted.");
    window.location.reload();
  }

  return (
    <form className="card form-stack" onSubmit={submit}>
      <div>
        <h2>Suggest a nickname</h2>
        <p className="muted">You may suggest multiple distinct nicknames. Keep them respectful.</p>
      </div>
      <input
        className="input"
        maxLength={60}
        value={nickname}
        onChange={(event) => setNickname(event.target.value)}
        placeholder="Enter nickname"
        disabled={disabled || loading}
        required
      />
      <button className="button primary" disabled={disabled || loading}>
        {disabled ? "Submissions closed" : loading ? "Submitting…" : "Submit nickname"}
      </button>
      {message && <p className="form-message">{message}</p>}
    </form>
  );
}
