-- A team game decided purely on which team won (Codenames, Secret Hitler) has nothing to sum, so it
-- gets its own scoring direction: the template has no fields, and the session records the winning
-- team instead of any score. See the team_games migration for the rest of the team model.
--
-- ADD VALUE can't run inside the same transaction as a statement that uses the new value, but it's
-- fine as the only statement in its own migration.
alter type public.scoring_direction add value 'team_win';
