// Runs the app's own settlement/city solver and colour suggestions (src/features/boardScan/catan.ts)
// on an analysed board — no API calls. From this folder:
//   npx deno run -A --node-modules-dir=none --no-config eval_solver.ts results/live-<label>.json
// Writes <input>-suggested.json (colours as suggested) and <input>-labelled.json (colours as
// labelled by the players) for score.py.
import {
  normalizeState,
  resolveBuildingKinds,
  suggestColorPlayers,
  type BoardState,
  type PieceColor,
  type RecordedScore,
} from '../../../../src/features/boardScan/catan.ts';

const input = Deno.args[0];
const run = JSON.parse(Deno.readTextFileSync(input));
// The verified test game (see README): recorded building points and the longest trade route.
const recorded: Record<string, RecordedScore> = {
  Pim: { buildingPoints: 5, longestRoad: true },
  Sangu: { buildingPoints: 8, longestRoad: false },
  Martje: { buildingPoints: 9, longestRoad: false },
  'May-C': { buildingPoints: 6, longestRoad: false },
  Faralley: { buildingPoints: 7, longestRoad: false },
};
const labelled: Partial<Record<PieceColor, string>> = {
  green: 'Pim',
  red: 'Sangu',
  blue: 'Martje',
  orange: 'May-C',
  white: 'Faralley',
};

const state = normalizeState('extended', run.state as BoardState);
const suggested = suggestColorPlayers('extended', state, recorded, {});
console.log('suggested:', JSON.stringify(suggested));
for (const [name, mapping] of [
  ['suggested', suggested],
  ['labelled', labelled],
] as const) {
  const resolved = resolveBuildingKinds(state, mapping, recorded);
  Deno.writeTextFileSync(
    input.replace(/\.json$/, `-${name}.json`),
    JSON.stringify({ ...run, state: resolved }, null, 1),
  );
}
