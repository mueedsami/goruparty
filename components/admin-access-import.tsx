"use client";

import { FormEvent, useState } from "react";

export function AdminAccessImport() {
  const [text, setText] = useState("email,is_admin\nyour-admin@gmail.com,true\nparticipant@gmail.com,false");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const response = await fetch("/api/admin/access/import", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ csv: text }),
    });
    const body = await response.json();
    setMessage(response.ok ? `Imported ${body.imported} approved emails.` : body.error || "Import failed.");
    setLoading(false);
    if (response.ok) window.location.reload();
  }

  return <form className="card form-stack" onSubmit={submit}>
    <h2>Import approved accounts</h2>
    <p className="muted">Use lowercase email addresses and true/false for admin access.</p>
    <textarea className="textarea" rows={10} value={text} onChange={(event) => setText(event.target.value)} />
    <button className="button primary" disabled={loading}>{loading ? "Importing…" : "Import / update"}</button>
    {message && <p className="form-message">{message}</p>}
  </form>;
}
