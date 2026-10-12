-- Contact form: messages are stored here and forwarded by email (scripts/notify.mjs) to the team.
create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text check (length(name) <= 100),
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and length(email) <= 254),
  topic text check (length(topic) <= 40),
  message text not null check (length(message) between 5 and 5000),
  forwarded_at timestamptz
);
alter table public.contact_messages enable row level security; -- written only through submit_contact

create function public.submit_contact(p_name text, p_email text, p_topic text, p_message text) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from contact_messages where created_at > now() - interval '10 minutes') >= 20 then return false; end if;
  if (select count(*) from contact_messages where lower(email) = lower(trim(p_email)) and created_at > now() - interval '1 hour') >= 3 then return false; end if;
  insert into contact_messages (name, email, topic, message) values (left(trim(p_name), 100), lower(trim(p_email)), left(p_topic, 40), left(trim(p_message), 5000));
  return true;
end $$;
grant execute on function public.submit_contact(text, text, text, text) to anon, authenticated;
alter table public.email_queue add column reply_to text;
