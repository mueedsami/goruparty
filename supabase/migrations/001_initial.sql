-- Nickname Party: secure schema, RLS and immutable application audit trail.
create extension if not exists pgcrypto;

create type public.user_role as enum ('user','admin');
create type public.nickname_status as enum ('approved','hidden','deleted');
create type public.event_status as enum ('draft','submissions_open','voting_open','voting_closed','finalized');

create table public.event_settings (
  id smallint primary key default 1 check (id = 1),
  event_name text not null default 'Nickname Party',
  event_status public.event_status not null default 'draft',
  submissions_open boolean not null default false,
  voting_open boolean not null default false,
  results_visible boolean not null default true,
  require_whitelist boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);
insert into public.event_settings(id) values (1) on conflict do nothing;

create table public.allowed_emails (
  email text primary key check (email = lower(email)),
  is_admin boolean not null default false,
  added_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  avatar_url text,
  role public.user_role not null default 'user',
  is_allowed boolean not null default false,
  created_at timestamptz not null default now(),
  last_login_at timestamptz
);

create table public.people (
  id uuid primary key default gen_random_uuid(),
  person_code text not null unique,
  full_name text not null,
  photo_url text,
  is_active boolean not null default true,
  finalized_nickname_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.nickname_suggestions (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people(id),
  nickname text not null check (char_length(trim(nickname)) between 1 and 60),
  normalized_nickname text generated always as (lower(regexp_replace(trim(nickname), '\s+', ' ', 'g'))) stored,
  submitted_by uuid not null references public.profiles(id),
  status public.nickname_status not null default 'approved',
  moderation_reason text,
  moderated_by uuid references public.profiles(id),
  moderated_at timestamptz,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
alter table public.people add constraint people_finalized_nickname_fk foreign key (finalized_nickname_id) references public.nickname_suggestions(id);
create unique index nickname_unique_per_person on public.nickname_suggestions(person_id, normalized_nickname) where deleted_at is null;
create unique index nickname_one_per_user_person on public.nickname_suggestions(person_id, submitted_by) where deleted_at is null;

create table public.votes (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people(id),
  nickname_id uuid not null references public.nickname_suggestions(id),
  voter_id uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(person_id, voter_id)
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id),
  actor_email_snapshot text,
  actor_role_snapshot text,
  action_type text not null,
  entity_type text,
  entity_id uuid,
  person_id uuid,
  old_data jsonb,
  new_data jsonb,
  ip_address inet,
  user_agent text,
  request_id text,
  created_at timestamptz not null default now()
);
create index audit_logs_created_idx on public.audit_logs(created_at desc);
create index audit_logs_actor_idx on public.audit_logs(actor_user_id, created_at desc);
create index audit_logs_person_idx on public.audit_logs(person_id, created_at desc);
create index audit_logs_action_idx on public.audit_logs(action_type, created_at desc);

create or replace function public.current_profile() returns public.profiles
language sql stable security definer set search_path=public as $$ select * from public.profiles where id=auth.uid() $$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path=public as $$ select coalesce((select role='admin' and is_allowed from public.profiles where id=auth.uid()),false) $$;

create or replace function public.assert_allowed() returns public.profiles
language plpgsql stable security definer set search_path=public as $$
declare p public.profiles;
begin
  if auth.uid() is null then raise exception 'User is not authenticated'; end if;
  select * into p from public.profiles where id=auth.uid();
  if p.id is null or not p.is_allowed then raise exception 'This account is not approved'; end if;
  return p;
end $$;

create or replace function public.safe_inet(_value text) returns inet
language plpgsql immutable as $$
begin
  if _value is null or trim(_value)='' then return null; end if;
  return trim(_value)::inet;
exception when others then return null;
end $$;

create or replace function public.write_audit(_action text,_entity_type text,_entity_id uuid,_person_id uuid,_old jsonb,_new jsonb,_ip text,_user_agent text,_request_id text) returns void
language plpgsql security definer set search_path=public as $$
declare p public.profiles;
begin
  select * into p from public.profiles where id=auth.uid();
  insert into public.audit_logs(actor_user_id,actor_email_snapshot,actor_role_snapshot,action_type,entity_type,entity_id,person_id,old_data,new_data,ip_address,user_agent,request_id)
  values(auth.uid(),p.email,p.role::text,_action,_entity_type,_entity_id,_person_id,_old,_new,public.safe_inet(_ip),_user_agent,_request_id);
end $$;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path=public as $$
declare allow_row public.allowed_emails; cfg public.event_settings;
begin
  select * into cfg from public.event_settings where id=1;
  select * into allow_row from public.allowed_emails where email=lower(new.email);
  insert into public.profiles(id,email,full_name,avatar_url,role,is_allowed)
  values(new.id,lower(new.email),coalesce(new.raw_user_meta_data->>'full_name',new.raw_user_meta_data->>'name'),new.raw_user_meta_data->>'avatar_url',case when allow_row.is_admin then 'admin'::public.user_role else 'user'::public.user_role end,case when cfg.require_whitelist then allow_row.email is not null else true end)
  on conflict(id) do update set email=excluded.email,full_name=excluded.full_name,avatar_url=excluded.avatar_url,role=excluded.role,is_allowed=excluded.is_allowed;
  return new;
end $$;
create trigger on_auth_user_created after insert or update of email,raw_user_meta_data on auth.users for each row execute procedure public.handle_new_user();

create or replace function public.sync_allowed_email() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  if tg_op='DELETE' then update public.profiles set is_allowed=false,role='user' where email=old.email; return old; end if;
  update public.profiles set is_allowed=true,role=case when new.is_admin then 'admin'::public.user_role else 'user'::public.user_role end where email=new.email;
  return new;
end $$;
create trigger allowed_email_sync after insert or update or delete on public.allowed_emails for each row execute procedure public.sync_allowed_email();

create or replace function public.prevent_audit_mutation() returns trigger language plpgsql as $$ begin raise exception 'Audit logs are immutable'; end $$;
create trigger immutable_audit before update or delete on public.audit_logs for each row execute procedure public.prevent_audit_mutation();

create or replace function public.get_people_directory()
returns table(id uuid,person_code text,full_name text,photo_url text,nickname_count bigint,total_votes bigint,leading_nickname text,final_nickname text)
language sql stable security definer set search_path=public as $$
  select p.id,p.person_code,p.full_name,p.photo_url,
    count(distinct n.id) filter(where n.status='approved' and n.deleted_at is null),
    count(v.id) filter(where n.status='approved' and n.deleted_at is null),
    (select ns.nickname from public.nickname_suggestions ns left join public.votes vv on vv.nickname_id=ns.id where ns.person_id=p.id and ns.status='approved' and ns.deleted_at is null group by ns.id order by count(vv.id) desc,ns.created_at asc limit 1),
    fn.nickname
  from public.people p
  left join public.nickname_suggestions n on n.person_id=p.id
  left join public.votes v on v.nickname_id=n.id
  left join public.nickname_suggestions fn on fn.id=p.finalized_nickname_id
  where p.is_active and (public.assert_allowed()).is_allowed
  group by p.id,fn.nickname order by p.person_code;
$$;

create or replace function public.get_person_nicknames(_person_id uuid)
returns table(nickname_id uuid,nickname text,vote_count bigint,has_voted boolean,is_final boolean)
language sql stable security definer set search_path=public as $$
  select n.id,n.nickname,count(v.id),bool_or(v.voter_id=auth.uid()),p.finalized_nickname_id=n.id
  from public.nickname_suggestions n join public.people p on p.id=n.person_id left join public.votes v on v.nickname_id=n.id
  where n.person_id=_person_id and n.status='approved' and n.deleted_at is null and (public.assert_allowed()).is_allowed
  group by n.id,p.finalized_nickname_id order by count(v.id) desc,n.created_at asc;
$$;

create or replace function public.submit_nickname(_person_id uuid,_nickname text,_ip text,_user_agent text,_request_id text) returns uuid
language plpgsql security definer set search_path=public as $$
declare p public.profiles; cfg public.event_settings; new_id uuid; clean text;
begin
  p:=public.assert_allowed(); select * into cfg from public.event_settings where id=1;
  if not cfg.submissions_open then raise exception 'Nickname submissions are closed'; end if;
  if exists(select 1 from public.people where id=_person_id and finalized_nickname_id is not null) then raise exception 'This person already has a final nickname'; end if;
  clean:=regexp_replace(trim(_nickname),'\s+',' ','g'); if char_length(clean) not between 1 and 60 then raise exception 'Nickname must be 1 to 60 characters'; end if;
  if exists(select 1 from public.nickname_suggestions where person_id=_person_id and submitted_by=p.id and deleted_at is null) then raise exception 'You already submitted a nickname for this person'; end if;
  insert into public.nickname_suggestions(person_id,nickname,submitted_by) values(_person_id,clean,p.id) returning id into new_id;
  perform public.write_audit('nickname.submitted','nickname',new_id,_person_id,null,jsonb_build_object('nickname',clean,'status','approved'),_ip,_user_agent,_request_id);
  return new_id;
exception when unique_violation then raise exception 'This nickname already exists for the person'; end $$;

create or replace function public.cast_vote(_person_id uuid,_nickname_id uuid,_ip text,_user_agent text,_request_id text) returns void
language plpgsql security definer set search_path=public as $$
declare p public.profiles; cfg public.event_settings; old_vote public.votes; current_nick public.nickname_suggestions;
begin
  p:=public.assert_allowed(); select * into cfg from public.event_settings where id=1;
  if not cfg.voting_open then raise exception 'Voting is closed'; end if;
  select * into current_nick from public.nickname_suggestions where id=_nickname_id and person_id=_person_id and status='approved' and deleted_at is null;
  if current_nick.id is null then raise exception 'Nickname is not available for voting'; end if;
  if exists(select 1 from public.people where id=_person_id and finalized_nickname_id is not null) then raise exception 'This nickname is already finalized'; end if;
  select * into old_vote from public.votes where person_id=_person_id and voter_id=p.id;
  insert into public.votes(person_id,nickname_id,voter_id) values(_person_id,_nickname_id,p.id)
  on conflict(person_id,voter_id) do update set nickname_id=excluded.nickname_id,updated_at=now();
  perform public.write_audit(case when old_vote.id is null then 'vote.placed' else 'vote.changed' end,'vote',coalesce(old_vote.id,(select id from public.votes where person_id=_person_id and voter_id=p.id)),_person_id,case when old_vote.id is null then null else to_jsonb(old_vote) end,jsonb_build_object('nickname_id',_nickname_id),_ip,_user_agent,_request_id);
end $$;

create or replace function public.remove_vote(_person_id uuid,_ip text,_user_agent text,_request_id text) returns void
language plpgsql security definer set search_path=public as $$
declare p public.profiles; old_vote public.votes;
begin
  p:=public.assert_allowed(); select * into old_vote from public.votes where person_id=_person_id and voter_id=p.id;
  if old_vote.id is null then return; end if;
  delete from public.votes where id=old_vote.id;
  perform public.write_audit('vote.removed','vote',old_vote.id,_person_id,to_jsonb(old_vote),null,_ip,_user_agent,_request_id);
end $$;

create or replace function public.moderate_nickname(_nickname_id uuid,_status public.nickname_status,_reason text,_ip text,_user_agent text,_request_id text) returns void
language plpgsql security definer set search_path=public as $$
declare p public.profiles; old_n public.nickname_suggestions;
begin
  p:=public.assert_allowed(); if p.role<>'admin' then raise exception 'Admin access required'; end if;
  select * into old_n from public.nickname_suggestions where id=_nickname_id; if old_n.id is null then raise exception 'Nickname not found'; end if;
  update public.nickname_suggestions set status=_status,moderation_reason=_reason,moderated_by=p.id,moderated_at=now(),deleted_at=case when _status='deleted' then now() else null end where id=_nickname_id;
  if _status<>'approved' then delete from public.votes where nickname_id=_nickname_id; update public.people set finalized_nickname_id=null where finalized_nickname_id=_nickname_id; end if;
  perform public.write_audit('nickname.moderated','nickname',_nickname_id,old_n.person_id,to_jsonb(old_n),jsonb_build_object('status',_status,'reason',_reason),_ip,_user_agent,_request_id);
end $$;

create or replace function public.finalize_nickname(_person_id uuid,_nickname_id uuid,_ip text,_user_agent text,_request_id text) returns void
language plpgsql security definer set search_path=public as $$
declare p public.profiles; old_person public.people;
begin
  p:=public.assert_allowed(); if p.role<>'admin' then raise exception 'Admin access required'; end if;
  if not exists(select 1 from public.nickname_suggestions where id=_nickname_id and person_id=_person_id and status='approved' and deleted_at is null) then raise exception 'Approved nickname not found'; end if;
  select * into old_person from public.people where id=_person_id; update public.people set finalized_nickname_id=_nickname_id,updated_at=now() where id=_person_id;
  perform public.write_audit('nickname.finalized','person',_person_id,_person_id,to_jsonb(old_person),jsonb_build_object('finalized_nickname_id',_nickname_id),_ip,_user_agent,_request_id);
end $$;

create or replace function public.admin_import_people(_rows jsonb,_ip text,_user_agent text,_request_id text) returns integer
language plpgsql security definer set search_path=public as $$
declare p public.profiles; row jsonb; c integer:=0; person_id uuid;
begin
  p:=public.assert_allowed(); if p.role<>'admin' then raise exception 'Admin access required'; end if;
  for row in select * from jsonb_array_elements(_rows) loop
    insert into public.people(person_code,full_name,photo_url) values(trim(row->>'person_code'),trim(row->>'full_name'),nullif(trim(row->>'photo_url'),''))
    on conflict(person_code) do update set full_name=excluded.full_name,photo_url=excluded.photo_url,updated_at=now() returning id into person_id;
    c:=c+1;
  end loop;
  perform public.write_audit('people.imported','people_import',null,null,null,jsonb_build_object('count',c),_ip,_user_agent,_request_id); return c;
end $$;

create or replace function public.admin_import_allowed_emails(_rows jsonb,_ip text,_user_agent text,_request_id text) returns integer
language plpgsql security definer set search_path=public as $$
declare p public.profiles; row jsonb; c integer:=0; clean_email text;
begin
  p:=public.assert_allowed(); if p.role<>'admin' then raise exception 'Admin access required'; end if;
  for row in select * from jsonb_array_elements(_rows) loop
    clean_email:=lower(trim(row->>'email'));
    if clean_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Invalid email: %',clean_email; end if;
    insert into public.allowed_emails(email,is_admin) values(clean_email,coalesce((row->>'is_admin')::boolean,false))
    on conflict(email) do update set is_admin=excluded.is_admin;
    c:=c+1;
  end loop;
  perform public.write_audit('access.imported','allowed_email_import',null,null,null,jsonb_build_object('count',c),_ip,_user_agent,_request_id); return c;
end $$;

create or replace function public.update_event_settings(_event_name text,_event_status public.event_status,_submissions_open boolean,_voting_open boolean,_results_visible boolean,_require_whitelist boolean,_ip text,_user_agent text,_request_id text) returns void
language plpgsql security definer set search_path=public as $$
declare p public.profiles; old_s public.event_settings;
begin
  p:=public.assert_allowed(); if p.role<>'admin' then raise exception 'Admin access required'; end if;
  select * into old_s from public.event_settings where id=1;
  update public.event_settings set event_name=trim(_event_name),event_status=_event_status,submissions_open=_submissions_open,voting_open=_voting_open,results_visible=_results_visible,require_whitelist=_require_whitelist,updated_at=now(),updated_by=p.id where id=1;
  perform public.write_audit('settings.updated','event_settings',null,null,to_jsonb(old_s),jsonb_build_object('event_name',_event_name,'event_status',_event_status,'submissions_open',_submissions_open,'voting_open',_voting_open,'results_visible',_results_visible,'require_whitelist',_require_whitelist),_ip,_user_agent,_request_id);
end $$;

create or replace function public.record_login(_ip text,_user_agent text,_request_id text) returns void
language plpgsql security definer set search_path=public as $$
begin update public.profiles set last_login_at=now() where id=auth.uid(); perform public.write_audit('auth.login','profile',auth.uid(),null,null,jsonb_build_object('success',true),_ip,_user_agent,_request_id); end $$;
create or replace function public.record_logout(_ip text,_user_agent text,_request_id text) returns void
language plpgsql security definer set search_path=public as $$ begin perform public.write_audit('auth.logout','profile',auth.uid(),null,null,null,_ip,_user_agent,_request_id); end $$;

alter table public.event_settings enable row level security;
alter table public.allowed_emails enable row level security;
alter table public.profiles enable row level security;
alter table public.people enable row level security;
alter table public.nickname_suggestions enable row level security;
alter table public.votes enable row level security;
alter table public.audit_logs enable row level security;

create policy settings_read on public.event_settings for select to authenticated using ((public.assert_allowed()).is_allowed);
create policy people_read on public.people for select to authenticated using ((public.assert_allowed()).is_allowed);
create policy profile_self_or_admin on public.profiles for select to authenticated using (id=auth.uid() or public.is_admin());
create policy own_nicknames_or_admin on public.nickname_suggestions for select to authenticated using (submitted_by=auth.uid() or public.is_admin());
create policy own_votes_or_admin on public.votes for select to authenticated using (voter_id=auth.uid() or public.is_admin());
create policy admin_logs_read on public.audit_logs for select to authenticated using (public.is_admin());
create policy admin_allowed_emails on public.allowed_emails for all to authenticated using (public.is_admin()) with check (public.is_admin());

revoke create on schema public from public;
revoke execute on function public.write_audit(text,text,uuid,uuid,jsonb,jsonb,text,text,text) from public,anon,authenticated;
revoke execute on function public.safe_inet(text) from public,anon,authenticated;
revoke execute on function public.handle_new_user() from public,anon,authenticated;
revoke execute on function public.sync_allowed_email() from public,anon,authenticated;
revoke execute on function public.prevent_audit_mutation() from public,anon,authenticated;

revoke all on public.audit_logs from anon,authenticated;
grant select on public.audit_logs to authenticated;
grant select on public.event_settings,public.people,public.profiles,public.nickname_suggestions,public.votes,public.allowed_emails to authenticated;
grant execute on function public.get_people_directory() to authenticated;
grant execute on function public.get_person_nicknames(uuid) to authenticated;
grant execute on function public.submit_nickname(uuid,text,text,text,text) to authenticated;
grant execute on function public.cast_vote(uuid,uuid,text,text,text) to authenticated;
grant execute on function public.remove_vote(uuid,text,text,text) to authenticated;
grant execute on function public.moderate_nickname(uuid,public.nickname_status,text,text,text,text) to authenticated;
grant execute on function public.finalize_nickname(uuid,uuid,text,text,text) to authenticated;
grant execute on function public.admin_import_people(jsonb,text,text,text) to authenticated;
grant execute on function public.admin_import_allowed_emails(jsonb,text,text,text) to authenticated;
grant execute on function public.update_event_settings(text,public.event_status,boolean,boolean,boolean,boolean,text,text,text) to authenticated;
grant execute on function public.record_login(text,text,text),public.record_logout(text,text,text) to authenticated;
