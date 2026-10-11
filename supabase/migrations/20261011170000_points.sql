-- SI Points: reputation earned for activity, awarded only by database
-- triggers and functions (never by the client), so it can't be farmed by
-- editing requests. Ranks are computed from points on the client.

alter table public.profiles
  add column points integer not null default 0,
  add column streak_current integer not null default 0,
  add column streak_best integer not null default 0,
  add column last_checkin date,
  add column founding boolean not null default false;

create table public.points_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  key text not null,
  label text not null,
  points integer not null,
  created_at timestamptz not null default now(),
  unique (user_id, key)
);
alter table public.points_ledger enable row level security;
create policy "read own points" on public.points_ledger for select using ((select auth.uid()) = user_id);
create index points_ledger_user_idx on public.points_ledger (user_id, created_at desc);

create table public.user_badges (
  user_id uuid not null references public.profiles (id) on delete cascade,
  badge text not null check (badge in ('founding', 'moderator', 'called-it', 'supporter', 'hf-pro', 'builder', 'verified')),
  note text,
  awarded_at timestamptz not null default now(),
  primary key (user_id, badge)
);
alter table public.user_badges enable row level security;
create policy "badges readable" on public.user_badges for select using (true);
create policy "admins award badges" on public.user_badges for insert with check (public.is_admin());
create policy "admins remove badges" on public.user_badges for delete using (public.is_admin());

create function public.award(uid uuid, k text, lbl text, pts integer) returns void
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if uid is null then return; end if;
  insert into points_ledger (user_id, key, label, points) values (uid, k, lbl, pts) on conflict do nothing;
  get diagnostics n = row_count;
  if n > 0 then update profiles set points = points + pts where id = uid; end if;
end $$;

create function public.revoke_points(uid uuid, k text) returns void
language plpgsql security definer set search_path = public as $$
declare p int;
begin
  delete from points_ledger where user_id = uid and key = k returning points into p;
  if p is not null then update profiles set points = greatest(0, points - p) where id = uid; end if;
end $$;
revoke all on function public.award(uuid, text, text, integer) from public, anon, authenticated;
revoke all on function public.revoke_points(uuid, text) from public, anon, authenticated;

-- username chosen: +100 once
create function public.points_profile() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.username is null and new.username is not null then perform award(new.id, 'profile', 'Created your profile', 100); end if;
  return null;
end $$;
create trigger points_profile after update of username on public.profiles for each row execute function public.points_profile();

-- thread: +100; deleting it takes the points back
create function public.points_thread() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' and new.author_id is not null then
    perform award(new.author_id, 'thread:' || new.id, 'Started a thread', 100);
  elsif tg_op = 'UPDATE' and new.deleted and not old.deleted and new.author_id is not null then
    perform revoke_points(new.author_id, 'thread:' || new.id);
  end if;
  return null;
end $$;
create trigger points_thread after insert or update of deleted on public.forum_threads for each row execute function public.points_thread();

-- reply: +25 once per thread; thread author gets +5 per reply from someone else
create function public.points_reply() returns trigger language plpgsql security definer set search_path = public as $$
declare author uuid;
begin
  if new.author_id is null then return null; end if;
  perform award(new.author_id, 'reply:' || new.thread_id, 'Replied in a thread', 25);
  select author_id into author from forum_threads where id = new.thread_id;
  if author is not null and author <> new.author_id then
    perform award(author, 'got-reply:' || new.id, 'Your thread got a reply', 5);
  end if;
  return null;
end $$;
create trigger points_reply after insert on public.forum_replies for each row execute function public.points_reply();

-- upvote received: +10 (gone if the vote is removed); no points for upvoting yourself
create function public.points_vote() returns trigger language plpgsql security definer set search_path = public as $$
declare author uuid; r record;
begin
  if tg_op = 'INSERT' then r := new; else r := old; end if;
  select author_id into author from forum_threads where id = r.thread_id;
  if author is null or author = r.user_id then return null; end if;
  if tg_op = 'INSERT' then perform award(author, 'upvote:' || r.thread_id || ':' || r.user_id, 'Your thread was upvoted', 10);
  else perform revoke_points(author, 'upvote:' || r.thread_id || ':' || r.user_id); end if;
  return null;
end $$;
create trigger points_vote after insert or delete on public.thread_votes for each row execute function public.points_vote();

