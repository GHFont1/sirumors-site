-- SI Rumors community backend: accounts, follows, notifications, forums,
-- and an email queue. Content is world-readable; writes are limited to the
-- signed-in author; notifications and follows are private to their owner.
-- The ingest job (service role) creates release/rumor notifications and
-- auto threads, and drains the email queue.

create extension if not exists pgcrypto;

-- ---------- profiles ----------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique check (username ~ '^[A-Za-z0-9_]{3,20}$'),
  is_admin boolean not null default false,
  email_releases boolean not null default true,
  email_rumors boolean not null default false,
  email_replies boolean not null default true,
  unsubscribe_token uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "read own profile" on public.profiles for select using ((select auth.uid()) = id);
create policy "update own profile" on public.profiles for update using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- Users can never grant themselves admin or rotate their unsubscribe token.
create function public.protect_profile_columns() returns trigger language plpgsql as $$
begin
  if auth.role() is distinct from 'service_role' and current_user not in ('postgres', 'supabase_admin') then
    new.is_admin := old.is_admin;
    new.unsubscribe_token := old.unsubscribe_token;
  end if;
  return new;
end $$;
create trigger profiles_protect before update on public.profiles for each row execute function public.protect_profile_columns();

-- Every new auth user gets a profile row (username chosen on first sign-in).
create function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Public author names (two columns only) for threads and replies.
create view public.community_users with (security_invoker = false) as
  select id, username, is_admin from public.profiles where username is not null;
grant select on public.community_users to anon, authenticated;

create function public.is_admin() returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false)
$$;

-- ---------- follows ----------
create table public.follows (
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('company', 'topic', 'person', 'line')),
  slug text not null check (char_length(slug) between 1 and 60),
  created_at timestamptz not null default now(),
  primary key (user_id, kind, slug)
);
alter table public.follows enable row level security;
create policy "read own follows" on public.follows for select using ((select auth.uid()) = user_id);
create policy "add own follows" on public.follows for insert with check ((select auth.uid()) = user_id);
create policy "remove own follows" on public.follows for delete using ((select auth.uid()) = user_id);
create index follows_target_idx on public.follows (kind, slug);

-- Public follower counts (no identities).
create view public.follow_counts with (security_invoker = false) as
  select kind, slug, count(*)::int as followers from public.follows group by kind, slug;
grant select on public.follow_counts to anon, authenticated;

-- ---------- notifications ----------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('release', 'rumor', 'reply', 'system')),
  title text not null,
  body text,
  url text,
  dedupe_key text,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  unique (user_id, dedupe_key)
);
alter table public.notifications enable row level security;
create policy "read own notifications" on public.notifications for select using ((select auth.uid()) = user_id);
create policy "mark own notifications" on public.notifications for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "delete own notifications" on public.notifications for delete using ((select auth.uid()) = user_id);
create index notifications_user_idx on public.notifications (user_id, created_at desc);

-- ---------- forums ----------
create table public.forum_threads (
  id uuid primary key default gen_random_uuid(),
  category text not null check (char_length(category) between 2 and 40),
  title text not null check (char_length(title) between 5 and 160),
  body text not null check (char_length(body) between 1 and 10000),
  author_id uuid references public.profiles (id) on delete set null,
  kind text not null default 'user' check (kind in ('user', 'release', 'rumor')),
  ref_key text unique,
  link_url text,
  reply_count integer not null default 0,
  score integer not null default 0,
  pinned boolean not null default false,
  locked boolean not null default false,
  deleted boolean not null default false,
  created_at timestamptz not null default now(),
  last_activity_at timestamptz not null default now()
);
alter table public.forum_threads enable row level security;
create policy "threads readable" on public.forum_threads for select using (not deleted or public.is_admin());
create policy "post own threads" on public.forum_threads for insert
  with check ((select auth.uid()) = author_id and kind = 'user' and not pinned and not locked and not deleted and reply_count = 0 and score = 0);
create policy "author or admin edits" on public.forum_threads for update
  using ((select auth.uid()) = author_id or public.is_admin()) with check ((select auth.uid()) = author_id or public.is_admin());
create index forum_threads_cat_idx on public.forum_threads (category, last_activity_at desc);
create index forum_threads_activity_idx on public.forum_threads (last_activity_at desc);

