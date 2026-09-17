# Handoff: Achievements en badges

## Overview

A dedicated badges and achievements page inside a Game Night HQ group, plus a badge
detail screen. It replaces the earlier idea of showing badges inline in the group
settings screen.

Two concepts, deliberately separated:

- **Badges** — pass-on awards. One holder at a time; the badge moves to the next
  player who meets the condition. "Grote Daggoe" and "Koning van Catan" are the
  two headline badges.
- **Achievements** — per-player milestones (10 potjes, 3 winsten op een rij, …).
  Cumulative, never lost, filtered by player.

Source brief: `docs/ideas/achievements-badges.md` in `JAVersteeg/game-night-hq`.

## About the design files

The files in this bundle are **design references created in HTML** — prototypes
showing intended look and structure, not production code to copy. The target
codebase is the Expo / React Native app (`JAVersteeg/game-night-hq`), so the task
is to **recreate these screens in React Native** using the app's existing patterns:
NativeWind classes from `tailwind.config.ts`, and the shared `Button` / `Avatar`
components in `src/components/`.

`Achievements and badges.dc.html` is the design. It loads a design-system bundle
from `_ds/` — that bundle is a web mirror of the app's own components, included
here only so the HTML renders. Do not port the bundle; use the real RN components.

## Fidelity

**High-fidelity.** Colors, type, spacing and radii are final and come from the
Game Night HQ design system. Recreate faithfully. Two exceptions, both called out
in the design itself:

- The dog (Grote Daggoe) and crown (Koning van Catan) marks are **rough SVG
  sketches**, not final artwork. Real illustrations are still needed.
- All badge and achievement **names and descriptions are placeholders**, as are
  the member names, dates and figures.

Note: the design system is **dark**, while the repo currently ships
`userInterfaceStyle: "light"` in `app.json` and `<StatusBar style="dark" />` in
`App.tsx`. Both need to flip to dark before a build matches these screens.

## Screens

### 1. Badges tab

**Purpose.** Show which pass-on badges exist in the group and who currently holds
each one.

**Layout.** Single scrolling column, 390px wide in the mock, 24px screen gutter,
24px between sections. Native stack header above (back + group name) — use the
platform header, as the Profile screen does.

Top to bottom:

1. Screen title "Badges" — 30px / 700 / `-0.025em`, in the content flow, left
   aligned. No app bar.
2. Segmented control, full width: `Badges` | `Achievements`. Track
   `--surface-sunken`, 16px radius, 4px padding; active segment `--surface` fill,
   `--ink` text, 12px radius; inactive `--ink-muted`. Labels 14px / 600.
3. Section label `IN OMLOOP` — 14px / 600, uppercase, `+0.025em`, `--ink-subtle`.
4. **Two prominent badge cards, side by side**, `flex: 1` each, 12px gap:
   - Card: `--surface-muted` fill, 1px `--accent-line` border, 16px radius,
     padding 20px top / 14px sides / 16px bottom, contents centered, 14px gap.
   - Hexagon mark: two-layer clip-path ring. Outer 84×94px filled `--accent-line`;
     inner 78×87px filled `--surface-sunken`, centered. Both use
     `clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)`.
     A 44×44px sketch icon sits inside, 1.4px stroke in `--accent`.
     Note: a `border` cannot be used with `clip-path` — it gets clipped away. The
     two-layer fill is what produces the outline.
   - Name: 18px / 600, 22px line-height, centered.
   - Condition line: 14px / 20px, `--ink-muted`, centered
     ("Laatste plaats, De Grote Dalmuti" / "Hoogste winst%, Catan").
   - Holder footer: 12px top padding above a 1px `--line` top border; 28px avatar,
     then name 14px / 600 over a 14px `--ink-subtle` meta line
     ("sinds 12 sep" / "64% uit 14 potjes"), tabular figures.
5. Caption under the pair: 14px / 20px, `--ink-subtle` — "Zeshoek: één houder
   tegelijk, gaat over naar de volgende speler die de voorwaarde haalt."
6. Section label `OVERIGE BADGES`, then a bordered list card (1px `--line`,
   16px radius, rows split by 1px `--line`, 12px / 16px row padding):
   - Small hexagon 36×40px outer / 32×36px inner, same two-layer ring —
     `--accent-line` over `--surface-sunken` when held, `--line` over `--surface`
     when unheld.
   - Name 16px / 600; meta 14px `--ink-subtle` ("Sanne · 22 min"); holder avatar
     28px on the right.
   - Unheld row: name in `--ink-muted`, meta "Nog geen houder", no avatar.

