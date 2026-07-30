-- Allow one participant to submit multiple distinct nicknames for the same person.
-- Keep exact duplicate nicknames blocked by nickname_unique_per_person.
drop index if exists public.nickname_one_per_user_person;

create or replace function public.submit_nickname(
  _person_id uuid,
  _nickname text,
  _ip text,
  _user_agent text,
  _request_id text
) returns uuid
language plpgsql security definer set search_path=public as $$
declare
  p public.profiles;
  cfg public.event_settings;
  new_id uuid;
  clean text;
begin
  p := public.assert_allowed();
  select * into cfg from public.event_settings where id=1;

  if not cfg.submissions_open then
    raise exception 'Nickname submissions are closed';
  end if;

  if exists(
    select 1 from public.people
    where id=_person_id and finalized_nickname_id is not null
  ) then
    raise exception 'This person already has a final nickname';
  end if;

  clean := regexp_replace(trim(_nickname),'\s+',' ','g');
  if char_length(clean) not between 1 and 60 then
    raise exception 'Nickname must be 1 to 60 characters';
  end if;

  insert into public.nickname_suggestions(person_id,nickname,submitted_by)
  values(_person_id,clean,p.id)
  returning id into new_id;

  perform public.write_audit(
    'nickname.submitted',
    'nickname',
    new_id,
    _person_id,
    null,
    jsonb_build_object('nickname',clean,'status','approved'),
    _ip,
    _user_agent,
    _request_id
  );

  return new_id;
exception
  when unique_violation then
    raise exception 'This nickname already exists for the person';
end $$;

-- Vote totals are intentionally hidden from participants.
update public.event_settings
set results_visible=false,
    updated_at=now()
where id=1;

alter table public.event_settings
alter column results_visible set default false;
