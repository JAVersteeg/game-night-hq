// Runs the function's real analysis (boardVision.ts + boardGeometry.ts) on images made by
// prepare_images.py — the same overview + crops the app uploads. Costs ~$0.25 per run.
// From this folder: npx deno run -A --node-modules-dir=none --no-config eval_live.ts <label>
// then: python -I -X utf8 score.py results/live-<label>.json
import { load } from 'jsr:@std/dotenv@0.225.5';
import { encodeBase64 } from 'jsr:@std/encoding@1.0.10/base64';

import { analyzeBoard, type BoardImage } from '../boardVision.ts';

const env = await load({ envPath: '../../.env.local' });
const label = Deno.args[0] ?? 'run';
const geo = JSON.parse(Deno.readTextFileSync('par_imgs/geometry.json'));
const images: BoardImage[] = geo.images.map(
  (g: { file: string; x0: number; y0: number; scale: number; size: number[] }) => ({
    source: { base64: encodeBase64(Deno.readFileSync(`par_imgs/${g.file}`)) },
    frame: { x0: g.x0, y0: g.y0, scale: g.scale, width: g.size[0], height: g.size[1] },
  }),
);

const [overview, ...crops] = images;
const result = await analyzeBoard({
  apiKey: env.ANTHROPIC_API_KEY,
  layout: 'extended',
  overview,
  crops,
});
Deno.mkdirSync('results', { recursive: true });
Deno.writeTextFileSync(
  `results/live-${label}.json`,
  JSON.stringify({ ...result, durationMs: result.usage.duration_ms }, null, 1),
);
console.log(JSON.stringify(result.usage));
