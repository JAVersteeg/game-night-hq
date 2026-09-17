# Game Night HQ — design system

A score-tracking app for game nights with friends: board games, card games, whatever the group plays. Multiple friend groups, custom game definitions per group, live score entry while you play, and a stats dashboard built from session history.

Working name: **Game Night HQ**. One product today — a React Native + Expo mobile app, iOS and Android, light mode only. No marketing site, no web app, no docs site.

## Sources

Everything here was read from one repository:

- **https://github.com/JAVersteeg/game-night-hq** (branch `master`) — the Expo app. Read in full: `CLAUDE.md`, `tailwind.config.ts`, `global.css`, `App.tsx`, `app.json`, `package.json`, `src/components/*`, `src/navigation/*`, `src/features/*`.

`github.md` at the project root records the sync state and maps each artifact here back to the files it came from. Anyone extending this design system should read the repo directly rather than trusting this summary — the app is moving, and much of the product described in `CLAUDE.md` has no UI yet.

No Figma file, no slide deck, no brand guidelines and no logo were provided.

## Product shape (from CLAUDE.md)

- **Identity is anonymous.** Supabase `signInAnonymously()` on first launch. There is no signup, no password, no email. The one onboarding question is "who are you" — a display name — not "create an account". Never design a login screen for this product.
- **Group** — a friend group with members, an invite code, its own games and its own history. No cross-group data. No admin role: all members are equal.
- **Game template** — defined per group by any member: a name, custom numeric fields (each with a `sign` so penalties subtract), a scoring direction (`highest_total_wins` / `lowest_total_wins`), and optional bonus rules.
- **Session** — one sitting of one game. Has a scorekeeper chosen fresh each time; only they can write scores while it is live. Everyone else in the group watches read-only over Realtime. v1 is single-round.
- **Stats** — derived, never stored: per-game leaderboards, score trends per player, head-to-head records.
- **Profile** — reached from the avatar top-right of the group list. Display name, avatar, and the user's own record across every group.

**Built in the app today:** anonymous auth, the display-name prompt, the group list, the profile screen.

**Proposed here, not yet built:** group detail (games / history / stats tabs), the game-template editor, session setup, live score entry in both scorekeeper and read-only form, the locked result, session history and the stats views. These are drawn from the domain model and flows in `CLAUDE.md` — same fields, same permissions, same vocabulary — but no one has agreed them as designs yet, and the Dutch copy in them is new. The UI kit labels the two groups separately ("In de app" vs. "Voorstel") so nobody mistakes a proposal for shipped product.

## Content fundamentals

**Language: Dutch, informally.** All product copy is Dutch and uses `je` / `jouw`, never `u`. Group-scoped copy uses `jullie` ("Maak een groep voor jullie spelavonden"). Server error text from Supabase is deliberately left in English and shown verbatim underneath a Dutch explanation, so it stays searchable.

**Casing.** Sentence case everywhere — titles, button labels, placeholders. The only uppercase is the small section label (`NAAM`, `STATISTIEKEN`), and that is a CSS transform over sentence-case source text.

**Tone: plain, factual, unhurried.** Copy states what is true and what to do next. No exclamation marks anywhere in the codebase. No "Oops", no "Whoops", no personality voice, no jokes about losing. No emoji, ever — not in copy, not as icons, not as decoration.

**Questions as headings.** The onboarding title is a question to the person: "Hoe mogen we je noemen?" A supporting line then says why it matters: "Dit is de naam die je vrienden op het scorebord zien."

**Errors never blame.** From `RootNavigator.tsx`: "Er ging iets mis bij het instellen van je profiel. Ben je offline? Maak opnieuw verbinding en probeer het nogmaals." Note the deliberate choice documented in that file — the copy does *not* say "check your wifi", because a failed anonymous sign-in is as likely to be a server misconfiguration, and sending someone to their router when the router is fine wastes their time. Offer the most likely cause as a question, then a retry button.

**Absence is stated, not hidden.** Where a feature does not exist yet, the UI says so in ink-subtle 14px and moves on: "Profielfoto volgt later", "Je persoonlijke statistieken verschijnen hier zodra je spellen hebt gespeeld." No skeletons pretending data is coming, no "coming soon" badges.

**Empty states give both routes.** "Nog geen groepen" states the fact; the body offers create *or* join, because at that moment either is valid.

**Buttons are verbs, one or two words:** "Doorgaan", "Opnieuw proberen". Placeholders are examples ("Je naam"), not instructions.

**Numbers.** Scores, win percentages and averages are the content of this product. Set them in tabular figures and never dress them up — no trophies, no "🔥", no rank medals.

## Visual foundations

**Warmth and darkness are the two deliberate departures from the code.** `tailwind.config.ts` opens with a "Theme switch" comment: change `accent.DEFAULT` to retint the whole app, with violet / orange / lime / emerald suggested. This system takes that hook and sets the accent to **clay** `#d4753f` — fired terracotta, the colour of a Catan hex tile — and then inverts the neutral ramp: the app's white-on-zinc becomes warm brown-black. Structure, spacing and type are unchanged from the code. If you re-sync the repo and it still ships violet on white, the repo is the one that is behind.

