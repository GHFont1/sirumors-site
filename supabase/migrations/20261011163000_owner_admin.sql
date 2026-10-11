-- The site owner's account is a moderator from the moment it is created.
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, is_admin)
  values (new.id, lower(new.email) = 'bennyscalzo@greatcallathletics.com')
  on conflict do nothing;
  return new;
end $$;
