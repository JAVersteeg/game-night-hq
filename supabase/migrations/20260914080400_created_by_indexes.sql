-- Both created_by columns are ON DELETE SET NULL. Without a covering index, deleting an auth user
-- sequentially scans these tables to null the references. Small tables today, but the linter is
-- right and the indexes cost nothing at this size.
create index groups_created_by_idx on public.groups (created_by);
create index game_templates_created_by_idx on public.game_templates (created_by);
