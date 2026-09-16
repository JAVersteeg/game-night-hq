# Adding a game to the library

Every game is identified by one id (`catan`, `heat`, `dalmuti`, …). The same string is used as the
library entry's `id`, the cover key, the colour key, and the `cover_key` stored on any template
created from it — so it must match exactly in every file below.

## Steps

1. **Library entry** — add `{ id: '<id>', name: '<Display name>' }` to `GAME_LIBRARY` in
   `src/features/games/presets.ts`. This alone makes the game searchable on the create-game screen.
2. **Cover art** — drop `<id>_cover.<ext>` in `assets/`, then add
   `<id>: require('../../../assets/game_covers/<id>_cover.<ext>')` to `GAME_COVERS` in
   `src/features/games/covers.ts`. Restart Metro; a newly added asset is not picked up by fast
   refresh.
3. **Colour** — add `<id>: '<hex>'` to `GAME_COLORS` in `src/features/games/colors.ts`.

## Optional

- **Scoring preset** — add a `GameTemplatePreset` with the same `id` to `GAME_TEMPLATE_PRESETS` in
  `src/features/games/presets.ts` to also prefill scoring direction and fields. Without one, the
  game is searchable and prefills name and cover only.

Steps 2 and 3 are each independently optional: a game with no cover renders a placeholder tinted
with its colour, and a game with no colour falls back to the neutral default.
