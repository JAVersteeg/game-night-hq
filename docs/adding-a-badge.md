## How to add a badge

Everything is derived on read from session history — there's no migration and no write path, just a new definition.

### A pass-on badge (held by one player at a time)

1. In `src/features/badges/passOnBadges.ts`, add a `PassOnBadgeDefinition`:
   - `qualifies(session)` — which sessions this badge even looks at.
   - `resolve(qualifying)` — given every qualifying session so far (oldest first), who holds it now, or `null` if nobody does yet.
   - Optional `standings(qualifying)` if the badge has a rankable metric worth a detail-screen leaderboard (see `dominationStandings` for the pattern).
   - If the badge is per-game-template rather than a single global one (like "Koning van Catan"), write it as a function of `BadgeTemplate` — see `lastPlaceBadge` / `dominationBadge` — and wire it into `buildPassOnBadges` so it's generated once per relevant template.
2. Register the definition in `buildPassOnBadges` (either pushed once, like `LONGEST_STREAK_BADGE`, or mapped over templates).
3. Set `artKey: null` and `avatarMark: false` until there's art (see below) — a badge doesn't need a drawing to exist.
4. Write Dutch copy for `name`, `condition` (the one-liner on the card), and `description` (the detail-screen explanation) — all user-facing text in this app is Dutch.

### A milestone (cumulative, never lost)

1. In `src/features/badges/milestones.ts`, write a `measure(input: PlayerHistory)` function returning `{ current, achievedLabel }` — reuse `sessionCount`, `winStreak`, `attendanceStreak`, etc. as templates if the shape matches.
2. Add an entry to the `MILESTONES` array with `id`, Dutch `name`, and `target`.
3. `achievedLabel` should read `Gehaald op <datum>` (use the `onDate` helper) or similar — null until reached.

### Adding artwork to a badge

1. Get art generated/drawn per `docs/ideas/badge-art-brief.md` (palette, flat-token style, no white/gradients/trophies).
2. Drop the PNG(s) in `assets/badges/`. The filename itself carries no meaning to the app — it's only ever referenced from the one `require(...)` line you add next.
3. Register it in `src/features/badges/badgeArt.ts` under `BADGE_ART`, keyed by a new `artKey` (not the badge id).
4. Set that `artKey` on the badge definition:
   - For a one-off badge (like Grote Daggoe), set `artKey` directly in its definition.
   - For a badge generated per game template (like a domination badge), add `<gameKey>: '<artKey>'` to the relevant lookup table next to its name table — e.g. `DOMINATION_BADGE_ART` sits beside `DOMINATION_BADGE_NAMES` in `passOnBadges.ts`, keyed by game library key, so most templates still resolve to `artKey: null` until art exists for that game.
5. Set `featured: true` if it should get the big hexagon card treatment on `GroupBadgesScreen`, and `avatarMark: true` if the holder should wear it on their avatar everywhere (`avatarMarks.tsx`) — both require `artKey` to be set.
