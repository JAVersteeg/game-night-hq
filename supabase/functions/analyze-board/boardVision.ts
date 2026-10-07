// Reads a Catan board from a photo with Claude. The model only POINTS — what is where, in pixels —
// in parallel calls: one on an overview of the whole board for the hexes, robber and harbours, and
// one per full-resolution crop for the pieces. boardGeometry.ts does the rest. About 35 s and
// $0.25 per board; measurements and the dead ends that led here: eval/README.md.
import Anthropic from 'npm:@anthropic-ai/sdk@0.131.0';

import {
  assembleBoard,
  ROWS,
  type ImageFrame,
  type Layout,
  type PointedBoard,
  type PointedPieces,
} from './boardGeometry.ts';

export type { ImageFrame, Layout } from './boardGeometry.ts';

export const MODEL = 'claude-opus-5-5';
/** Opus 5.5's image limit; it returns pixel coordinates 1:1 up to this size. */
export const MAX_IMAGE_EDGE = 2576;

const COLORS = ['red', 'blue', 'orange', 'white', 'green', 'brown'];
const int = { type: 'integer' };
const obj = (properties: Record<string, unknown>) => ({
  type: 'object',
  additionalProperties: false,
  required: Object.keys(properties),
  properties,
});

const BOARD_SCHEMA = obj({
  hexes: {
    type: 'array',
    items: obj({
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
      city_likelihood: { type: 'number' },
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

function boardPrompt(layout: Layout, width: number, height: number): string {
  const rows = ROWS[layout];
  const count = rows.reduce((s, n) => s + n, 0);
  return `This photo (${width}×${height} pixels) shows a finished game of Catan: the base game on the ${
    layout === 'standard' ? '3–4' : '5–6'
  } player board, whose ${count} land hexes form rows of ${rows.join(', ')} hexes.

Report:
- \`hexes\`: every land hex once, with its terrain, its number token (0 for a desert) and x, y: the pixel position of the hex's centre in this photo (the middle of its number token; for a desert the middle of the hex). Terrains: forest (dark green trees), pasture (light green grass), fields (yellow grain), hills (orange-brown clay), mountains (grey rock), desert (sand). Number tokens can be rotated in any direction; 6 and 8 are printed in red, all other numbers in black.
- \`robber\`: x, y: the pixel position of the robber (a dark pawn standing on one hex).
- \`harbours\`: every harbour: kind (generic for 3:1, else the resource of the 2:1 harbour) and x, y: the pixel position on the coastline midway between the harbour's two landing spots.
Put anything you could not read with confidence in \`notes\`.`;
}

function piecesPrompt(width: number, height: number): string {
  return `This photo (${width}×${height} pixels) shows part of a finished game of Catan.

List every playing piece standing on the board that is at least half visible in this photo:
- \`buildings\` on the corners where hexes meet: colour, kind, city_likelihood (0 = certainly a settlement, 1 = certainly a city), x, y: the pixel position of the centre of the piece's base, and end1/end2: the pixel positions of the two ends of the piece along its longest side.
  Look at every building closely before deciding its kind. A settlement is ONE small house with a single pointed roof. A city is a house with a taller block (tower) attached to it: it looks like two pieces joined together, its footprint is roughly twice as long as a settlement's, and it has two different heights. Compare buildings with each other — cities are visibly bigger than settlements. Cities are common in a finished game.
- \`roads\` lying along the edges between hexes: colour and x, y: the pixel position of the middle of the stick.
Colours: red, blue, orange, white, green, brown. Ignore pieces lying next to the board, cards and everything else that is not on the board.
Put anything you could not read with confidence in \`notes\`.`;
}

export type ImageSource = { url: string } | { base64: string };
export interface BoardImage {
  source: ImageSource;
  frame: ImageFrame;
}

interface CallResult<T> {
  output: T;
  usage: Record<string, unknown>;
  ms: number;
}

async function ask<T>(
  client: Anthropic,
  image: BoardImage,
  prompt: string,
  schema: unknown,
): Promise<CallResult<T>> {
  const started = Date.now();
  const stream = client.beta.messages.stream({
    model: MODEL,
    max_tokens: 16000,
    betas: ['server-side-fallback-2026-07-01'],
    // Re-runs a (very unlikely) safety decline on Anthropic's recommended fallback model.
    fallbacks: 'default',
    output_config: { effort: 'medium', format: { type: 'json_schema', schema } },
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source:
              'url' in image.source
                ? { type: 'url', url: image.source.url }
                : { type: 'base64', media_type: 'image/jpeg', data: image.source.base64 },
          },
          { type: 'text', text: prompt },
        ],
      },
    ],
  } as Anthropic.Beta.MessageCreateParamsStreaming);
  const message = await stream.finalMessage();

  if (message.stop_reason === 'refusal') throw new Error('Claude declined to read this photo.');
  if (message.stop_reason === 'max_tokens') throw new Error('The answer was cut off.');
  const text = message.content.find((block) => block.type === 'text');
  if (!text || text.type !== 'text') throw new Error('No answer in the response.');
  return {
    output: JSON.parse(text.text) as T,
    usage: message.usage as unknown as Record<string, unknown>,
    ms: Date.now() - started,
  };
}

/**
 * Reads a board. `overview` is the whole photo at most `MAX_IMAGE_EDGE` px; `crops` cover it in
 * overlapping parts at full resolution. Every call runs at once, so the slowest one sets the time.
 */
export async function analyzeBoard(opts: {
  apiKey: string;
  layout: Layout;
  overview: BoardImage;
  crops: BoardImage[];
}) {
  const client = new Anthropic({ apiKey: opts.apiKey });
  const started = Date.now();
  const { width, height } = opts.overview.frame;
  const [board, ...pieces] = await Promise.all([
    ask<PointedBoard>(client, opts.overview, boardPrompt(opts.layout, width, height), BOARD_SCHEMA),
    ...opts.crops.map((crop) =>
      ask<PointedPieces>(
        client,
        crop,
        piecesPrompt(crop.frame.width, crop.frame.height),
        PIECES_SCHEMA,
      ),
    ),
  ]);

  const { state, diagnostics } = assembleBoard(
    opts.layout,
    board.output,
    opts.overview.frame,
    pieces.map((p, i) => ({ frame: opts.crops[i].frame, pieces: p.output })),
  );

  const calls = [board, ...pieces];
  const sum = (field: string) =>
    calls.reduce(
      (s, c) => s + (typeof c.usage[field] === 'number' ? (c.usage[field] as number) : 0),
      0,
    );
  return {
    state,
    model: MODEL,
    usage: {
      calls: calls.length,
      input_tokens: sum('input_tokens'),
      output_tokens: sum('output_tokens'),
      call_ms: calls.map((c) => c.ms),
      duration_ms: Date.now() - started,
      geometry: diagnostics,
    },
  };
}
