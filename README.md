# Nickname Party Voting

A minimal deployable nickname suggestion and voting system with Google-only authentication, admin identity inspection, soft moderation, and immutable application audit logs.

## Stack

- Next.js 16 App Router
- Supabase Auth + PostgreSQL + Row Level Security
- Vercel deployment
- Node.js 22+

## Included features

- Google OAuth login only
- Optional approved-email whitelist
- 114-person CSV import
- Admin UI for participant/admin Google-email access
- One nickname suggestion per user per person
- One active vote per user per person; vote change/removal supported
- Admin-only visibility of nickname submitters and voters
- Nickname approve/hide/delete and restore through approve
- Manual final nickname selection
- Event controls: submissions, voting and result visibility
- Immutable database audit records with IP, browser, request ID, old/new values
- Supabase's own authentication audit logs remain available separately

## 1. Create Supabase project

Create a Supabase project, open **SQL Editor**, and run:

`supabase/migrations/001_initial.sql`

Before anyone logs in, seed at least one admin. After that, additional accounts can be imported from Admin → Access:

```sql
insert into public.allowed_emails(email, is_admin) values
  ('your-admin@gmail.com', true),
  ('participant1@gmail.com', false),
  ('participant2@gmail.com', false);
```

Emails must be lowercase.

## 2. Configure Google login

In Google Cloud Console:

1. Create an OAuth 2.0 Web Client.
2. Use the callback URL shown by Supabase under Authentication → Providers → Google.
3. Paste the Google client ID and secret into Supabase.
4. Keep all other sign-in providers disabled.

In Supabase Authentication URL configuration, add:

- Local: `http://localhost:3000/auth/callback`
- Production: `https://YOUR_DOMAIN/auth/callback`

## 3. Configure environment

```bash
cp .env.example .env.local
```

Get the URL and publishable key from Supabase's Connect dialog.

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_YOUR_KEY
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Never put a Supabase service-role key in this application.

## 4. Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## 5. Import the 114 people

Login with the admin Google account, open Admin → People, and paste CSV:

```csv
person_code,full_name,photo_url
210041001,Student One,
210041002,Student Two,https://example.com/photo.jpg
```

A sample is included at `public/people-template.csv`.

## 6. Deploy to Vercel

1. Push this folder to GitHub.
2. Import the repository in Vercel.
3. Add the same `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and production `NEXT_PUBLIC_SITE_URL` environment variables.
4. Deploy.
5. Add the final Vercel domain to both Google OAuth and Supabase redirect URL settings.

## Audit guarantee

Normal users cannot query other users' votes or nickname ownership. Direct table writes are blocked by RLS; writes use database functions that write an audit record in the same database transaction. The `audit_logs` table rejects update and delete operations.

For login/session events, use both:

- Application `audit_logs`
- Supabase `auth.audit_log_entries`

## Production checklist

- Add every participant email before opening the event.
- Verify the admin account can access `/admin`.
- Import exactly 114 people and validate IDs.
- Run a test with two non-admin accounts.
- Confirm normal users cannot open `/admin`.
- Confirm hidden/deleted nickname records remain in Audit Logs.
- Keep `require_whitelist` enabled.
- Close submissions before opening final voting if that matches your event rules.
- Export audit logs after the event if you need an offline archive.

## Known MVP limitation

The admin CSV parser is intentionally simple and expects commas only as separators. Names containing commas should be edited to remove the comma or imported directly through Supabase SQL. Photo upload storage is not included; use public image URLs or extend with Supabase Storage.
