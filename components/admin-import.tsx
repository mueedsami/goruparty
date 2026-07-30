"use client";

import { FormEvent, useState } from "react";

export function AdminImport() {
  const [text, setText] = useState("person_code,full_name,photo_url\n001,Example Person,");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const response = await fetch("/api/admin/people/import", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ csv: text }),
    });
    const body = await response.json();
    setMessage(response.ok ? `Imported ${body.imported} people.` : body.error || "Import failed.");
    setLoading(false);
    if (response.ok) window.location.reload();
  }

  return (
    <form className="card form-stack" onSubmit={submit}>
      <h2>Import people</h2>
      <p className="muted">Paste CSV with: person_code, full_name, photo_url.</p>
      <textarea className="textarea" rows={9} value={text} onChange={(event) => setText(event.target.value)} />
      <button className="button primary" disabled={loading}>{loading ? "Importing…" : "Import / update"}</button>
      {message && <p className="form-message">{message}</p>}
    </form>
  );
}
