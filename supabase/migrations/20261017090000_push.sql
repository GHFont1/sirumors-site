-- Web push alerts for resets. Browsers subscribe through push_subscribe (anon), the
-- reset watcher (scripts/reset-push.mjs, service role) reads subscriptions and sends.
create table public.push_subs (
  endpoint text primary key check (endpoint ~ '^https://' and length(endpoint) <= 1000),
  p256dh text not null check (length(p256dh) <= 200),
  auth text not null check (length(auth) <= 100),
  topics text[] not null default '{codex}',
  ua text check (length(ua) <= 300),
  created_at timestamptz not null default now(),
  last_ok timestamptz,
  failures int not null default 0
);
alter table public.push_subs enable row level security; -- written only through the functions below

-- One row per alert sent. The primary key is the send lock: whichever watcher inserts it sends.
create table public.push_events (
  key text primary key,
  topic text not null,
  kind text not null check (kind in ('soon', 'done', 'test')),
  tweet_id text,
  title text not null,
  body text not null,
  url text not null,
  created_at timestamptz not null default now(),
  sent int,
  failed int
);
alter table public.push_events enable row level security;

-- Watcher heartbeat, read by the fixer lane.
create table public.push_health (
  id text primary key,
  checked_at timestamptz not null,
  ok boolean not null,
  note text
);
alter table public.push_health enable row level security;

create function public.push_subscribe(p_endpoint text, p_p256dh text, p_auth text, p_topics text[], p_ua text) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from push_subs where created_at > now() - interval '10 minutes') >= 200 then return false; end if;
  insert into push_subs (endpoint, p256dh, auth, topics, ua)
  values (p_endpoint, p_p256dh, p_auth, coalesce((select array_agg(t) from unnest(p_topics) t where t in ('codex', 'claude')), '{codex}'), left(p_ua, 300))
  on conflict (endpoint) do update set p256dh = excluded.p256dh, auth = excluded.auth, topics = excluded.topics, failures = 0;
  return true;
end $$;

create function public.push_unsubscribe(p_endpoint text) returns boolean
language sql security definer set search_path = public as $$
  delete from push_subs where endpoint = p_endpoint returning true;
$$;

grant execute on function public.push_subscribe(text, text, text, text[], text) to anon, authenticated;
grant execute on function public.push_unsubscribe(text) to anon, authenticated;
