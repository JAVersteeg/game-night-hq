-- Templates created from a bundled preset (see src/features/games/presets.ts) remember which cover
-- art they used so the app can look the bundled image back up later. Free-form templates just leave
-- this null and the UI falls back to its placeholder — there's no upload path yet.
alter table public.game_templates
  add column cover_key text check (cover_key is null or cover_key ~ '^[a-z][a-z0-9_]{0,39}$');
