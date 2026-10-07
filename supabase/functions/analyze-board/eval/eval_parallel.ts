// "Point, don't map" experiment (run from this folder): npx deno run -A --node-modules-dir=none --no-config eval_parallel.ts <label> <boardModel> <boardEffort> <pieceModel> <pieceEffort>
// One call reads the board + pixel centre of every hex from the overview; one call per crop lists
// the pieces with pixel positions. All calls run in parallel; geometry happens offline in Python.
import { load } from 'jsr:@std/dotenv@0.225.5';
import { encodeBase64 } from 'jsr:@std/encoding@1.0.10/base64';
import Anthropic from 'npm:@anthropic-ai/sdk@0.131.0';

const env = await load({
  envPath: '../../.env.local',
});
const [
  label = 'run',
  boardModel = 'claude-opus-5-5',
  boardEffort = 'low',
  pieceModels = 'claude-opus-5-5',
  pieceEffort = 'low',
] = Deno.args;
const geo = JSON.parse(Deno.readTextFileSync('par_imgs/geometry.json'));
const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

const int = { type: 'integer' };
const num = { type: 'number' };
const obj = (properties: Record<string, unknown>) => ({
  type: 'object',
  additionalProperties: false,
  required: Object.keys(properties),
  properties,
});
const COLORS = ['red', 'blue', 'orange', 'white', 'green', 'brown'];

const BOARD_SCHEMA = obj({
  orientation: { type: 'string' },
  hexes: {
    type: 'array',
    items: obj({
      row: int,
      col: int,
      terrain: {
        type: 'string',
        enum: ['forest', 'pasture', 'fields', 'hills', 'mountains', 'desert'],
      },
      number: { type: 'integer', enum: [0, 2, 3, 4, 5, 6, 8, 9, 10, 11, 12] },
      x: int,
      y: int,
    }),
  },
  robber: obj({ x: int, y: int }),
  harbours: {
    type: 'array',
    items: obj({
      kind: { type: 'string', enum: ['generic', 'lumber', 'brick', 'wool', 'grain', 'ore'] },
      x: int,
      y: int,
    }),
  },
  notes: { type: 'string' },
});

const PIECES_SCHEMA = obj({
  buildings: {
    type: 'array',
    items: obj({
      color: { type: 'string', enum: COLORS },
      kind: { type: 'string', enum: ['settlement', 'city'] },
      city_likelihood: num,
      x: int,
      y: int,
      end1_x: int,
      end1_y: int,
      end2_x: int,
      end2_y: int,
    }),
  },
  roads: { type: 'array', items: obj({ color: { type: 'string', enum: COLORS }, x: int, y: int }) },
  notes: { type: 'string' },
});

const BOARD_PROMPT = (
  w: number,
  h: number,
) => `This photo (${w}×${h} pixels) shows a finished game of Catan, base game, 5–6 player board.

Land hexes are pointy-topped and lie in horizontal rows; from top to bottom the rows hold 3, 4, 5, 6, 5, 4, 3 hexes (row 0–6, columns from the left starting at 0). If the hexes look flat-topped in the photo, use the rotation by 90° that makes them pointy-topped and describe it in \`orientation\`.

Report:
- \`hexes\`: every land hex once with row, col, terrain and number token (0 for a desert), and x, y: the pixel position of the hex's centre in this photo (the middle of its number token; for a desert the middle of the hex). Terrains: forest (dark green trees), pasture (light green grass), fields (yellow grain), hills (orange-brown clay), mountains (grey rock), desert. Number tokens can be rotated; 6 and 8 are printed in red, all other numbers in black.
- \`robber\`: x, y: the pixel position of the robber (a dark pawn standing on one hex).
- \`harbours\`: every harbour: kind (generic for 3:1, else the resource of the 2:1 harbour) and x, y: the pixel position on the coastline midway between the harbour's two landing spots.`;

const PIECES_PROMPT = (
  w: number,
  h: number,
) => `This photo (${w}×${h} pixels) shows part of a finished game of Catan.

List every playing piece standing on the board that is at least half visible in this photo:
- \`buildings\` on the corners where hexes meet: colour, kind, city_likelihood (0 = certainly a settlement, 1 = certainly a city), x, y: the pixel position of the centre of the piece's base, and end1/end2: the pixel positions of the two ends of the piece along its longest side.
  Look at every building closely before deciding its kind. A settlement is ONE small house with a single pointed roof. A city is a house with a taller block (tower) attached to it: it looks like two pieces joined together, its footprint is roughly twice as long as a settlement's, and it has two different heights. Compare buildings with each other — cities are visibly bigger than settlements. Cities are common in a finished game.
- \`roads\` lying along the edges between hexes: colour and x, y: the pixel position of the middle of the stick.
Colours: red, blue, orange, white, green, brown. Ignore pieces lying next to the board, cards and everything else that is not on the board.`;

async function ask(
  model: string,
  effort: string,
  file: string,
  size: number[],
  prompt: string,
  schema: unknown,
) {
  const started = Date.now();
  const stream = client.messages.stream({
    model,
    max_tokens: 32000,
    output_config: { effort, format: { type: 'json_schema', schema } },
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/jpeg',
              data: encodeBase64(Deno.readFileSync(`par_imgs/${file}`)),
            },
          },
          { type: 'text', text: prompt },
        ],
      },
    ],
  } as Anthropic.Messages.MessageCreateParamsStreaming);
  const message = await stream.finalMessage();
  const text = message.content.find((b) => b.type === 'text');
  return {
    file,
    model: message.model,
    ms: Date.now() - started,
    usage: message.usage,
    stop: message.stop_reason,
    output: text && text.type === 'text' ? JSON.parse(text.text) : null,
  };
}

const started = Date.now();
const [ov, ...crops] = geo.images;
const results = await Promise.all([
  ask(
    boardModel,
    boardEffort,
    ov.file,
    ov.size,
    BOARD_PROMPT(ov.size[0], ov.size[1]),
    BOARD_SCHEMA,
  ),
  ...pieceModels
    .split(',')
    .flatMap((pieceModel) =>
      crops.map((c: { file: string; size: number[] }) =>
        ask(
          pieceModel,
          pieceEffort,
          c.file,
          c.size,
          PIECES_PROMPT(c.size[0], c.size[1]),
          PIECES_SCHEMA,
        ),
      ),
    ),
]);
const wall = Date.now() - started;
Deno.mkdirSync('par_results', { recursive: true });
Deno.writeTextFileSync(`par_results/${label}.json`, JSON.stringify({ wall, results }, null, 1));
console.log(`wall ${Math.round(wall / 1000)}s`);
for (const r of results) {
  console.log(
    `${r.file} ${r.model} ${Math.round(r.ms / 1000)}s in ${r.usage.input_tokens} out ${r.usage.output_tokens} stop ${r.stop}`,
  );
}
