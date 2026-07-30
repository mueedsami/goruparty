"use client";

import { FormEvent, useState } from "react";

export function SettingsForm({ settings }: { settings: Record<string, unknown> }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    const form = new FormData(event.currentTarget);
    const payload = {
      eventName: String(form.get("eventName") || "Nickname Party"),
      eventStatus: String(form.get("eventStatus") || "draft"),
      submissionsOpen: form.get("submissionsOpen") === "on",
      votingOpen: form.get("votingOpen") === "on",
      resultsVisible: form.get("resultsVisible") === "on",
      requireWhitelist: form.get("requireWhitelist") === "on",
    };
    const response = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await response.json();
    setMessage(response.ok ? "Settings saved." : body.error || "Save failed.");
    setLoading(false);
  }

  return (
    <form className="card form-stack" onSubmit={submit}>
      <label>Event name<input className="input" name="eventName" defaultValue={String(settings.event_name || "Nickname Party")} /></label>
      <label>Status
        <select className="input" name="eventStatus" defaultValue={String(settings.event_status || "draft")}>
          <option value="draft">Draft</option><option value="submissions_open">Submissions open</option>
          <option value="voting_open">Voting open</option><option value="voting_closed">Voting closed</option>
          <option value="finalized">Finalized</option>
        </select>
      </label>
      <label className="check"><input type="checkbox" name="submissionsOpen" defaultChecked={Boolean(settings.submissions_open)} /> Nickname submissions open</label>
      <label className="check"><input type="checkbox" name="votingOpen" defaultChecked={Boolean(settings.voting_open)} /> Voting open</label>
      <label className="check"><input type="checkbox" name="resultsVisible" defaultChecked={Boolean(settings.results_visible)} /> Show vote totals to users</label>
      <label className="check"><input type="checkbox" name="requireWhitelist" defaultChecked={Boolean(settings.require_whitelist)} /> Require approved email whitelist</label>
      <button className="button primary" disabled={loading}>{loading ? "Saving…" : "Save settings"}</button>
      {message && <p className="form-message">{message}</p>}
    </form>
  );
}
