/**
 * The digital Catan board read from a photo (`board_scans.state`): its shape, geometry and the rule
 * checks run on it. Pure logic, no React — the same checks run live while someone corrects a board.
 *
 * Coordinates follow the edge function's prompt: pointy-topped hexes in horizontal rows, row 0 at
 * the top, columns from the left. A corner or edge shared by several hexes can be named via any of
 * them, so everything is compared through `cornerKey` / `edgeKey`, which are geometric.
 */

export type Layout = 'standard' | 'extended';
export type Terrain = 'forest' | 'pasture' | 'fields' | 'hills' | 'mountains' | 'desert';
export type Corner = 'N' | 'NE' | 'SE' | 'S' | 'SW' | 'NW';
export type Edge = 'NE' | 'E' | 'SE' | 'SW' | 'W' | 'NW';
export type PieceColor = 'red' | 'blue' | 'orange' | 'white' | 'green' | 'brown';
export type HarbourKind = 'generic' | 'lumber' | 'brick' | 'wool' | 'grain' | 'ore';
export type BuildingKind = 'settlement' | 'city';

export interface Hex {
  row: number;
  col: number;
  terrain: Terrain;
  /** 0 for the desert. */
  number: number;
}
export interface Harbour {
  row: number;
  col: number;
  edge: Edge;
  kind: HarbourKind;
}
export interface Building {
  color: PieceColor;
  row: number;
  col: number;
  corner: Corner;
  kind: BuildingKind;
  /** False when the reading wasn't certain; cleared once someone confirms or edits the piece. */
  sure: boolean;
  /** How city-like the piece looked, 0..1 within its photo (the reading's own estimate combined
   *  with the piece's measured length). Ranks a colour's buildings when the scores decide. */
  cityScore?: number;
  /** Set by a hand-made correction, which the scores never override. */
  edited?: boolean;
}
export interface Road {
  color: PieceColor;
  row: number;
  col: number;
  edge: Edge;
}
export interface BoardState {
  orientation: string;
  hexes: Hex[];
  robber: { row: number; col: number };
  harbours: Harbour[];
  buildings: Building[];
  roads: Road[];
  notes: string;
}

export const ROWS: Record<Layout, number[]> = {
  standard: [3, 4, 5, 4, 3],
  extended: [3, 4, 5, 6, 5, 4, 3],
};
export const CORNERS: Corner[] = ['N', 'NE', 'SE', 'S', 'SW', 'NW'];
/** Edge i joins corner i and corner i + 1. */
export const EDGES: Edge[] = ['NE', 'E', 'SE', 'SW', 'W', 'NW'];
export const PIECE_COLORS: PieceColor[] = ['red', 'blue', 'orange', 'white', 'green', 'brown'];
export const TERRAINS: Terrain[] = ['forest', 'pasture', 'fields', 'hills', 'mountains', 'desert'];
export const NUMBERS = [2, 3, 4, 5, 6, 8, 9, 10, 11, 12];

const TERRAIN_COUNTS: Record<Layout, Record<Terrain, number>> = {
  standard: { forest: 4, pasture: 4, fields: 4, hills: 3, mountains: 3, desert: 1 },
  extended: { forest: 6, pasture: 6, fields: 6, hills: 5, mountains: 5, desert: 2 },
};
const NUMBER_COUNTS: Record<Layout, Record<number, number>> = {
  standard: { 2: 1, 3: 2, 4: 2, 5: 2, 6: 2, 8: 2, 9: 2, 10: 2, 11: 2, 12: 1 },
  extended: { 2: 2, 3: 3, 4: 3, 5: 3, 6: 3, 8: 3, 9: 3, 10: 3, 11: 3, 12: 2 },
};
const HARBOUR_COUNTS: Record<Layout, Record<HarbourKind, number>> = {
  standard: { generic: 4, lumber: 1, brick: 1, wool: 1, grain: 1, ore: 1 },
  extended: { generic: 5, lumber: 1, brick: 1, wool: 2, grain: 1, ore: 1 },
};
const PIECE_LIMITS = { settlement: 5, city: 4, road: 15 };
/** Longest trade route needs at least this many connected roads. */
export const LONGEST_ROAD_MIN = 5;

