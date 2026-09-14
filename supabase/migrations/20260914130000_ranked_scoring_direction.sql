-- A ranking-only game (e.g. "who came in what place", no points at all) doesn't fit the
-- field-and-signed-total model: there's nothing to sum. `ranked` is a third scoring direction for
-- templates with zero fields, whose session_scores store a single synthetic `rank` field per
-- participant (1 = first place) instead of any real field value.
--
-- ADD VALUE can't run inside the same transaction as a statement that uses the new value, but it's
-- fine as the only statement in its own migration.
alter type public.scoring_direction add value 'ranked';
