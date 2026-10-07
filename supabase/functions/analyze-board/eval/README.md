# Board analysis — accuracy test kit and findings

How well Claude reads a finished Catan board from a photo, measured against a board verified by hand.
Everything here is for development only; none of it is deployed (a deploy bundles only what
`index.ts` imports).

## Ground truth

- Session `dad343ed-ae10-488b-9750-119006d832fa` — Markante mannen, 4 Oct 2026 (the 12:47 game),
  5 players, so the 5–6 player board.
- Photos (not in the repo — they're on Jochem's machine):
  - `Downloads/20261004_144940.jpg` — the original, 2252×4000. Use this one.
  - `Downloads/628c1a2c-4491-4683-81bd-0ce3601c3af0.jpg` — the app's 1600px session-photo copy.
- `truth.json` — every hex, harbour, building and road, confirmed piece by piece with Jochem
  (`truth_board.py` is the original transcription and renders it as HTML). Frame: row 0 = top of the
  photo, pointy-topped hexes, rows of 3-4-5-6-5-4-3.
- Colours: green = Pim, red = Sangu, blue = Martje, orange = May-C, white = Faralley.
  Recorded `nederzettingen` (building points): Pim 5, Sangu 8, Martje 9, May-C 6, Faralley 7.
  Pim also had the longest trade route (green, 11 roads).

## Running it

From this folder, with `ANTHROPIC_API_KEY=...` in `supabase/functions/.env.local` (gitignored).
`deno` = `npx deno run -A --node-modules-dir=none --no-config`.

**The production code** (`../boardVision.ts`, `../boardGeometry.ts`, and the app's solver in
`src/features/boardScan/catan.ts`) — use these to check a change before deploying it:

```sh
python -I -X utf8 prepare_images.py <photo.jpg>   # overview + 2×2 crops, exactly as the app uploads them
deno eval_live.ts <label>                         # the real analysis, ~$0.25 → results/live-<label>.json
deno eval_solver.ts results/live-<label>.json     # + the app's settlement/city solver and colour suggestions
python -I -X utf8 score.py results/live-<label>-labelled.json
deno eval_geometry.ts dual                        # free: the real geometry on stored raw output (fixtures/)
```

On 7 Oct 2026 the deployed version scored: 32 s, $0.25; board 100%, roads 42/42, buildings 26/26
with nothing invented; settlement vs city 23/26 straight from the reading and 24–26/26 once the
colours are labelled and the recorded scores decide.

**The experiment scripts** (Python geometry, used to find the approach):

```sh
deno eval_parallel.ts <label> claude-opus-5-5 medium claude-opus-5-5 medium   # raw calls → par_results/
python -I -X utf8 snap.py <label> --solve --labelled --out=results/<label>.json
python -I -X utf8 score.py results/<label>.json
```

`snap.py` and `eval_geometry.ts` fall back to `fixtures/` (raw model output of earlier runs on the
test photo), so geometry and solver changes can be re-scored **without any API cost**. `--solve`
resolves settlement/city from the recorded scores; `--labelled` assumes the colours are labelled as
above (in the app a player does that); without it the solver also guesses the colours.

## Findings (7 Oct 2026, Opus 5.5 unless noted)

| Approach                                                    | Time                            | Cost       | Board                                          | Roads     | Buildings found         | Settlement vs city                          |
| ----------------------------------------------------------- | ------------------------------- | ---------- | ---------------------------------------------- | --------- | ----------------------- | ------------------------------------------- |
| One call, row/col coordinates, medium effort, 1568px images | 125–144 s                       | $0.28–0.34 | 100%                                           | 42/42     | 26/26                   | 18/26                                       |
| Same, low effort                                            | 30–61 s                         | $0.11–0.15 | harbours 7–8/11                                | 32–37/42  | 19–21/26 + 4–7 invented | 16–17                                       |
| Two phases (board, then 3 parallel row bands)               | 90 s                            | $0.74      | harbours 8/11                                  | 41/42     | 24/26                   | 17/24                                       |
| Message Batches API                                         | **> 1.5 hours, never returned** | ½ price    | –                                              | –         | –                       | –                                           |
| Sonnet 5.5, one call                                        | 14 s                            | $0.04      | read the hexes, then **gave up on all pieces** | 0         | 0                       | –                                           |
| **Pointing: 5 parallel calls + geometry in code**           | **35 s**                        | **~$0.25** | **100%**                                       | **42/42** | **26/26**               | **22–26/26** with scores + labelled colours |

Constraints that decided this: the Supabase project is on the **free plan → edge functions die after
150 s wall clock**, and a single careful call takes ~140 s (it's output-bound: ~10k thinking tokens).

### What works — "the model points, the code does the geometry"

1. **Five calls in parallel.** One board call on the overview (2576px, medium effort): per hex its
   terrain, number and **pixel position**; robber and harbours as pixel positions. Four piece calls,
   one per 2×2 crop at **full resolution** (58% of the photo per side): every building/road with its
   colour and pixel position, plus for buildings a city likelihood and the two ends of the piece.
2. **Never ask the model for rows/columns.** It sometimes misjudges the board's orientation (one
   run called the hexes "flat-topped in vertical columns" — wrong), while its pixel positions stay
   accurate. `snap.py` fits the known board shape onto the pointed hex centres itself (rotation search
   - iterative closest point + homography; never mirrored), then snaps every piece to the nearest
     corner/edge and merges duplicates from overlapping crops.
3. **Opus 5.5 takes images up to 2576px and returns pixel coordinates 1:1.** Sending 1568px (the
   old limit) wastes resolution. Board photos must therefore be full-resolution: picked from the
   gallery or taken with the camera in the board screen — never the 1600px session-photo copy.
4. **From straight above a settlement looks like a short road.** The model reported three settlements
   as roads — at corners, where no road can lie. A "road" whose middle is on a corner is therefore
   turned into a settlement, unless a building already stands next to that corner (the distance rule
   forbids it; that's where false hits from road ends land). This took buildings from 23 to 26/26
   with nothing invented.
5. **Settlement vs city comes from the scores.** The model's own call is weak (~70%), but its city
   likelihood plus the measured piece length (cities are ~1.5× longer) rank the true cities on top
   within each colour. Given who played which colour, each player's recorded `nederzettingen` fixes
   how many cities that colour has → take the most city-like ones. The recorded longest trade route
   pins one colour on its own. Pieces decided this way are shown dotted for a glance.
6. **More effort doesn't help the piece calls much; it does help the board call** (low effort: numbers
   25–29/30 and once a wrong orientation; medium: 30/30). Two independent readers per crop didn't fix
   the 3 "flat" settlements (both missed them) — the geometric rule did.

### Dead ends, and why

- **Batches**: cheap, but the test request sat in the queue for over 1.5 hours.
- **One big call**: accurate apart from cities, but ~140 s — at the free plan's 150 s limit.
- **Low effort for everything**: fast, but drops and invents pieces.
- **Splitting by row bands**: the prompt cache never hit (different output schemas/effort per call,
  and parallel calls can't read each other's cache), so it cost double without gaining accuracy.
- **Sonnet 5.5**: gives up on the full board; as a crop reader slightly weaker than Opus (40/42 roads).

## Ideas not tested yet

- Under 20 s: three quick low-effort board readers that vote per hex, or fast mode on the board call
  (the board call is the slowest of the five).
- Show the board as soon as the board call is done and let the pieces fill in.
- A photo after the setup round: stats on starting positions, and the end-of-game reading only needs
  pieces.
- The same pattern fits other games: the model only says what is where; each game supplies its
  geometry, rules and score link.
