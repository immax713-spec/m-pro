with ranked as (
  select
    v.id,
    v.division_code,
    v.site_object_id,
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
select public.sf_bump_named_data_state('mpro') as version, count(*)::int as deleted_planned_duplicates
from deleted;