**Interactions.** Tapping any badge (hex card or list row) opens the badge detail
screen. Tapping `Achievements` switches the tab. Pressed feedback is opacity only
— `0.8` on filled controls — no scale, no color shift.

### 2. Achievements tab

**Purpose.** Show one player's milestone progress.

**Layout.** Same header, title and segmented control as the Badges tab, with
`Achievements` active. Then:

1. Section label `SPELER`, then a wrapping row of player chips, 8px gap:
   - Chip: pill (`999px` radius), padding 6px left / 12px right / 6px vertical,
     8px gap, 28px avatar then the first name.
   - Selected: `--accent-soft` fill, 1px `--accent-line` border, label 14px / 600
     in `--accent-soft-fg`.
   - Unselected: transparent, 1px `--line` border, label 14px / 500 `--ink-muted`.
   - Chips must clear a 44px tap target — pad the touchable, not the visual pill.
2. Header row: the selected player's name as an uppercase section label on the
   left, "3 van 7 gehaald" 14px `--ink-subtle` tabular on the right.
3. Achievement rows, 10px gap, two states:
   - **Gehaald**: `--surface-muted` fill, 1px `--accent-line` border, 16px radius,
     10px / 12px padding. 48×48px tile, 14px radius, `--surface-sunken` fill,
     1px `--accent-line` border, holding the target number at 18px / 700 in
     `--accent`, tabular, `-0.02em`. Title 16px / 600 `--ink`; meta 14px
     `--ink-muted` ("Gehaald op 12 sep").
   - **Nog niet gehaald**: no fill, 1px `--line` border. Tile `--surface` fill,
     1px `--line` border, number in `--ink-subtle`. Title 16px / 600 in
     `--ink-muted`; on the same baseline, right aligned, "23 / 50" in 14px
     `--ink-subtle` tabular. Below it a 4px progress bar: track
     `--surface-sunken`, fill `--accent-line`, `999px` radius, 6px above.
   - Order: gehaald first, then unheld sorted by how close they are.
4. Closing caption, 14px / 20px `--ink-subtle` — "Achievements worden berekend uit
   de gespeelde potjes, er is geen moment waarop je ze verdient."

**Interactions.** Tapping a chip re-filters the list. Achievement rows are not
tappable in this design.

### 3. Badge detail

**Purpose.** Explain one pass-on badge and show its history.

**Layout.** Native stack header ("Terug" + "Badge"), 24px gutter, 32px between
sections.

1. Header block, row, 16px gap: hexagon 88×98px outer / 82×91px inner (same ring
   pattern), 48px sketch icon inside. Beside it the badge name at 30px / 700 /
   `-0.025em` over a `Badge` pill, tone `accent`, reading "In omloop".
2. Description, 16px / 24px `--ink-muted`.
3. Section label `HOUDER`, then a card: 1px `--accent-line` border,
   `--surface-muted` fill, 16px radius, 14px / 16px padding; 44px avatar, name
   18px / 600, meta 14px `--ink-muted` tabular ("sinds 12 sep, 4 potjes geleden").
4. Section label `EERDERE HOUDERS`, then a bordered list card: 32px avatar, first
   name 16px, date range 14px `--ink-subtle` tabular, right aligned
   ("29 aug tot 12 sep"). Newest first.

## Behavior and data

- **Badges and achievements are derived, never stored** — computed from the
  group's session history, in line with how `CLAUDE.md` treats stats. There is no
  "you earned a badge" moment, no notification, no unlock animation. The captions
  in the design say so explicitly; keep that copy.
- **Holder history** for a pass-on badge is likewise derived by replaying sessions
  in order. Only sessions recorded in the app count.
- Everything is **group scoped**. No cross-group badges.
- All members see all members' badges; there is no admin role and no privacy
  toggle.
- A pass-on badge can have **no holder** (no qualifying session yet) — the
  "Langste reeks" row shows that state.
- Percentage-style badges need a **minimum sample** to avoid a 100%-from-one-game
  holder. The mock implies it ("64% uit 14 potjes"); the threshold is undecided.

## State

- `tab`: `'badges' | 'achievements'`, default `'badges'`.
- `selectedPlayerId`: defaults to the current user on the Achievements tab.
- `selectedBadgeId`: drives the detail screen (via navigation params).
- Derived, computed from sessions: `passOnBadges[]` (id, name, condition,
  currentHolder, since, metric, history[]) and
  `achievements[]` per player (id, name, target, current, achievedAt | null).

