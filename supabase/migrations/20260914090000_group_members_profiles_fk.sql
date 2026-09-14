-- group_members.user_id already references auth.users. This second FK targets public.profiles so
-- PostgREST can embed member display names in a single request; `auth` is not an exposed schema, so
-- the existing constraint is invisible to it. `profiles.id` is itself an FK to auth.users, so the
-- two constraints can never disagree about which user a row points at.
--
-- It also enforces at the database level something the app already guarantees: RootNavigator blocks
-- AppStack until a profile row exists, so nobody can create or join a group without one.
alter table public.group_members
  add constraint group_members_user_id_profiles_fkey
  foreign key (user_id) references public.profiles (id) on delete cascade;
