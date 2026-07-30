import { AdminNicknameActions } from "@/components/admin-nickname-actions";
import { FinalizeButton } from "@/components/finalize-button";
import { createClient } from "@/lib/supabase/server";

type AdminNicknameRow = {
  id: string;
  nickname: string;
  status: "approved" | "hidden" | "deleted";
  moderation_reason: string | null;
  created_at: string;
  person_id: string;
  submitted_by: string;
  person: {
    full_name: string;
    person_code: string;
    finalized_nickname_id: string | null;
  } | null;
  submitter: {
    full_name: string | null;
    email: string;
  } | null;
  votes: Array<{ id: string }>;
};

export default async function AdminNicknamesPage() {
  const supabase = await createClient();

  /*
   * nickname_suggestions and people have two relationships:
   *   1. nickname_suggestions.person_id -> people.id
   *   2. people.finalized_nickname_id -> nickname_suggestions.id
   *
   * PostgREST therefore needs the FK name below. Without it, the request is
   * ambiguous and Supabase returns no data (PGRST201).
   */
  const { data, error } = await supabase
    .from("nickname_suggestions")
    .select(`
      id,
      nickname,
      status,
      moderation_reason,
      created_at,
      person_id,
      submitted_by,
      person:people!nickname_suggestions_person_id_fkey(
        full_name,
        person_code,
        finalized_nickname_id
      ),
      submitter:profiles!nickname_suggestions_submitted_by_fkey(
        full_name,
        email
      ),
      votes(id)
    `)
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <>
        <div className="page-title">
          <div>
            <h1>Nickname moderation</h1>
            <p className="muted">Submitter identity is admin-only.</p>
          </div>
        </div>
        <section className="card">
          <h2>Could not load nicknames</h2>
          <p className="muted">
            Supabase returned {error.code || "an unknown error"}: {error.message}
          </p>
          {error.hint && <p className="muted">Hint: {error.hint}</p>}
        </section>
      </>
    );
  }

  const nicknames = (data || []) as unknown as AdminNicknameRow[];

  return (
    <>
      <div className="page-title">
        <div>
          <h1>Nickname moderation</h1>
          <p className="muted">Submitter identity is admin-only.</p>
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Person</th>
              <th>Nickname</th>
              <th>Submitted by</th>
              <th>Votes</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {nicknames.length === 0 ? (
              <tr>
                <td colSpan={6} className="muted">
                  No nickname suggestions have been submitted yet.
                </td>
              </tr>
            ) : (
              nicknames.map((nickname) => (
                <tr key={nickname.id}>
                  <td>
                    {nickname.person?.full_name || "Unknown person"}
                    <br />
                    <span className="muted">{nickname.person?.person_code || "—"}</span>
                  </td>
                  <td>
                    <strong>{nickname.nickname}</strong>
                    {nickname.moderation_reason && (
                      <>
                        <br />
                        <span className="muted">{nickname.moderation_reason}</span>
                      </>
                    )}
                  </td>
                  <td>
                    {nickname.submitter?.full_name || "—"}
                    <br />
                    <span className="muted">{nickname.submitter?.email || "—"}</span>
                  </td>
                  <td>{nickname.votes?.length || 0}</td>
                  <td>
                    <span className={`badge ${nickname.status}`}>{nickname.status}</span>
                  </td>
                  <td>
                    <AdminNicknameActions id={nickname.id} status={nickname.status} />
                    {nickname.status === "approved" &&
                      nickname.person?.finalized_nickname_id !== nickname.id && (
                        <div style={{ marginTop: 8 }}>
                          <FinalizeButton personId={nickname.person_id} nicknameId={nickname.id} />
                        </div>
                      )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
