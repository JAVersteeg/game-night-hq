# UI kit — Game Night HQ mobile app

React Native + Expo app, iOS/Android, light mode only (`userInterfaceStyle: "light"`). Open `index.html` and use the two chip rows to move between screens.

## In de app — recreated from source

| File | Source | Notes |
| --- | --- | --- |
| `DisplayNameScreen.jsx` | `src/features/auth/screens/DisplayNameScreen.tsx` | The only onboarding step. Centred, 24px gutter, input + primary button. |
| `GroupListScreen.jsx` | `src/features/groups/screens/GroupListScreen.tsx` | Title row with the profile avatar top-right, then group rows or the empty state. |
| `ProfileScreen.jsx` | `src/features/profile/screens/ProfileScreen.tsx` | Native stack header ("Profiel" / "Terug"), 96px avatar, name field, muted stats panel. |
| `PhoneFrame.jsx` | `src/navigation/*` | Frame, iOS status bar, native header chrome. Not product code. |

## Voorstel — designed here, not in the codebase

Drawn from the domain model, flows and permissions in `CLAUDE.md`. No screens for these exist in the repo, so nothing was copied — the field names, scoring direction, bonus-rule shape and scorekeeper permission all follow the spec, but the layouts and the Dutch copy are new and need review.

| File | Screens | Follows |
| --- | --- | --- |
| `GroupDetailScreen.jsx` | Group detail with Spellen / Geschiedenis / Statistieken tabs | "Stats (derived, not stored)", "History & stats" flow 7 |
| `GameSetupScreens.jsx` | `GameTemplateScreen` (name, fields with sign, scoring direction, bonus rules), `SessionSetupScreen` (game, participants, scorekeeper) | Game Template + flows 3 and 4 |
| `SessionScreens.jsx` | `LiveSessionScreen` (scorekeeper entry and read-only mirror), `SessionResultScreen` (winner, locked totals, bonus rules that fired) | Flows 5 and 6, and the scorekeeper-only write rule |
| `data.jsx` | Demo groups, templates, sessions, trend series | Shapes follow the Supabase sketch |

Deliberate omissions: no create/join-group flow (the invite-code mechanics are unspecified beyond "generates a code"), no multi-round entry (a stated v1 non-goal), no push notifications, no offline queue.

## Copy

Copy for the four built screens is lifted verbatim from the source. Copy on the proposed screens is new, written to the voice rules in the root `readme.md`: Dutch, informal "je", sentence case, no exclamation marks, no emoji.