export const TERRAIN_LABEL: Record<Terrain, string> = {
  forest: 'bos',
  pasture: 'weiland',
  fields: 'akker',
  hills: 'heuvels',
  mountains: 'bergen',
  desert: 'woestijn',
};
export const COLOR_LABEL: Record<PieceColor, string> = {
  red: 'rood',
  blue: 'blauw',
  orange: 'oranje',
  white: 'wit',
  green: 'groen',
  brown: 'bruin',
};
export const HARBOUR_LABEL: Record<HarbourKind, string> = {
  generic: '3:1',
  lumber: '2:1 hout',
  brick: '2:1 steen',
  wool: '2:1 wol',
  grain: '2:1 graan',
  ore: '2:1 erts',
};

// ---- Geometry (unit hexes: corner radius 1) ----

export type Point = { x: number; y: number };

export function hexCenter(layout: Layout, row: number, col: number): Point {
  return { x: (col - (ROWS[layout][row] - 1) / 2) * Math.sqrt(3), y: row * 1.5 };
}

export function cornerPoint(layout: Layout, row: number, col: number, corner: number): Point {
  const c = hexCenter(layout, row, col);
  const angle = ((-90 + 60 * corner) * Math.PI) / 180;
  return { x: c.x + Math.cos(angle), y: c.y + Math.sin(angle) };
}

