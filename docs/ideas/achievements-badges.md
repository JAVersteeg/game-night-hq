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
- N wins in a row (per group, across all games in that group, and also per game).
- N sessions in a row without missing a game night (attendance streak).

**Pass-on badges** (jokey, held by whoever most recently triggered the condition — passes to someone else next time it happens)
- **"Grote Daggoe"** (dog picture) — awarded to the player who finished last in the most recently played De Grote Dalmuti session in the group. Held by exactly one person until the next Dalmuti session produces a new last-place finisher.
  - Text bij badge: "Balen man, jij bent de grote daggoe. Kan alleen maar afgestaan worden door de volgende keer niet te verliezen."
  - The design for this badge can be found in `assets/badges/grote_daggoe_badge.png`
- **Koning van Catan**: Highest "Winstfactor" for Catan in the group, not group-wide. Minimum of 8 games played for the holder.

More ideas for pass-on badges:
- Domination badges per game (similar) to "Koning van Catan". Less coveted because Catan is the highest prestige game in the group.

## Design

The UI designs for achievements and badges can be found in `design_system/project/ui_kits/app/achievements`.

On the GroupDashboardScreen in the top-right corner, left of the groupsettings icon, there must be a trophy icon which opens the GroupBadgesScreen. On this screen there are two tabs: badges and achievements.

On the GroupBadgesTab, there must be a prominent place for the pass-on badges Grote Daggoe and Koning van Catan, since they are the most wanted/hated (depending on the badge) badges in the group. Underneath that must be a section with other pass-on badges.

## Design notes / open questions

- **Pass-on badge mechanic**: needs its own tiny abstraction — "badge X is held by whoever most recently satisfied condition Y," recomputed from the most recent qualifying session each time it's viewed. Worth designing as a small reusable shape rather than one-off logic per badge, since more pass-on badges are likely.
- **Artwork**: pass-on badges reference specific imagery (e.g. a dog for Grote Daggoe) — will need actual assets, not just an icon/emoji, when this gets built. Jochem will try to design some badges.
