-- Admin-only CSV export source.
-- Returns active people with their highest-voted approved nickname.
-- Tied nicknames are joined with " | ". Vote totals remain hidden from participants.

create or replace function public.get_admin_result_export(
  _ip text,
  _user_agent text,
  _request_id text
)
returns table(
  person_code text,
  full_name text,
  most_voted_nickname text,
  vote_count bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  exported_rows integer;
begin
  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  select count(*) into exported_rows
  from public.people
  where is_active = true;

  perform public.write_audit(
    'results.exported',
    'results_export',
    null,
    null,
    null,
    jsonb_build_object('format', 'csv', 'row_count', exported_rows),
    _ip,
    _user_agent,
    _request_id
  );

  return query
  with nickname_votes as (
    select
      p.id as person_id,
      p.person_code,
      p.full_name,
      n.id as nickname_id,
      n.nickname,
      n.created_at,
      count(v.id)::bigint as nickname_vote_count
    from public.people p
    left join public.nickname_suggestions n
      on n.person_id = p.id
      and n.status = 'approved'
      and n.deleted_at is null
    left join public.votes v on v.nickname_id = n.id
    where p.is_active = true
    group by p.id, p.person_code, p.full_name, n.id, n.nickname, n.created_at
  ),
  ranked as (
    select
      nickname_votes.*,
      max(nickname_vote_count) over (partition by person_id) as highest_vote_count
    from nickname_votes
  )
  select
    r.person_code,
    r.full_name,
    case
      when bool_and(r.nickname_id is null) then 'No nickname submitted'
      when max(r.highest_vote_count) = 0 then 'No votes yet'
      else string_agg(r.nickname, ' | ' order by r.created_at)
        filter (
          where r.nickname_id is not null
            and r.nickname_vote_count = r.highest_vote_count
        )
    end as most_voted_nickname,
    coalesce(max(r.highest_vote_count), 0)::bigint as vote_count
  from ranked r
  group by r.person_id, r.person_code, r.full_name
  order by r.person_code;
end;
$$;

revoke execute on function public.get_admin_result_export(text, text, text)
  from public, anon;
grant execute on function public.get_admin_result_export(text, text, text)
  to authenticated;
