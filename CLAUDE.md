# CLAUDE.md

This file guides Claude Code when working on this repository. Read it in full before making changes. If a change you're about to make contradicts something here, stop and flag it rather than silently deviating.

## Project Overview

A mobile app for tracking scores of games played with friends — board games, card games, whatever the group plays. Multiple friend groups, multiple game types per group, live score entry during play, and a full stats dashboard built from session history.

**Working name:** `Game Night HQ`

## Tech Stack

- **Framework:** React Native + Expo (managed workflow), TypeScript throughout
- **Backend:** Supabase — Postgres, Auth, Realtime, Row Level Security for all access control
- **Styling:** NativeWind
- **Package manager:** pnpm
- **State:** prefer React Query (or Supabase's client cache) for server state; local component state / Zustand only for pure UI state. Avoid Redux — no need for it at this scope.

If a library decision isn't covered here, pick the smallest dependency that solves the problem and say what you chose and why.

## Auth

- Identity is created via Supabase anonymous sign-in (`signInAnonymously()`) on first launch — no email, password, or signup screen. The person is only asked for a display name once, which reads as "who are you," not "create an account."
- The resulting anonymous user is a real `auth.users` row with a normal session and JWT (`is_anonymous` claim available if a policy ever needs to distinguish). No schema changes elsewhere — every table that references a user ID works the same regardless of whether that ID is anonymous.
- Known tradeoff, accepted for v1: identity is device-bound. Uninstalling the app, clearing app data, or switching devices loses access to that identity, with no recovery path yet. See Deferred Features for the eventual fix.
- This also sidesteps Apple's Sign-in-with-Apple requirement, since that rule only triggers when you offer other third-party/social logins — anonymous auth isn't one.

## Domain Model

**Group**
- A friend group. A user can belong to many groups.
- Has members (via `group_members`), an invite code/link, and its own set of games and session history.
- No cross-group data sharing — stats, games, and templates are scoped per group.

**Game Template**
- Defined per group, by any member (not just a group "admin" — no admin role planned for v1).
- Has a name, a list of custom fields, a scoring direction, and optional bonus rules.
- **Field:** `{ key, label, type: "number", sign: 1 | -1, default: number }`. The sign lets a field count against the total (e.g. "penalty cards" as sign -1) without needing a formula language.
- **Scoring direction:** `highest_total_wins` | `lowest_total_wins`, computed as the signed sum of a player's fields for that session, plus any bonus rule deltas.
- **Bonus rule (optional, list):** `{ condition: { field_key, operator: "==" | ">" | "<" | ">=" | "<=", value }, points_delta }`. Evaluated per player at session end. This covers "bonus/penalty conditions" without a full expression engine — see Open Decisions if this turns out to be insufficient.

**Session**
- One instance of playing a game, within a group, on a given date.
- Has a `scorekeeper_id` (a group member), chosen fresh when the session is created — not a fixed role.
- Has participants (a subset of group members) and one set of field values per participant.
- **v1 is single-round**: one set of field values per player per session, not per-round entries. See Non-Goals.
- Only the scorekeeper can write score entries for a session in progress. Everyone else in the group gets read-only realtime updates.

**Stats (derived, not stored)**
Computed from session history per group, at minimum:
- Per-game leaderboard (wins, win %, average total score)
- Score trends over time per player, per game (for charting)
- Head-to-head record between any two specific group members, per game and overall

**Profile**
- The signed-in user's own account page, reached from an avatar button in the top-right corner of the group list.
- Shows their display name and an avatar, and is where they change their name.
- Also the home for *personal* stats — the user's own record across every group they belong to, as opposed to the per-group stats that live in a group's history tab.
- The avatar is backed by `profiles.avatar_url`. Until image upload exists, the avatar renders as initials derived from the display name.

## Key Flows

1. **Onboarding:** silent anonymous sign-in → prompt for a display name (once) → land on group list (empty state: "create or join a group")
2. **Create/join group:** create generates an invite code/link; joining consumes one and adds the user to `group_members`
3. **Define a game:** from within a group, add a game template — name, fields (with sign), scoring direction, optional bonus rules
4. **Start a session:** pick a game, pick participants from the group, pick a scorekeeper for this session → session goes live
5. **Live play:** scorekeeper sees an entry form for each participant's fields; everyone else in the group who opens that session sees a read-only live view via a Realtime subscription
6. **End session:** scorekeeper finalizes → totals and winner computed and locked → session becomes part of group history
7. **History & stats:** per-group tab showing past sessions, per-game leaderboards, trends, and head-to-head lookups
8. **Profile:** avatar button in the top-right of the group list → own profile screen, showing display name, avatar, and personal stats, with the display name editable there

## Data Model Sketch (Supabase)

```
profiles            (id, display_name, avatar_url)
groups              (id, name, created_by, invite_code)
group_members       (group_id, user_id, joined_at)
game_templates       (id, group_id, name, scoring_direction, created_by)
game_template_fields (id, template_id, key, label, sign, default_value)
bonus_rules          (id, template_id, field_key, operator, value, points_delta)
sessions             (id, group_id, template_id, scorekeeper_id, status, played_at)
session_participants (session_id, user_id)
session_scores       (session_id, user_id, field_key, value)
```

Use Row Level Security everywhere: a row is only readable/writable by members of the group it belongs to, and `session_scores` writes are additionally restricted to the session's current `scorekeeper_id` while `status = 'in_progress'`.

## Permissions Model

- Any group member: create game templates, start sessions, view history/stats
- Only the session's designated scorekeeper: write scores while that session is in progress
- No group-admin role in v1 — all members are equal otherwise

## Non-Goals (v1)

Explicitly out of scope unless we revisit:
- Multi-round sessions (e.g. per-hand poker scoring within one sitting)
- A general formula/expression language for scoring (bonus rules cover the stated need)
- Push notifications
- Offline write queueing for the scorekeeper (assume connectivity during live entry; if this becomes a real problem in practice, revisit)
- Any admin/moderation role within a group

## Deferred Features (Late-Stage)

Planned, but not part of the initial build stages — don't implement until the core live-session and stats flow is solid and we've explicitly reached this stage:
- **Account backup via Apple/Google:** let a user optionally link their anonymous identity to Sign in with Apple or Google (Supabase `linkIdentity()`), so their history survives an uninstall or device switch. Purely opt-in — the anonymous-first flow doesn't change for people who never enable it. If Google sign-in is added, Sign in with Apple must be offered alongside it for App Store compliance.

## Open Decisions (flag, don't silently pick a different default)

- **Bonus rule sufficiency:** the condition/delta model above is a deliberate simplification of "custom logic." If a real game needs something it can't express, raise it rather than quietly bolting on a formula parser.

## Working Style

- Build in stages, not all at once — confirm the plan for a stage before writing code for it, the way we've done on other projects.
- When a decision isn't specified above, make the simplest choice that satisfies the stated requirement and say what you picked and why, rather than asking.
- When a decision conflicts with something in "Open Decisions" or "Non-Goals," stop and ask.
