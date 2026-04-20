-- Enforce the business rule:
-- one active map point per (division_code, site_object_id).
--
-- "Active" here matches the registry overlay and publish flow:
--   - planned
--   - in_progress with opened work and no exit yet

with ranked as (
  select
    v.id,
    row_number() over (
      partition by v.division_code, v.site_object_id
      order by
        case
          when v.status = 'planned' and nullif(btrim(coalesce(v.inspector_name_snapshot, '')), '') is not null then 0
          when v.status = 'planned' then 1
          when v.status = 'in_progress' and v.entry_at is not null and v.exit_at is null then 2
          else 3
        end,
        case
          when v.status = 'planned' and nullif(btrim(coalesce(v.inspector_name_snapshot, '')), '') is null then v.created_at
          else null
        end asc nulls last,
        coalesce(v.exit_at, v.entry_at, v.created_at) desc,
        v.created_at desc,
        v.id desc
    ) as rn
  from public.mpro_visits v
  where not coalesce(v.is_archived, false)
    and coalesce(nullif(btrim(v.site_object_id), ''), '') <> ''
    and (
      v.status = 'planned'
      or (
        v.status = 'in_progress'
        and v.entry_at is not null
        and v.exit_at is null
      )
    )
),
deleted as (
  delete from public.mpro_visits v
  using ranked r
  where v.id = r.id
    and r.rn > 1
    and v.status = 'planned'
  returning v.id
)
select count(*)::int as deleted_planned_duplicates
from deleted;

do $$
declare
  v_remaining_conflicts integer := 0;
begin
  select count(*)::int
  into v_remaining_conflicts
  from (
    select v.division_code, v.site_object_id
    from public.mpro_visits v
    where not coalesce(v.is_archived, false)
      and coalesce(nullif(btrim(v.site_object_id), ''), '') <> ''
      and (
        v.status = 'planned'
        or (
          v.status = 'in_progress'
          and v.entry_at is not null
          and v.exit_at is null
        )
      )
    group by v.division_code, v.site_object_id
    having count(*) > 1
  ) conflicts;

  if v_remaining_conflicts > 0 then
    raise exception 'ACTIVE_MAP_POINT_CONFLICT: осталось % конфликтов активных точек; сначала разберите in_progress-дубли', v_remaining_conflicts;
  end if;
end
$$;

create unique index if not exists mpro_visits_active_point_uidx
on public.mpro_visits (division_code, site_object_id)
where not coalesce(is_archived, false)
  and coalesce(nullif(btrim(site_object_id), ''), '') <> ''
  and (
    status = 'planned'
    or (
      status = 'in_progress'
      and entry_at is not null
      and exit_at is null
    )
  );

select public.sf_bump_named_data_state('mpro') as version;
