// Runs the function's own geometry (boardGeometry.ts) on stored raw model output — no API calls.
// From this folder: npx deno run -A --node-modules-dir=none --no-config eval_geometry.ts <fixture>
// then: python -I -X utf8 score.py results/ts-<fixture>.json
import { assembleBoard, type ImageFrame } from '../boardGeometry.ts';

const label = Deno.args[0] ?? 'dual';
const only = Deno.args[1]; // optional: only use piece calls from this model, e.g. "opus"
const read = (path: string) => JSON.parse(Deno.readTextFileSync(path));
const run = (() => {
  try {
    return read(`par_results/${label}.json`);
  } catch {
    return read(`fixtures/${label}.json`);
  }
})();
const geo = (() => {
  try {
    return read('par_imgs/geometry.json');
  } catch {
    return read('fixtures/geometry.json');
  }
})();

const frame = (file: string): ImageFrame => {
  const g = geo.images.find((i: { file: string }) => i.file === file);
  return { x0: g.x0, y0: g.y0, scale: g.scale, width: g.size[0], height: g.size[1] };
};
const [board, ...pieces] = run.results;
const { state, diagnostics } = assembleBoard(
  'extended',
  board.output,
  frame(board.file),
  pieces
    .filter((r: { model: string }) => !only || r.model.includes(only))
    .map((r: { file: string; output: unknown }) => ({ frame: frame(r.file), pieces: r.output })),
);
console.log(JSON.stringify(diagnostics));
Deno.mkdirSync('results', { recursive: true });
Deno.writeTextFileSync(
  `results/ts-${label}${only ? `-${only}` : ''}.json`,
  JSON.stringify({ state, model: board.model, usage: {}, durationMs: run.wall }, null, 1),
);