create table public.forum_replies (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.forum_threads (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 5000),
  author_id uuid references public.profiles (id) on delete set null,
  deleted boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.forum_replies enable row level security;
create policy "replies readable" on public.forum_replies for select using (not deleted or public.is_admin());
create policy "post own replies" on public.forum_replies for insert with check (
  (select auth.uid()) = author_id and not deleted
  and exists (select 1 from public.forum_threads t where t.id = thread_id and not t.locked and not t.deleted));
create policy "author or admin edits replies" on public.forum_replies for update
  using ((select auth.uid()) = author_id or public.is_admin()) with check ((select auth.uid()) = author_id or public.is_admin());
create index forum_replies_thread_idx on public.forum_replies (thread_id, created_at);

create table public.thread_votes (
  user_id uuid not null references public.profiles (id) on delete cascade,
  thread_id uuid not null references public.forum_threads (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, thread_id)
);
alter table public.thread_votes enable row level security;
create policy "read own votes" on public.thread_votes for select using ((select auth.uid()) = user_id);
create policy "cast own vote" on public.thread_votes for insert with check ((select auth.uid()) = user_id);
create policy "remove own vote" on public.thread_votes for delete using ((select auth.uid()) = user_id);

-- Posting needs a username, and is rate limited.
create function public.forum_guard() returns trigger language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if new.author_id is null then return new; end if; -- system posts
  if (select username from profiles where id = new.author_id) is null then
    raise exception 'Choose a username before posting';
  end if;
  if tg_table_name = 'forum_threads' then
    select count(*) into n from forum_threads where author_id = new.author_id and created_at > now() - interval '1 hour';
    if n >= 5 then raise exception 'Slow down: 5 new threads per hour'; end if;
  else
    select count(*) into n from forum_replies where author_id = new.author_id and created_at > now() - interval '1 hour';
    if n >= 40 then raise exception 'Slow down: 40 replies per hour'; end if;
  end if;
  return new;
end $$;
create trigger forum_threads_guard before insert on public.forum_threads for each row execute function public.forum_guard();
create trigger forum_replies_guard before insert on public.forum_replies for each row execute function public.forum_guard();

-- Counters, activity bump and reply notifications.
create function public.on_reply() returns trigger language plpgsql security definer set search_path = public as $$
declare t record; who text;
begin
  update forum_threads set reply_count = reply_count + 1, last_activity_at = now() where id = new.thread_id returning * into t;
  if t.author_id is not null and t.author_id is distinct from new.author_id then
    select username into who from profiles where id = new.author_id;
    insert into notifications (user_id, kind, title, body, url, dedupe_key)
    values (t.author_id, 'reply', coalesce(who, 'Someone') || ' replied to your thread', left(new.body, 140),
            '/forums/thread/?id=' || t.id, 'reply:' || new.id)
    on conflict do nothing;
  end if;
  return new;
end $$;
create trigger forum_replies_after after insert on public.forum_replies for each row execute function public.on_reply();

create function public.on_vote() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then update forum_threads set score = score + 1 where id = new.thread_id;
  else update forum_threads set score = greatest(0, score - 1) where id = old.thread_id; end if;
  return null;
end $$;
create trigger thread_votes_after after insert or delete on public.thread_votes for each row execute function public.on_vote();

-- Users may only edit title/body/deleted of their own posts; counters stay server-owned.
create function public.protect_thread_columns() returns trigger language plpgsql as $$
begin
  if not public.is_admin() and auth.role() is distinct from 'service_role' and current_user not in ('postgres', 'supabase_admin') then
    new.reply_count := old.reply_count; new.score := old.score; new.pinned := old.pinned; new.locked := old.locked;
    new.kind := old.kind; new.ref_key := old.ref_key; new.author_id := old.author_id; new.category := old.category;
    new.created_at := old.created_at;
  end if;
  return new;
end $$;
create trigger forum_threads_protect before update on public.forum_threads for each row execute function public.protect_thread_columns();

-- Public read model with author names.
create view public.thread_list with (security_invoker = true) as
  select t.id, t.category, t.title, left(t.body, 280) as excerpt, t.kind, t.link_url, t.reply_count, t.score,
         t.pinned, t.locked, t.created_at, t.last_activity_at, u.username as author, coalesce(u.is_admin, false) as author_admin
  from public.forum_threads t left join public.community_users u on u.id = t.author_id
  where not t.deleted;
grant select on public.thread_list to anon, authenticated;

create view public.reply_list with (security_invoker = true) as
  select r.id, r.thread_id, r.body, r.created_at, r.author_id, u.username as author, coalesce(u.is_admin, false) as author_admin
  from public.forum_replies r left join public.community_users u on u.id = r.author_id
  where not r.deleted;
grant select on public.reply_list to anon, authenticated;

-- ---------- email queue (service role only) ----------
create table public.email_queue (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete cascade,
  to_email text not null,
  subject text not null,
  html text not null,
  text_body text,
  dedupe_key text unique,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  attempts integer not null default 0,
  last_error text
);
alter table public.email_queue enable row level security; -- no policies: service role only

-- Recipients for an event: followers of any of the given targets, with email.
create function public.event_recipients(targets jsonb, pref text)
returns table (user_id uuid, email text, username text, unsubscribe_token uuid)
language sql stable security definer set search_path = public, auth as $$
  select distinct p.id, u.email::text, p.username, p.unsubscribe_token
  from follows f
  join profiles p on p.id = f.user_id
  join auth.users u on u.id = p.id
  where exists (select 1 from jsonb_array_elements(targets) t where t->>'kind' = f.kind and t->>'slug' = f.slug)
    and case pref when 'releases' then p.email_releases when 'rumors' then p.email_rumors else true end
$$;
revoke all on function public.event_recipients(jsonb, text) from public, anon, authenticated;

-- Followers (in-app notifications regardless of email prefs).
create function public.event_followers(targets jsonb)
returns table (user_id uuid)
language sql stable security definer set search_path = public as $$
  select distinct f.user_id from follows f
  where exists (select 1 from jsonb_array_elements(targets) t where t->>'kind' = f.kind and t->>'slug' = f.slug)
$$;
revoke all on function public.event_followers(jsonb) from public, anon, authenticated;

-- One-click unsubscribe from a static page (token in the email link).
create function public.unsubscribe(token uuid, what text default 'all') returns boolean
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  update profiles set
    email_releases = case when what in ('all', 'releases') then false else email_releases end,
    email_rumors = case when what in ('all', 'rumors') then false else email_rumors end,
    email_replies = case when what in ('all', 'replies') then false else email_replies end
  where unsubscribe_token = token;
  get diagnostics n = row_count;
  return n > 0;
end $$;
grant execute on function public.unsubscribe(uuid, text) to anon, authenticated;

-- Username availability without exposing profiles.
create function public.username_taken(name text) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where lower(username) = lower(name))
$$;
grant execute on function public.username_taken(text) to anon, authenticated;
