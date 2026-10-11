alter table public.forum_threads drop constraint forum_threads_kind_check;
alter table public.forum_threads add constraint forum_threads_kind_check check (kind in ('user', 'release', 'rumor', 'system'));
