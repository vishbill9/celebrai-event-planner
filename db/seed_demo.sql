-- OPTIONAL demo data for the judges' test account.
-- 1) Create the test user in Supabase: Authentication > Users > Add user > "Create new user",
--    tick "Auto Confirm User", and use the email and password given in the README.
-- 2) Run this script in the SQL editor. It looks the user up by email and adds one sample event.
--    Change the email below if you used a different one.

do $$
declare
  demo_user uuid;
  demo_event uuid;
begin
  select id into demo_user from auth.users where email = 'judge@celebrai.test' limit 1;
  if demo_user is null then
    raise notice 'Demo user not found. Create it first (see the comment at the top of this file).';
    return;
  end if;

  insert into public.events (user_id, title, event_type, event_date, location, guest_count, budget_total, description)
  values (demo_user, 'Asha''s surprise 30th birthday', 'Birthday', current_date + 45, 'Rooftop cafe', 40, 50000,
          'Fairy lights, live acoustic music and a slideshow of old photos.')
  returning id into demo_event;

  insert into public.guests (event_id, user_id, name, email, rsvp, plus_ones) values
    (demo_event, demo_user, 'Ravi Kumar', 'ravi@example.com', 'yes', 1),
    (demo_event, demo_user, 'Meera Singh', 'meera@example.com', 'maybe', 0),
    (demo_event, demo_user, 'Joseph Dsouza', '', 'pending', 2);

  insert into public.budget_items (event_id, user_id, category, description, estimated, actual, paid) values
    (demo_event, demo_user, 'Venue', 'Rooftop booking', 20000, 20000, true),
    (demo_event, demo_user, 'Food', 'Catering for 40', 18000, 0, false);
end
$$;
