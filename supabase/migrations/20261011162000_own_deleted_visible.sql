-- Authors can still see (and so soft-delete) their own posts; public views hide deleted rows.
drop policy "threads readable" on public.forum_threads;
create policy "threads readable" on public.forum_threads for select using (not deleted or author_id = (select auth.uid()) or public.is_admin());
drop policy "replies readable" on public.forum_replies;
create policy "replies readable" on public.forum_replies for select using (not deleted or author_id = (select auth.uid()) or public.is_admin());