-- following 5 things: +50 once
create function public.points_follow() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from follows where user_id = new.user_id) >= 5 then
    perform award(new.user_id, 'feed-setup', 'Built your feed (5 follows)', 50);
  end if;
  return null;
end $$;
create trigger points_follow after insert on public.follows for each row execute function public.points_follow();

-- Daily check-in: +10 a day, +50 on every 7-day streak.
create function public.checkin() returns json language plpgsql security definer set search_path = public as $$
declare p profiles; today date := (now() at time zone 'America/New_York')::date; s int;
begin
  select * into p from profiles where id = auth.uid();
  if p.id is null then return null; end if;
  if p.last_checkin = today then return json_build_object('points', p.points, 'streak', p.streak_current, 'awarded', 0); end if;
  s := case when p.last_checkin = today - 1 then p.streak_current + 1 else 1 end;
  update profiles set last_checkin = today, streak_current = s, streak_best = greatest(streak_best, s) where id = p.id;
  perform award(p.id, 'checkin:' || today, 'Daily check-in', 10);
  if s % 7 = 0 then perform award(p.id, 'streak7:' || today, s || '-day streak bonus', 50); end if;
  return json_build_object('points', (select points from profiles where id = p.id), 'streak', s, 'awarded', case when s % 7 = 0 then 60 else 10 end);
end $$;
grant execute on function public.checkin() to authenticated;

-- Founding members: the first 1,000 accounts. Owner is moderator.
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
declare is_owner boolean := lower(new.email) = 'bennyscalzo@greatcallathletics.com';
declare early boolean := (select count(*) from public.profiles) < 1000;
begin
  insert into public.profiles (id, is_admin, founding) values (new.id, is_owner, early) on conflict do nothing;
  if early then insert into public.user_badges (user_id, badge) values (new.id, 'founding') on conflict do nothing; end if;
  if is_owner then insert into public.user_badges (user_id, badge) values (new.id, 'moderator') on conflict do nothing; end if;
  return new;
end $$;

-- Points must never be edited directly by users.
create or replace function public.protect_profile_columns() returns trigger language plpgsql as $$
begin
  if auth.role() is distinct from 'service_role' and current_user not in ('postgres', 'supabase_admin') then
    new.is_admin := old.is_admin;
    new.unsubscribe_token := old.unsubscribe_token;
    new.points := old.points;
    new.streak_current := old.streak_current;
    new.streak_best := old.streak_best;
    new.last_checkin := old.last_checkin;
    new.founding := old.founding;
  end if;
  return new;
end $$;

-- Public identity now carries reputation.
create or replace view public.community_users with (security_invoker = false) as
  select id, username, is_admin, points, founding, streak_best, created_at from public.profiles where username is not null;
grant select on public.community_users to anon, authenticated;

create or replace view public.thread_list with (security_invoker = true) as
  select t.id, t.category, t.title, left(t.body, 280) as excerpt, t.kind, t.link_url, t.reply_count, t.score,
         t.pinned, t.locked, t.created_at, t.last_activity_at, u.username as author, coalesce(u.is_admin, false) as author_admin,
         u.points as author_points, coalesce(u.founding, false) as author_founding
  from public.forum_threads t left join public.community_users u on u.id = t.author_id
  where not t.deleted;
grant select on public.thread_list to anon, authenticated;

create or replace view public.reply_list with (security_invoker = true) as
  select r.id, r.thread_id, r.body, r.created_at, r.author_id, u.username as author, coalesce(u.is_admin, false) as author_admin,
         u.points as author_points, coalesce(u.founding, false) as author_founding
  from public.forum_replies r left join public.community_users u on u.id = r.author_id
  where not r.deleted;
grant select on public.reply_list to anon, authenticated;

create view public.leaderboard with (security_invoker = false) as
  select u.username, u.points, u.founding, u.is_admin, u.streak_best, u.created_at,
         (select count(*) from public.forum_threads t where t.author_id = u.id and not t.deleted)::int as threads,
         (select count(*) from public.forum_replies r where r.author_id = u.id and not r.deleted)::int as replies,
         coalesce((select array_agg(b.badge) from public.user_badges b where b.user_id = u.id), '{}') as badges
  from public.community_users u
  order by u.points desc
  limit 200;
grant select on public.leaderboard to anon, authenticated;
