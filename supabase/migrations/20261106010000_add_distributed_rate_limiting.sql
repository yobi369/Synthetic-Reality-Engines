-- Distributed fixed-window rate limiting for the dedicated SRE Supabase project.
create table if not exists public.sre_rate_limits (
  bucket_hash text not null,
  window_start timestamptz not null,
  hit_count integer not null check (hit_count >= 1),
  primary key (bucket_hash, window_start)
);
create index if not exists sre_rate_limits_window_idx on public.sre_rate_limits(window_start);
alter table public.sre_rate_limits enable row level security;
revoke all on public.sre_rate_limits from anon, authenticated;
grant all on public.sre_rate_limits to service_role;

create or replace function public.sre_consume_rate_limit(
  p_bucket_hash text,
  p_window_start timestamptz,
  p_maximum integer
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_hits integer;
begin
  if p_bucket_hash is null or length(p_bucket_hash) <> 64
     or p_maximum < 1 or p_maximum > 100000 then
    raise exception 'Invalid rate-limit parameters';
  end if;
  insert into public.sre_rate_limits(bucket_hash, window_start, hit_count)
  values (p_bucket_hash, p_window_start, 1)
  on conflict (bucket_hash, window_start)
  do update set hit_count = public.sre_rate_limits.hit_count + 1
  returning hit_count into current_hits;
  return current_hits <= p_maximum;
end;
$$;
revoke all on function public.sre_consume_rate_limit(text, timestamptz, integer) from public, anon, authenticated;
grant execute on function public.sre_consume_rate_limit(text, timestamptz, integer) to service_role;
