-- Traffic stats (no cookies, no IPs, no user ids), daily digest subscribers,
-- and reset/digest email preferences.

-- ---------- page views ----------
create table public.page_views (
  id bigserial primary key,
  at timestamptz not null default now(),
  path text not null,
  ref text,            -- referring site's host only
  new_visit boolean not null default false,  -- first page of a browser session
  device text          -- mobile | desktop
);
alter table public.page_views enable row level security; -- no policies: written only through track_view
create index page_views_at_idx on public.page_views (at);

create function public.track_view(p_path text, p_ref text default null, p_new boolean default false, p_device text default null) returns void
language sql security definer set search_path = public as $$
  insert into page_views (path, ref, new_visit, device)
  select left(p_path, 300), nullif(left(lower(p_ref), 120), ''), coalesce(p_new, false), case when p_device in ('mobile', 'desktop') then p_device end
  where p_path like '/%';
$$;
grant execute on function public.track_view(text, text, boolean, text) to anon, authenticated;

-- Admin-only summary for the private stats page.
create function public.traffic_summary(days int default 30) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare since timestamptz := now() - make_interval(days => least(greatest(days, 1), 365));
begin
  if not exists (select 1 from profiles where id = auth.uid() and is_admin) then raise exception 'not allowed'; end if;
  return jsonb_build_object(
    'daily', (select coalesce(jsonb_agg(d order by d.day), '[]') from (
      select (at at time zone 'America/New_York')::date as day, count(*) as views, count(*) filter (where new_visit) as visits
      from page_views where at >= since group by 1) d),
    'pages', (select coalesce(jsonb_agg(p), '[]') from (
      select path, count(*) as views from page_views where at >= since group by path order by 2 desc limit 25) p),
    'refs', (select coalesce(jsonb_agg(r), '[]') from (
      select coalesce(ref, '(direct)') as ref, count(*) filter (where new_visit) as visits from page_views where at >= since group by 1 order by 2 desc limit 15) r),
    'devices', (select coalesce(jsonb_agg(x), '[]') from (
      select coalesce(device, 'unknown') as device, count(*) filter (where new_visit) as visits from page_views where at >= since group by 1 order by 2 desc) x),
    'today', (select jsonb_build_object('views', count(*), 'visits', count(*) filter (where new_visit)) from page_views where at >= date_trunc('day', now() at time zone 'America/New_York') at time zone 'America/New_York'),
    'subscribers', (select count(*) from digest_subscribers where confirmed_at is not null and unsubscribed_at is null),
    'accounts', (select count(*) from profiles)
  );
end $$;
grant execute on function public.traffic_summary(int) to authenticated;

-- ---------- daily digest (no account needed; confirmed by email) ----------
create table public.digest_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and length(email) <= 254),
  token uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  confirm_sent_at timestamptz,
  confirmed_at timestamptz,
  unsubscribed_at timestamptz,
  source text
);
alter table public.digest_subscribers enable row level security; -- service role + the functions below only

create function public.subscribe_digest(p_email text, p_source text default null) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  -- A burst guard: at most 30 new sign-ups a minute site-wide.
  if (select count(*) from digest_subscribers where created_at > now() - interval '1 minute') >= 30 then return false; end if;
  insert into digest_subscribers (email, source) values (lower(trim(p_email)), left(p_source, 40))
  on conflict (email) do update set unsubscribed_at = null,
    confirm_sent_at = case when digest_subscribers.confirmed_at is null then null else digest_subscribers.confirm_sent_at end;
  return true;
end $$;
grant execute on function public.subscribe_digest(text, text) to anon, authenticated;

create function public.confirm_digest(p_token uuid) returns boolean
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  update digest_subscribers set confirmed_at = coalesce(confirmed_at, now()), unsubscribed_at = null where token = p_token;
  get diagnostics n = row_count;
  return n > 0;
end $$;
grant execute on function public.confirm_digest(uuid) to anon, authenticated;

-- ---------- new preferences for account holders ----------
alter table public.profiles add column email_digest boolean not null default true;
alter table public.profiles add column email_resets boolean not null default true;

-- Unsubscribe links now also cover the digest, reset alerts and digest-only subscribers.
create or replace function public.unsubscribe(token uuid, what text default 'all') returns boolean
language plpgsql security definer set search_path = public as $$
declare n int; m int;
begin
  update profiles set
    email_releases = case when what in ('all', 'releases') then false else email_releases end,
    email_rumors = case when what in ('all', 'rumors') then false else email_rumors end,
    email_replies = case when what in ('all', 'replies') then false else email_replies end,
    email_digest = case when what in ('all', 'digest') then false else email_digest end,
    email_resets = case when what in ('all', 'resets') then false else email_resets end
  where unsubscribe_token = token;
  get diagnostics n = row_count;
  update digest_subscribers set unsubscribed_at = now() where digest_subscribers.token = unsubscribe.token and unsubscribed_at is null;
  get diagnostics m = row_count;
  return n + m > 0;
end $$;
grant execute on function public.unsubscribe(uuid, text) to anon, authenticated;

-- Everyone who gets a broadcast email (digest, resets, big-lab releases): account holders with the
-- preference on, plus confirmed digest subscribers for the digest. Service role only.
create function public.broadcast_recipients(pref text) returns table (email text, token uuid)
language sql stable security definer set search_path = public as $$
  select u.email::text, p.unsubscribe_token from profiles p join auth.users u on u.id = p.id
  where u.email is not null and case pref when 'digest' then p.email_digest when 'resets' then p.email_resets when 'releases' then p.email_releases else false end
  union
  select s.email, s.token from digest_subscribers s
  where pref in ('digest', 'resets', 'releases') and s.confirmed_at is not null and s.unsubscribed_at is null
    and not exists (select 1 from auth.users u where lower(u.email) = s.email);
$$;
revoke all on function public.broadcast_recipients(text) from public, anon, authenticated;

-- Sending order when the daily email allowance is tight: confirmations and alerts before the digest.
alter table public.email_queue add column priority int not null default 5;