No new persisted tables are needed for the milestones themselves. If recomputing
holder history over the full session list proves slow, cache it per group rather
than storing badge awards as rows.

## Design tokens

Accent

| Token | Value |
| --- | --- |
| `--accent` | `#d4753f` |
| `--accent-strong` | `#c25a2b` |
| `--accent-line` | `#7c4426` |
| `--accent-soft` | `#3b2117` |
| `--accent-soft-fg` | `#e2a07c` |
| on-accent text | `#16120e` |

Surfaces and lines

| Token | Value |
| --- | --- |
| `--surface-deep` | `#16120e` |
| `--surface` | `#1c1813` |
| `--surface-muted` | `#221d17` |
| `--surface-sunken` | `#2a241d` |
| `--line` | `#3a322a` |
| `--line-strong` | `#4d433a` |

Ink

| Token | Value |
| --- | --- |
| `--ink` | `#f2ebe2` |
| `--ink-muted` | `#b6aa9c` |
| `--ink-subtle` | `#8a7e71` |
| `--ink-faint` | `#5f5549` |

`--ink-faint` is too low-contrast for a row's key figure on `--surface` (~2.3:1);
the unheld achievement numbers use `--ink-subtle` for that reason.

Type — Inter, default weight 500.

| Use | Spec |
| --- | --- |
| Screen title | 30px / 700 / `-0.025em` |
| Badge name (card) | 18px / 600 / 22px |
| Row title, button | 16px / 600 |
| Body | 16px / 24px, `--ink-muted` |
| Meta, caption | 14px / 20px, `--ink-subtle` |
| Section label | 14px / 600, uppercase, `+0.025em` |
| Numbers in tiles | 18px / 700 / `-0.02em`, tabular |

14px is the floor. All figures use tabular numerals.

Spacing — 4px grid. 24px screen gutter, 32px between labelled sections, 24px
between blocks on the tabbed page, 16px inside a card, 12px between cards, 10px
between achievement rows, 8px between chips. Tap targets 44px minimum.

Shape — 16px radius on cards, rows, inputs, buttons; 14px on the 48px number
tiles; 12px on active segments; `999px` on chips and progress bars; circles on
avatars; hexagon clip-path on pass-on badges.

Elevation — **no shadows**. A 1px `--line` border plus a surface tint, nothing
else. No gradients, no blur, no transparency, no glow.

Motion — opacity only. Pressed `0.8` on filled controls, `0.7` on avatar buttons,
ghost buttons fill with `--surface-muted`. Disabled `0.5`. No scale, spring or
bounce. Web recreations: `120ms cubic-bezier(0.2, 0, 0, 1)`.

## Assets

- **The two badge marks are placeholders.** Inline SVG sketches, 1.4px stroke in
  `--accent`, drawn in this conversation. They are not final artwork and should be
  replaced before ship.
- **No icon system exists in this product** and this design adds none — the
  hexagon and the two sketches are the only graphics. If icons become necessary,
  the design system suggests Lucide at 1.5px stroke as a substitution that has not
  been agreed.
- Fonts: Inter via Google Fonts CDN in the HTML; the app loads Inter already.

## Copy

Dutch, informal `je` / `jullie`, sentence case, no exclamation marks, no emoji.
Uppercase appears only on section labels, as a transform over sentence-case source.

The copy in the mock — badge names, descriptions, captions — is placeholder
wording written in this conversation and needs a read-through before it ships.

## Files

| File | What it is |
| --- | --- |
| `Achievements and badges.dc.html` | The design. Open in a browser; all three screens on one canvas. |
| `support.js` | Runtime for the HTML prototype. Not for porting. |
| `_ds/` | Web mirror of the Game Night HQ design system (tokens + components) so the HTML renders. Use the real RN components instead. |

Toggles in the HTML (the "Tweaks" panel, if you open it in the design tool):
`showOtherBadges`, `showProgressBars`, `showPreviousHolders`.

## Open questions

1. Real artwork for Grote Daggoe and Koning van Catan.
2. Final badge and achievement names, descriptions and the full milestone list.
3. Minimum number of potjes before a percentage badge can be held.
4. Should the Achievements tab also offer an all-players comparison view, or is
   per-player filtering enough?
5. Where does this page hang off the group — a row in group settings, or a tab
   alongside games / history / stats?
