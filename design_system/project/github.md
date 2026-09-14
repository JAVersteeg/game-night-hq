repo: JAVersteeg/game-night-hq
branch: master

## Last sync

date: 2026-09-14T12:10:00Z

### Updated in this project

- Built the design system from the Expo app's Tailwind theme, components and three screens.
- Retinted the accent from violet to a warm Catan clay, then moved the whole system to a warm dark theme.
- Recreated the four built screens and designed the unbuilt session, game-template and stats flows.
- Added form controls and a chart set (leaderboard, trend, score bars, head-to-head) for the stats work.

## Screen map

| Screen / artifact | Repo files |
| --- | --- |
| `ui_kits/app/DisplayNameScreen.jsx` | `src/features/auth/screens/DisplayNameScreen.tsx` |
| `ui_kits/app/GroupListScreen.jsx` | `src/features/groups/screens/GroupListScreen.tsx`, `src/features/groups/hooks/useGroups.ts` |
| `ui_kits/app/ProfileScreen.jsx` | `src/features/profile/screens/ProfileScreen.tsx` |
| `ui_kits/app/PhoneFrame.jsx` | `src/navigation/AppStack.tsx`, `src/navigation/RootNavigator.tsx` |
| `components/core/Button.*` | `src/components/Button.tsx` |
| `components/core/Avatar.*` | `src/components/Avatar.tsx` |
| `components/core/TextField.*`, `Card.*`, `SectionLabel.*`, `EmptyState.*` | inline markup in the three screens above |
| `ui_kits/app/GroupDetailScreen.jsx`, `GameSetupScreens.jsx`, `SessionScreens.jsx` | No repo source — designed from `CLAUDE.md` (domain model, flows 3–7, permissions) |
| `components/forms/*`, `components/data/*` | No repo source — new, for the proposed screens |
| `tokens/*.css` | `tailwind.config.ts`, `global.css`, `App.tsx` (font loading) |
| `readme.md` (context, voice, domain) | `CLAUDE.md`, `app.json`, `package.json` |
