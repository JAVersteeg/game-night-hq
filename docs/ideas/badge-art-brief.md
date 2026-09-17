# Badge art brief — Game Night HQ

Input for an image model (Nano Banana). Colour schema and feeling only; no layout or component specs.

## The feeling

A warm, dark, quiet product. Brown-black night, fired terracotta, and the muted resource colours of a wooden board game on a table lit by one lamp. It is unhurried and factual — a scoreboard among friends, not a casino, not a game console, not an esports HUD.

Badges must feel like small, flat, printed tokens: something you could silkscreen onto a wooden tile or stamp onto a card. Confident and plain, with the charm coming from the drawing itself, never from effects.

## Palette

Ground (always — nothing here is white):
- `#16120e` deep night (page behind everything)
- `#1c1813` surface (the badge's own ground)
- `#221d17` / `#2a241d` one step lighter, for separation
- Hairlines: `#3a322a`, stronger `#4d433a`

Primary accent — clay / fired terracotta, the colour of a Catan hex tile:
- `#d4753f` clay (the accent)
- `#c25a2b` pressed/strong
- `#7c4426` hairline
- `#3b2117` soft ground, with `#e2a07c` for text/marks on it
- Ink on a clay fill is near-black `#16120e` — never white

Ink (all brown-tinted, never grey):
- `#f2ebe2` body, `#b6aa9c` secondary, `#8a7e71` subdued, `#5f5549` faint

Secondary colours — taken from board-game resources, used sparingly:
- lumber green `#5fa878` (soft ground `#1d2c22`, light `#a9d5b8`)
- grain gold `#e0a736` (soft `#322610`, light `#efd18f`)
- brick red `#e2685a` (soft `#351b18`, light `#f0aaa0`)
- ore `#93a7b5`, wool `#aabd74`, sea `#7fa8b8`

Rule: one accent per badge. Clay leads; a resource colour may distinguish a category, but two bright colours never compete inside one mark.

## Hard constraints

- **Flat.** No gradients, no glow, no neon edges, no radial light behind the accent, no bevels, no drop shadows, no 3D, no metallic or foil shine, no gloss.
- **No transparency, no blur, no frosted glass.** Separation comes from a 1px border or a tinted surface.
- **No texture.** No grain, noise, paper fibre, scratches or wear.
- **No white.** No white background, no white strokes, no white fills.
- **No emoji, no trophies, no medals, no laurel wreaths, no flames, no stars, no confetti, no ribbons.** This product deliberately refuses the usual achievement iconography.
- **No photography, no illustration of people, no faces.**
- Shapes are geometric and unornamented, with generous negative space. Where linework is used, keep it even and 1.5px-equivalent weight — the geometry of Inter, not of a script or a crest.
- 16px-equivalent rounded corners are the house shape; circles are the other allowed form.

## One-line prompt seed

> Flat minimal badge icon on a warm brown-black `#1c1813` ground, single fired-terracotta `#d4753f` accent with brown-tinted cream `#f2ebe2` linework, geometric and unornamented, generous negative space, silkscreened wooden-token feel, no gradients, no glow, no shadows, no texture, no white, no trophies or medals.
