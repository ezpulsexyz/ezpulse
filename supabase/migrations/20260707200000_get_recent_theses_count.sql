create or replace function public.get_recent_theses_count(
  p_token_ca text,
  p_days integer default 7
)
returns integer
language sql
stable
set search_path = public
as $$
  select count(*)::integer
  from public.investor_theses
  where token_ca = p_token_ca
    and created_at >= now() - (p_days || ' days')::interval;
$$;

grant execute on function public.get_recent_theses_count(text, integer) to anon;