**Nothing in this system is white.** Not a card, not a surface, not a sheet. The base is `#1c1813` — a brown-black, never a blue-black, because a cool grey would read as a different product sitting next to the clay.

**Colour.**
- Accent: clay `#d4753f`, pressed/strong `#c25a2b`, hairline `#7c4426`, soft `#3b2117` with `#e2a07c` text. Clay steps one notch brighter than it would on a light ground so it carries against the night surfaces. Text on a clay fill is **near-black** `#16120e`, not white — white on clay fails contrast at button size.
- Ink: four steps — `#f2ebe2` body, `#b6aa9c` secondary, `#8a7e71` placeholder and absent-feature notes, `#5f5549` faint. All brown-tinted.
- Surfaces: `#16120e` deep (the page behind the app), `#1c1813` surface, `#221d17` muted, `#2a241d` sunken. Lines: `#3a322a`, strong `#4d433a`.
- Semantics come from Catan resources rather than generic UI colours: lumber green `#5fa878` for success, grain gold `#e0a736` for warning, brick red `#e2685a` for danger — each with a deep soft ground and a light soft-fg for pills.
- A fixed six-colour series (clay, lumber, grain, ore, wool, sea) is reserved for per-player charts, so a player keeps the same colour across leaderboards and trend lines.
- One accent per screen. No second brand colour competing with clay.

**Type.** Inter, loaded at 400/500/600/700. `App.tsx` sets Inter as the default for *every* `Text` and `TextInput`, at weight **500** — so medium, not regular, is the baseline. Bold 700 with `-0.025em` tracking for the one 30px screen title; semibold 600 at 18px for row titles and buttons; medium 500 at 16/24 for body in ink-muted; 14px is the floor. Uppercase with `+0.025em` tracking appears only on section labels.

**Spacing.** A 4px grid, with one deliberate off-grid step: `py-3.5` = 14px, the vertical padding of every button and input. 24px screen gutter on every screen, 12px between list rows, 16px inside a card, 32px between labelled sections, 48–64px for empty-state breathing room. Tap targets 44px minimum.

**Shape.** 16px (`rounded-2xl`) is the house radius and it is used on almost everything: cards, list rows, inputs and buttons all share it, which is what makes the screens feel like one material. Avatars are full circles. `2rem` (32px) exists in the Tailwind config as `4xl` but nothing uses it yet.

**Borders instead of shadows.** There are no drop shadows in the app, and on a dark ground they would do nothing anyway. Elevation is a 1px `--line` border plus a surface tint — a `#1c1813` card on `#1c1813`, separated only by a hairline, or lifted one step to `--surface-muted`. `--shadow-sm` / `--shadow-md` exist in `tokens/shape.css` for web surfaces that genuinely need lift; do not put them on app screens.

**Backgrounds are plain.** Flat `#1c1813`, or `#16120e` behind the app frame. No gradients, no photography, no illustration, no pattern, no texture, no grain, no noise, and specifically no glow: a dark UI tempts you toward neon edges and radial light behind the accent, and this brand has none of it. No transparency and no blur anywhere — no frosted headers, no scrim overlays, no protection gradients. If content needs separation from what is behind it, it gets a border or a tinted surface.

**Motion and states.** There is no transition system: these are native pressables, and feedback is opacity only. Pressed = `opacity 0.8` on filled controls, `0.7` on the avatar button, and the ghost button instead fills with `--surface-muted`. Disabled = `opacity 0.5`. No scale-on-press, no bounce, no spring, no colour shift on hover (there is no hover on a phone). On web recreations, use `120ms` with `cubic-bezier(0.2, 0, 0, 1)` and keep to opacity.

**Layout.** Single column, full width inside the 24px gutter. Buttons stretch to the container — never a narrow, centred, auto-width button. The screen title sits in the content flow at the top left, with the profile avatar as the only element in the top right; there is no persistent app bar, no tab bar, no floating action button. Lists scroll under nothing. The Profile screen is the one place that uses the platform's own native stack header ("Profiel" with a "Terug" back button), because the platform already handles the swipe-back gesture and title truncation correctly.

**Loading.** A bare platform `ActivityIndicator`, centred on an empty surface. No skeleton screens, no shimmer, no progress copy.

**Note on the app's own setting.** `app.json` declares `userInterfaceStyle: "light"` and the status bar is set to `dark` in `App.tsx`. This design system is dark on purpose, at the team's direction, so those two lines need to change (`"dark"` / `<StatusBar style="light" />`) before a build matches these designs.

## Iconography

**There is no icon system in this product, and that is not an oversight to fix casually.** Across `src/`, not one screen renders an icon. Navigation chevrons and the back arrow come from the native stack header. The only graphic elements are initials in a circle and the platform spinner. `react-native-svg` is installed but unused.