const pointKey = (p: Point) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`.replace(/-0\.00/g, '0.00');

export function cornerKey(layout: Layout, row: number, col: number, corner: Corner): string {
  return pointKey(cornerPoint(layout, row, col, CORNERS.indexOf(corner)));
}

export function edgeCorners(
  layout: Layout,
  row: number,
  col: number,
  edge: Edge,
): [string, string] {
  const i = EDGES.indexOf(edge);
  const a = pointKey(cornerPoint(layout, row, col, i));
  const b = pointKey(cornerPoint(layout, row, col, (i + 1) % 6));
  return a < b ? [a, b] : [b, a];
}

export function edgeKey(layout: Layout, row: number, col: number, edge: Edge): string {
  return edgeCorners(layout, row, col, edge).join('|');
}

export function onBoard(layout: Layout, row: number, col: number): boolean {
  return row >= 0 && row < ROWS[layout].length && col >= 0 && col < ROWS[layout][row];
}

export function allHexes(layout: Layout): { row: number; col: number }[] {
  return ROWS[layout].flatMap((n, row) => Array.from({ length: n }, (_, col) => ({ row, col })));
}

/** Every board corner, with the corners one edge away. */
function cornerGraph(layout: Layout): Map<string, Set<string>> {
  const graph = new Map<string, Set<string>>();
  for (const { row, col } of allHexes(layout)) {
    for (const edge of EDGES) {
      const [a, b] = edgeCorners(layout, row, col, edge);
      if (!graph.has(a)) graph.set(a, new Set());
      if (!graph.has(b)) graph.set(b, new Set());
      graph.get(a)!.add(b);
      graph.get(b)!.add(a);
    }
  }
  return graph;
}

/** Drops pieces off the board and duplicates of the same corner/edge (first one wins). */
export function normalizeState(layout: Layout, state: BoardState): BoardState {
  const seenCorners = new Set<string>();
  const seenEdges = new Set<string>();
  return {
    ...state,
    hexes: state.hexes.filter((h) => onBoard(layout, h.row, h.col)),
    buildings: state.buildings.filter((b) => {
      if (!onBoard(layout, b.row, b.col) || !CORNERS.includes(b.corner)) return false;
      const key = cornerKey(layout, b.row, b.col, b.corner);
      if (seenCorners.has(key)) return false;
      seenCorners.add(key);
      return true;
    }),
    roads: state.roads.filter((r) => {
      if (!onBoard(layout, r.row, r.col) || !EDGES.includes(r.edge)) return false;
      const key = edgeKey(layout, r.row, r.col, r.edge);
      if (seenEdges.has(key)) return false;
      seenEdges.add(key);
      return true;
    }),
  };
}

// ---- Per colour ----

export interface ColorSummary {
  color: PieceColor;
  settlements: number;
  cities: number;
  roads: number;
  /** Settlements 1, cities 2 — comparable to the `nederzettingen` score field. */
  buildingPoints: number;
  longestRoad: number;
  /** Holds the longest trade route: the unique longest road of at least `LONGEST_ROAD_MIN`. */
  hasLongestRoad: boolean;
  unsure: number;
}

function longestRoad(
  layout: Layout,
  color: PieceColor,
  roads: Road[],
  occupiedBy: Map<string, PieceColor>,
): number {
  const adjacency = new Map<string, { edge: string; to: string }[]>();
  for (const r of roads) {
    const [a, b] = edgeCorners(layout, r.row, r.col, r.edge);
    const edge = `${a}|${b}`;
    if (!adjacency.has(a)) adjacency.set(a, []);
    if (!adjacency.has(b)) adjacency.set(b, []);
    adjacency.get(a)!.push({ edge, to: b });
    adjacency.get(b)!.push({ edge, to: a });
  }
  let best = 0;
  const walk = (corner: string, used: Set<string>) => {
    best = Math.max(best, used.size);
    // An opponent's building cuts the road: you can arrive at it, not pass through.
    const owner = occupiedBy.get(corner);
    if (used.size > 0 && owner && owner !== color) return;
    for (const { edge, to } of adjacency.get(corner) ?? []) {
      if (used.has(edge)) continue;
      used.add(edge);
      walk(to, used);
      used.delete(edge);
    }
  };
  for (const corner of adjacency.keys()) walk(corner, new Set());
  return best;
}

export function summarize(layout: Layout, state: BoardState): ColorSummary[] {
  const occupiedBy = new Map(
    state.buildings.map((b) => [cornerKey(layout, b.row, b.col, b.corner), b.color] as const),
  );
  const colors = PIECE_COLORS.filter(
    (c) => state.buildings.some((b) => b.color === c) || state.roads.some((r) => r.color === c),
  );
  const summaries = colors.map((color): ColorSummary => {
    const buildings = state.buildings.filter((b) => b.color === color);
    const roads = state.roads.filter((r) => r.color === color);
    const settlements = buildings.filter((b) => b.kind === 'settlement').length;
    const cities = buildings.length - settlements;
    return {
      color,
      settlements,
      cities,
      roads: roads.length,
      buildingPoints: settlements + 2 * cities,
      longestRoad: longestRoad(layout, color, roads, occupiedBy),
      hasLongestRoad: false,
      unsure: buildings.filter((b) => !b.sure).length,
    };
  });
  const top = Math.max(0, ...summaries.map((s) => s.longestRoad));
  const leaders = summaries.filter((s) => s.longestRoad === top);
  if (top >= LONGEST_ROAD_MIN && leaders.length === 1) leaders[0].hasLongestRoad = true;
  return summaries;
}

// ---- Rule checks ----

export interface Issue {
  /** `error`: the board can't be like this. `warning`: worth a second look. */
  level: 'error' | 'warning';
  message: string;
}

export function checkBoard(layout: Layout, state: BoardState): Issue[] {
  const issues: Issue[] = [];
  const error = (message: string) => issues.push({ level: 'error', message });

  const filled = new Set(state.hexes.map((h) => `${h.row},${h.col}`));
  const missing = allHexes(layout).filter(({ row, col }) => !filled.has(`${row},${col}`)).length;
  if (missing > 0) error(`${missing} ${missing === 1 ? 'vakje is' : 'vakjes zijn'} nog leeg.`);

  for (const terrain of TERRAINS) {
    const want = TERRAIN_COUNTS[layout][terrain];
    const have = state.hexes.filter((h) => h.terrain === terrain).length;
    if (have !== want) error(`${have}× ${TERRAIN_LABEL[terrain]}, dat moet ${want}× zijn.`);
  }
  for (const n of NUMBERS) {
    const want = NUMBER_COUNTS[layout][n];
    const have = state.hexes.filter((h) => h.number === n).length;
    if (have !== want) error(`Getal ${n} ligt er ${have}×, dat moet ${want}× zijn.`);
  }
  if (state.hexes.some((h) => (h.terrain === 'desert') !== (h.number === 0))) {
    error('Alleen de woestijn heeft geen getal.');
  }
  const reds = state.hexes.filter((h) => h.number === 6 || h.number === 8);
  const adjacentRed = reds.some((a, i) =>
    reds.slice(i + 1).some((b) => {
      const p = hexCenter(layout, a.row, a.col);
      const q = hexCenter(layout, b.row, b.col);
      return Math.hypot(p.x - q.x, p.y - q.y) < Math.sqrt(3) + 0.01;
    }),
  );
  if (adjacentRed) error('Twee rode getallen (6 of 8) liggen naast elkaar.');

  for (const [kind, want] of Object.entries(HARBOUR_COUNTS[layout]) as [HarbourKind, number][]) {
    const have = state.harbours.filter((h) => h.kind === kind).length;
    if (have !== want) error(`${have}× haven ${HARBOUR_LABEL[kind]}, dat moet ${want}× zijn.`);
  }

  const graph = cornerGraph(layout);
  const occupiedBy = new Map(
    state.buildings.map((b) => [cornerKey(layout, b.row, b.col, b.corner), b.color] as const),
  );
  for (const s of summarize(layout, state)) {
    const name = COLOR_LABEL[s.color];
    if (s.settlements > PIECE_LIMITS.settlement) {
      error(`${name} heeft ${s.settlements} dorpen, maximaal ${PIECE_LIMITS.settlement}.`);
    }
    if (s.cities > PIECE_LIMITS.city)
      error(`${name} heeft ${s.cities} steden, maximaal ${PIECE_LIMITS.city}.`);
    if (s.roads > PIECE_LIMITS.road)
      error(`${name} heeft ${s.roads} wegen, maximaal ${PIECE_LIMITS.road}.`);

    const corners = state.buildings
      .filter((b) => b.color === s.color)
      .map((b) => cornerKey(layout, b.row, b.col, b.corner));
    const roadCorners = state.roads
      .filter((r) => r.color === s.color)
      .map((r) => edgeCorners(layout, r.row, r.col, r.edge));
    const touchesRoad = new Set(roadCorners.flat());

    if (corners.some((c) => [...(graph.get(c) ?? [])].some((n) => occupiedBy.has(n)))) {
      error(`Een gebouw van ${name} staat direct naast een ander gebouw.`);
    }
    if (corners.some((c) => !touchesRoad.has(c))) {
      issues.push({ level: 'warning', message: `Een gebouw van ${name} raakt geen eigen weg.` });
    }

    // Every road must be reachable from an own building without passing an opponent's.
    const reached = new Set<string>();
    const frontier = [...corners];
    const visited = new Set(frontier);
    while (frontier.length > 0) {
      const corner = frontier.pop()!;
      const owner = occupiedBy.get(corner);
      if (owner && owner !== s.color) continue;
      roadCorners.forEach(([a, b], i) => {
        if ((a !== corner && b !== corner) || reached.has(String(i))) return;
        reached.add(String(i));
        const next = a === corner ? b : a;
        if (!visited.has(next)) {
          visited.add(next);
          frontier.push(next);
        }
      });
    }
    if (reached.size < roadCorners.length) {
      issues.push({ level: 'warning', message: `Een weg van ${name} hangt los van de rest.` });
    }
  }
  return issues;
}

// ---- Against the recorded scores ----

/** Per user, the session's recorded building points (`nederzettingen`) and longest-road holder. */
export interface RecordedScore {
  buildingPoints: number | null;
  longestRoad: boolean;
}

export interface ScoreMismatch {
  color: PieceColor;
  userId: string;
  message: string;
}

export const BUILDING_POINTS_FIELD = 'nederzettingen';
export const LONGEST_ROAD_FIELD = 'langste_handelsroute';
/** Not on the board: shown from the recorded scores only. */
export const LARGEST_ARMY_FIELD = 'grootste_riddermacht';
/** Victory points from development cards — in the hand, not on the board. */
export const DEV_CARDS_FIELD = 'ontwikkelingskaarten';

/** Each participant's recorded building points and longest trade route, from the session scores. */
export function recordedScores(
  participantIds: string[],
  scoresByUser: Record<string, Record<string, number>>,
): Record<string, RecordedScore> {
  return Object.fromEntries(
    participantIds.map((userId) => [
      userId,
      {
        buildingPoints: scoresByUser[userId]?.[BUILDING_POINTS_FIELD] ?? null,
        longestRoad: (scoresByUser[userId]?.[LONGEST_ROAD_FIELD] ?? 0) > 0,
      },
    ]),
  );
}

export function compareWithScores(
  summaries: ColorSummary[],
  colorPlayers: Partial<Record<PieceColor, string>>,
  recorded: Record<string, RecordedScore>,
  playerName: (userId: string) => string,
): ScoreMismatch[] {
  const mismatches: ScoreMismatch[] = [];
  for (const s of summaries) {
    const userId = colorPlayers[s.color];
    const score = userId ? recorded[userId] : undefined;
    if (!userId || !score) continue;
    const name = playerName(userId);
    if (score.buildingPoints !== null && score.buildingPoints !== s.buildingPoints) {
      mismatches.push({
        color: s.color,
        userId,
        message: `${name}: bord ${s.buildingPoints} punten in gebouwen, ingevuld ${score.buildingPoints}.`,
      });
    }
    if (score.longestRoad !== s.hasLongestRoad) {
      mismatches.push({
        color: s.color,
        userId,
        message: s.hasLongestRoad
          ? `${name} heeft volgens het bord de langste handelsroute (${s.longestRoad}), maar die is niet ingevuld.`
          : `${name} heeft de langste handelsroute ingevuld, maar het bord geeft een route van ${s.longestRoad}.`,
      });
    }
  }
  return mismatches;
}

// ---- Settlement vs city from the scores ----

/** City evidence of a building, 0..1 — the reading's score, else its current kind. */
const cityEvidence = (b: Building) => b.cityScore ?? (b.kind === 'city' ? 0.75 : 0.25);
const asProbability = (p: number) => Math.min(0.95, Math.max(0.05, p));

/**
 * One colour's buildings holding `points` building points: that fixes how many are cities, and the
 * most city-like ones get to be them. Null when the buildings can't add up to the points (too few,
 * too many, or beyond the piece limits). Hand-made corrections stay as they are.
 */
function citiesFor(
  buildings: Building[],
  points: number,
): { logLikelihood: number; cities: Set<Building> } | null {
  const cities = points - buildings.length;
  if (
    cities < 0 ||
    cities > Math.min(PIECE_LIMITS.city, buildings.length) ||
    buildings.length - cities > PIECE_LIMITS.settlement
  ) {
    return null;
  }
  const editedCities = buildings.filter((b) => b.edited && b.kind === 'city');
  const free = buildings.filter((b) => !b.edited).sort((a, b) => cityEvidence(b) - cityEvidence(a));
  const freeCities = cities - editedCities.length;
  if (freeCities < 0 || freeCities > free.length) return null;
  const logLikelihood = free.reduce((sum, b, i) => {
    const p = asProbability(cityEvidence(b));
    return sum + Math.log(i < freeCities ? p : 1 - p);
  }, 0);
  return { logLikelihood, cities: new Set([...editedCities, ...free.slice(0, freeCities)]) };
}

function byColor(buildings: Building[]): Map<PieceColor, Building[]> {
  const groups = new Map<PieceColor, Building[]>();
  for (const b of buildings) groups.set(b.color, [...(groups.get(b.color) ?? []), b]);
  return groups;
}

/**
 * Settlement vs city is the weakest part of a reading (~70% on its own), but the recorded scores
 * pin it down: once a colour is labelled, its player's `nederzettingen` decide how many of its
 * buildings are cities. Returns the board as it should be shown — pieces whose kind this changed
 * are marked unsure so they're easy to check. Hand-made corrections are never overridden, and a
 * colour whose buildings can't add up to the recorded points is left as read.
 */
export function resolveBuildingKinds(
  state: BoardState,
  colorPlayers: Partial<Record<PieceColor, string>>,
  recorded: Record<string, RecordedScore>,
): BoardState {
  const decided = new Map<Building, BuildingKind>();
  for (const [color, buildings] of byColor(state.buildings)) {
    const userId = colorPlayers[color];
    const points = userId ? recorded[userId]?.buildingPoints : null;
    if (points === null || points === undefined) continue;
    const result = citiesFor(buildings, points);
    if (!result) continue;
    for (const b of buildings) {
      if (!b.edited) decided.set(b, result.cities.has(b) ? 'city' : 'settlement');
    }
  }
  return {
    ...state,
    buildings: state.buildings.map((b) => {
      const kind = decided.get(b);
      return !kind || kind === b.kind ? b : { ...b, kind, sure: false };
    }),
  };
}

/** Near-best solutions within this log-likelihood of the best must agree before suggesting. */
const SUGGEST_MARGIN = 1.5;

/**
 * Suggests who played which colour. Tries every way to hand the unlabelled colours to the players
 * with recorded points, keeps those where each colour's buildings can add up to its player's
 * `nederzettingen` and the longest road lands with whoever recorded it, and ranks them by how well
 * the cities fit. A colour is only suggested when all near-best solutions agree on it — when the
 * board can't tell two players apart, a person decides. Returns `existing` plus the suggestions.
 */
export function suggestColorPlayers(
  layout: Layout,
  state: BoardState,
  recorded: Record<string, RecordedScore>,
  existing: Partial<Record<PieceColor, string>>,
): Partial<Record<PieceColor, string>> {
  const groups = byColor(state.buildings);
  const taken = new Set(Object.values(existing));
  const colors = [...groups.keys()].filter((c) => !existing[c]);
  const players = Object.keys(recorded).filter(
    (userId) => !taken.has(userId) && recorded[userId].buildingPoints !== null,
  );
  if (colors.length === 0 || colors.length > players.length) return { ...existing };

  const holder = summarize(layout, state).find((s) => s.hasLongestRoad)?.color;
  const roadPlayers = players.filter((userId) => recorded[userId].longestRoad);
  const roadPlayer =
    holder && colors.includes(holder) && roadPlayers.length === 1 ? roadPlayers[0] : null;

  const solutions: { logLikelihood: number; assignment: string[] }[] = [];
  const assign = (i: number, chosen: string[], logLikelihood: number) => {
    if (i === colors.length) {
      solutions.push({ logLikelihood, assignment: [...chosen] });
      return;
    }
    for (const userId of players) {
      if (chosen.includes(userId)) continue;
      if (roadPlayer && (colors[i] === holder) !== (userId === roadPlayer)) continue;
      const fit = citiesFor(groups.get(colors[i])!, recorded[userId].buildingPoints!);
      if (!fit) continue;
      chosen.push(userId);
      assign(i + 1, chosen, logLikelihood + fit.logLikelihood);
      chosen.pop();
    }
  };
  assign(0, [], 0);
  if (solutions.length === 0) return { ...existing };

  const best = Math.max(...solutions.map((s) => s.logLikelihood));
  const near = solutions.filter((s) => s.logLikelihood >= best - SUGGEST_MARGIN);
  const result = { ...existing };
  colors.forEach((color, i) => {
    const userId = near[0].assignment[i];
    if (near.every((s) => s.assignment[i] === userId)) result[color] = userId;
  });
  return result;
}

/**
 * The board as it's shown everywhere: the saved reading and corrections, colours labelled (saved,
 * else confidently suggested), and settlement vs city settled by the recorded scores. One place,
 * so the session screen's preview and the board screen never disagree.
 */
export function boardAsShown(
  layout: Layout,
  saved: BoardState,
  savedColorPlayers: Partial<Record<PieceColor, string>>,
  recorded: Record<string, RecordedScore>,
) {
  const state = normalizeState(layout, saved);
  const colorPlayers = suggestColorPlayers(layout, state, recorded, savedColorPlayers);
  return { state, colorPlayers, shown: resolveBuildingKinds(state, colorPlayers, recorded) };
}
