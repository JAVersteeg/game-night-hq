# Achievements / Badges

Fun, derived-only badge layer, scoped per group (no global/cross-group badges).

## Scope & computation

- Badges are computed **per group**, fully derived on read from existing session history — no new tables, no write path, no "earned on" timestamp.
- Since there's nothing to backfill or notify about (fully derived), there's no session-end unlock moment/toast — badges just reflect current state whenever viewed.

## Where they're shown

- **Own profile screen**: per-group breakdown of which badges the signed-in user currently holds in each group they belong to.
- **Group Settings screen** (`GroupSettingsScreen.tsx`): tapping a player in the member list shows that player's badges for this group.

## Badge types

**Milestones** (session count)
- Simple thresholds on number of sessions played in the group (e.g. 1st, 10th, 50th, 100th).

**Streaks**
- N wins in a row (per group, across all games in that group — or should this be per-game? flag for later, see Open Questions).
- N sessions in a row without missing a game night (attendance streak).

**Domination (per game)**
- Highest win % *within a specific game template* in the group, not group-wide. Needs a minimum-session qualifier so one lucky win doesn't count.

**Weekly player**
- Played on 4 or more distinct days within a single calendar month, within the group.

**Pass-on badges** (jokey, held by whoever most recently triggered the condition — passes to someone else next time it happens)
- **"Grote Daggoe"** (dog picture) — awarded to the player who finished last in the most recently played De Grote Dalmuti session in the group. Held by exactly one person until the next Dalmuti session produces a new last-place finisher.
- Room for more of this type later (same "pass-on" mechanic, different trigger condition) — that's the notable design pattern here, not just this one badge.

## Design notes / open questions

- **Streak scope**: "N wins in a row" — per game template, or any win in the group counts toward the streak regardless of which game? Leaning per-game-template but not decided.
- **Pass-on badge mechanic**: needs its own tiny abstraction — "badge X is held by whoever most recently satisfied condition Y," recomputed from the most recent qualifying session each time it's viewed. Worth designing as a small reusable shape rather than one-off logic per badge, since more pass-on badges are likely.
- **Artwork**: pass-on badges reference specific imagery (e.g. a dog for Grote Daggoe) — will need actual assets, not just an icon/emoji, when this gets built.
- **Qualifying thresholds**: exact numbers (10th session? min. 5 sessions for a domination badge?) not finalized — pick sensible defaults when this stage is planned, per CLAUDE.md's "simplest choice that satisfies the requirement" guidance.
