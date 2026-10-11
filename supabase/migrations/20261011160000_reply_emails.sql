-- Reply notifications that should also go out by email (service role only).
create function public.reply_email_targets(since timestamptz)
returns table (notification_id uuid, email text, username text, unsubscribe_token uuid, title text, body text, url text)
language sql stable security definer set search_path = public, auth as $$
  select n.id, u.email::text, p.username, p.unsubscribe_token, n.title, n.body, n.url
  from notifications n join profiles p on p.id = n.user_id join auth.users u on u.id = n.user_id
  where n.kind = 'reply' and n.created_at >= since and p.email_replies and n.read_at is null
$$;
revoke all on function public.reply_email_targets(timestamptz) from public, anon, authenticated;
