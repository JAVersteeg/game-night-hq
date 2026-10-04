-- `single_winner` gave `sessions.winner_id` a composite FK onto session_participants. That added a
-- second relationship between the two tables (the original one is session_participants.session_id
-- -> sessions), so every `session_participants(user_id)` embed from `sessions` became ambiguous to
-- PostgREST (PGRST201) and history, live sessions and every stats query failed.
--
-- A plain FK onto auth.users adds no relationship PostgREST can embed (the auth schema isn't
-- exposed), and a trigger keeps the "a winner has to have played" rule the composite FK enforced.
alter table public.sessions drop constraint sessions_winner_is_participant;

alter table public.sessions
  add constraint sessions_winner_id_fkey
    foreign key (winner_id) references auth.users (id) on delete set null;

create function private.check_session_winner_is_participant()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.winner_id is not null and not exists (
    select 1 from public.session_participants sp
    where sp.session_id = new.id and sp.user_id = new.winner_id
  ) then
    raise exception 'the winner must be a participant of the session' using errcode = '23503';
  end if;
  return new;
end;
$$;

create trigger sessions_winner_is_participant
  before insert or update of winner_id on public.sessions
  for each row execute function private.check_session_winner_is_participant();