- **No icon font, no sprite sheet, no SVG set** ships in the repo. Nothing to copy in, so `assets/` holds no icons.
- **No emoji, and no unicode characters used as icons.** Bullet separators in meta lines (`6 leden · 12 avonden`) are the one exception.
- **No logo or brand mark exists.** `assets/icon.png` in the repo is the unmodified Expo scaffold placeholder, so it was deliberately *not* copied in here and no mark was drawn to replace it. Wherever a logo would go, set "Game Night HQ" in Inter Bold at `-0.03em` tracking — see the Wordmark card. **Please send a real mark if one exists.**
- **If a prototype needs icons** (a tab bar, a stats screen, a scorekeeper badge), use **Lucide** from CDN at 1.5px stroke, 20–24px, in `--ink-muted`: it is the closest match to Inter's geometry and to this brand's unornamented feel. Flagging clearly: **this is a substitution, not something the product has chosen.** Get it agreed before it spreads.

## Index

Root

| File | What it is |
| --- | --- |
| `styles.css` | The single entry point consumers link. `@import` lines only. |
| `readme.md` | This file. |
| `SKILL.md` | Agent-skill front matter for use outside this project. |
| `github.md` | Source repo, sync state, artifact-to-source map. |
| `thumbnail.html` | Homepage tile. |

`tokens/` — `fonts.css` (Inter via Google Fonts CDN), `colors.css`, `typography.css`, `spacing.css`, `shape.css`, `motion.css`.

`components/core/` — six primitives lifted from the app, each with `.jsx`, `.d.ts` and `.prompt.md`:

| Component | From |
| --- | --- |
| `Button` | `src/components/Button.tsx` — primary / secondary / ghost, loading, disabled |
| `Avatar` | `src/components/Avatar.tsx` — initials, any size |
| `TextField` | the `TextInput` in `DisplayNameScreen.tsx` |
| `Card` + `ListRow` | the repeated bordered-card block in all three screens |
| `SectionLabel` | the uppercase labels in `ProfileScreen.tsx` |
| `EmptyState` | `GroupListScreen.tsx`'s `EmptyState` |

`components/forms/` — controls the proposed screens need, which the app has no equivalent for yet:

| Component | Why it exists |
| --- | --- |
| `SegmentedControl` | The games / history / stats tabs inside a group. |
| `NumberStepper` | One scoring field during live entry; thumb-sized, also typeable. |
| `ChoiceRow` | Scoring direction (radio), who plays and who keeps score (check). |
| `Badge` | Session state and roles: bezig, afgerond, winnaar, scoreteller. |

`components/data/` — statistics, which `CLAUDE.md` specifies as derived per group:

| Component | What it plots |
| --- | --- |
| `StatTile` | One headline number: avonden, winst %, gemiddelde. |
| `Leaderboard` | Per-game table: rank, player, three numeric columns. |
| `TrendChart` | Score trend per player over session history, one line each. |
| `ScoreBars` | Final totals for one session, in finishing order. |
| `HeadToHead` | Win record between two group members. |

**Chart rules.** Charts follow the same restraint as the rest of the system: hairline `--line` gridlines, 2px stroke, 2.5px dots filled with `--surface` so lines read as passing behind each other, tabular 10px axis labels in `--ink-subtle`. No area fills, no gradients, no glow, no drop shadows, no animation, no tooltips, no chart library. Player colours come from `--series-1` … `--series-6`, assigned in group-member order and held constant across every chart on a screen, so a player is the same colour in the trend line and in the head-to-head bar. Beyond six players, drop the chart and show the leaderboard.

**Intentional additions.** The repo exports only `Button` and `Avatar` as shared components.

- `TextField`, `Card`/`ListRow`, `SectionLabel`, `EmptyState` — extractions of markup already repeated verbatim across the three built screens, not inventions.
- `SegmentedControl`, `NumberStepper`, `ChoiceRow`, `Badge`, `StatTile`, `Leaderboard`, `TrendChart`, `ScoreBars`, `HeadToHead` — added at your request to design the unbuilt session and statistics screens. They have no counterpart in the codebase yet, so treat their APIs as proposals.
- Still deliberately absent: Toast, Dialog, Tooltip, Switch, Tabs-as-navigation. The product has no use for them.

`ui_kits/app/` — click-through of all nine screens, built and proposed, plus its own README mapping each one to its source or marking it as new.

`templates/app-screen/` — a starting template for a new Game Night HQ screen: 390px column, 24px gutter, title row with avatar, list rows, primary action.

`guidelines/` — 17 specimen cards for the Design System tab: colour ramps, type ladders, spacing, radii, elevation, interaction states, wordmark, voice samples.

## Open questions for the team

1. **The proposed Dutch copy needs a read-through.** Labels like "Avond starten", "Scoreteller", "Telt af", "Eindstand" and "Onderling" are my wording, not yours.
2. **Live entry: one open player at a time, or all fields for everyone at once?** I chose accordion rows with a running total per player, on the assumption that one person is entering at the table. If scores get entered per round or by several people, that layout is wrong.
3. **Stats scope.** I put the leaderboard, trend and head-to-head on one scrolling group tab. That is a lot for one screen — worth splitting once there is real data.
4. Is there a real logo or app icon? The repo ships the Expo placeholder, and the wordmark is standing in.
5. Do you have Inter font binaries you want vendored, or is the Google Fonts CDN fine for design work?
