// Board geometry for the analysis. The model only says WHAT is WHERE (pixel positions); this fits
// the known board shape onto those points and snaps every piece to its corner or edge. Asking the
// model for rows and columns instead was slower and less reliable: it sometimes misjudges the
// board's orientation while its pixel positions stay accurate. Measurements and the reasoning
// behind every rule here: eval/README.md.
//
// Board coordinates match the app's `src/features/boardScan/catan.ts`: pointy-topped hexes of
// corner radius 1 in horizontal rows, row 0 at the top, columns from the left.

export type Layout = 'standard' | 'extended';
export type Pt = [number, number];

export const ROWS: Record<Layout, number[]> = {
  standard: [3, 4, 5, 4, 3],
  extended: [3, 4, 5, 6, 5, 4, 3],
};
const CORNERS = ['N', 'NE', 'SE', 'S', 'SW', 'NW'];
/** Edge i joins corner i and corner i + 1. */
const EDGES = ['NE', 'E', 'SE', 'SW', 'W', 'NW'];
const SQRT3 = Math.sqrt(3);

// Snapping thresholds, in hex radii. Corners are 1 apart, edge midpoints at least 0.87.
const BUILDING_MAX = 0.65;
const ROAD_MAX = 0.5;
/** A "road" whose middle is this close to a corner can't be a road (see `assembleBoard`). */
const ROAD_ON_CORNER = 0.2;
/** Pointed hex centres further than this from their spot are left out of the fit. */
const FIT_MAX = 0.5 * SQRT3;

// ---- The board's own geometry ----

function hexCenter(layout: Layout, row: number, col: number): Pt {
  return [(col - (ROWS[layout][row] - 1) / 2) * SQRT3, row * 1.5];
}

function cornerPoint(layout: Layout, row: number, col: number, i: number): Pt {
  const [x, y] = hexCenter(layout, row, col);
  const a = ((-90 + 60 * i) * Math.PI) / 180;
  return [x + Math.cos(a), y + Math.sin(a)];
}

const round = (v: number) => (Math.round(v * 100) / 100 + 0).toFixed(2);
const pointKey = (p: Pt) => `${round(p[0])},${round(p[1])}`;
const dist = (a: Pt, b: Pt) => Math.hypot(a[0] - b[0], a[1] - b[1]);

interface Spot<T> {
  p: Pt;
  name: T;
}

/** Every hex, corner and edge midpoint of a board, each corner/edge once under one name. */
function boardSpots(layout: Layout) {
  const hexes: Spot<{ row: number; col: number }>[] = [];
  const corners = new Map<string, Spot<{ row: number; col: number; corner: string }>>();
  const edges = new Map<
    string,
    Spot<{ row: number; col: number; edge: string }> & { count: number }
  >();
  ROWS[layout].forEach((n, row) => {
    for (let col = 0; col < n; col++) {
      hexes.push({ p: hexCenter(layout, row, col), name: { row, col } });
      for (let i = 0; i < 6; i++) {
        const c = cornerPoint(layout, row, col, i);
        const ck = pointKey(c);
        if (!corners.has(ck)) corners.set(ck, { p: c, name: { row, col, corner: CORNERS[i] } });
        const d = cornerPoint(layout, row, col, (i + 1) % 6);
        const mid: Pt = [(c[0] + d[0]) / 2, (c[1] + d[1]) / 2];
        const ek = pointKey(mid);
        const seen = edges.get(ek);
        if (seen) seen.count++;
        else edges.set(ek, { p: mid, name: { row, col, edge: EDGES[i] }, count: 1 });
      }
    }
  });
  return { hexes, corners: [...corners.values()], edges: [...edges.values()] };
}

/** The nearest spot and its distance, plus the distance of the runner-up. */
function nearest<T extends { p: Pt }>(spots: T[], p: Pt): { spot: T; d: number; second: number } {
  let best = spots[0];
  let d1 = Infinity;
  let d2 = Infinity;
  for (const spot of spots) {
    const d = dist(spot.p, p);
    if (d < d1) {
      d2 = d1;
      d1 = d;
      best = spot;
    } else if (d < d2) d2 = d;
  }
  return { spot: best, d: d1, second: d2 };
}

// ---- Homography (board plane → photo), least squares over the pointed hex centres ----

type M3 = number[][];

function applyH(H: M3, [x, y]: Pt): Pt {
  const w = H[2][0] * x + H[2][1] * y + H[2][2];
  return [(H[0][0] * x + H[0][1] * y + H[0][2]) / w, (H[1][0] * x + H[1][1] * y + H[1][2]) / w];
}

function multiply(a: M3, b: M3): M3 {
  return a.map((row) =>
    [0, 1, 2].map((j) => row[0] * b[0][j] + row[1] * b[1][j] + row[2] * b[2][j]),
  );
}

function invert(m: M3): M3 {
  const [[a, b, c], [d, e, f], [g, h, i]] = m;
  const A = e * i - f * h;
  const B = -(d * i - f * g);
  const C = d * h - e * g;
  const det = a * A + b * B + c * C;
  return [
    [A / det, -(b * i - c * h) / det, (b * f - c * e) / det],
    [B / det, (a * i - c * g) / det, -(a * f - c * d) / det],
    [C / det, -(a * h - b * g) / det, (a * e - b * d) / det],
  ];
}

/** Moves points to their centroid and scales them to mean distance √2 (keeps the fit stable). */
function normalizer(points: Pt[]): M3 {
  const cx = points.reduce((s, p) => s + p[0], 0) / points.length;
  const cy = points.reduce((s, p) => s + p[1], 0) / points.length;
  const mean = points.reduce((s, p) => s + Math.hypot(p[0] - cx, p[1] - cy), 0) / points.length;
  const s = Math.SQRT2 / (mean || 1);
  return [
    [s, 0, -s * cx],
    [0, s, -s * cy],
    [0, 0, 1],
  ];
}

/** Solves Ax = b for a small square system (Gaussian elimination with partial pivoting). */
function solve(A: number[][], b: number[]): number[] {
  const n = b.length;
  const m = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(m[r][col]) > Math.abs(m[pivot][col])) pivot = r;
    [m[col], m[pivot]] = [m[pivot], m[col]];
    for (let r = col + 1; r < n; r++) {
      const f = m[r][col] / m[col][col];
      for (let c = col; c <= n; c++) m[r][c] -= f * m[col][c];
    }
  }
  const x = new Array(n).fill(0);
  for (let r = n - 1; r >= 0; r--) {
    let s = m[r][n];
    for (let c = r + 1; c < n; c++) s -= m[r][c] * x[c];
    x[r] = s / m[r][r];
  }
  return x;
}

function fitHomography(src: Pt[], dst: Pt[]): M3 {
  const Ts = normalizer(src);
  const Td = normalizer(dst);
  const s = src.map((p) => applyH(Ts, p));
  const d = dst.map((p) => applyH(Td, p));
  // Normal equations for h0..h7 with h8 = 1.
  const AtA = Array.from({ length: 8 }, () => new Array(8).fill(0));
  const Atb = new Array(8).fill(0);
  const add = (row: number[], value: number) => {
    for (let i = 0; i < 8; i++) {
      Atb[i] += row[i] * value;
      for (let j = 0; j < 8; j++) AtA[i][j] += row[i] * row[j];
    }
  };
  s.forEach(([x, y], k) => {
    const [u, v] = d[k];
    add([x, y, 1, 0, 0, 0, -x * u, -y * u], u);
    add([0, 0, 0, x, y, 1, -x * v, -y * v], v);
  });
  const h = solve(AtA, Atb);
  const Hn: M3 = [
    [h[0], h[1], h[2]],
    [h[3], h[4], h[5]],
    [h[6], h[7], 1],
  ];
  const H = multiply(multiply(invert(Td), Hn), Ts);
  return H.map((row) => row.map((v) => v / H[2][2]));
}

/** Greedy one-to-one matching of points to spots, closest pairs first. */
function match(points: Pt[], spots: Pt[]): { point: number; spot: number; d: number }[] {
  const pairs: { point: number; spot: number; d: number }[] = [];
  points.forEach((p, i) =>
    spots.forEach((s, j) => pairs.push({ point: i, spot: j, d: dist(p, s) })),
  );
  pairs.sort((a, b) => a.d - b.d);
  const usedPoints = new Set<number>();
  const usedSpots = new Set<number>();
  return pairs.filter((pair) => {
    if (usedPoints.has(pair.point) || usedSpots.has(pair.spot)) return false;
    usedPoints.add(pair.point);
    usedSpots.add(pair.spot);
    return true;
  });
}

/**
 * Fits the board shape onto the pointed hex centres (in overview pixels): tries every rotation,
 * refines each by iterative closest point with a homography, and keeps the best — preferring the
 * upright one, since the board shape looks the same turned 180°. Never mirrored: a photo taken
 * from above isn't.
 */
function fitBoard(layout: Layout, lattice: Pt[], points: Pt[]) {
  if (points.length < 6) return null;
  const nn = points.map((p, i) =>
    Math.min(...points.filter((_, j) => j !== i).map((q) => dist(p, q))),
  );
  const scale = [...nn].sort((a, b) => a - b)[Math.floor(nn.length / 2)] / SQRT3;
  const pc: Pt = [
    points.reduce((s, p) => s + p[0], 0) / points.length,
    points.reduce((s, p) => s + p[1], 0) / points.length,
  ];
  const lc: Pt = [
    lattice.reduce((s, p) => s + p[0], 0) / lattice.length,
    lattice.reduce((s, p) => s + p[1], 0) / lattice.length,
  ];

  let best: { score: number; rotation: number; H: M3; error: number } | null = null;
  for (let deg = 0; deg < 360; deg += 5) {
    const t = (deg * Math.PI) / 180;
    let predicted = lattice.map(([x, y]): Pt => {
      const dx = x - lc[0];
      const dy = y - lc[1];
      return [
        pc[0] + (dx * Math.cos(t) - dy * Math.sin(t)) * scale,
        pc[1] + (dx * Math.sin(t) + dy * Math.cos(t)) * scale,
      ];
    });
    let H: M3 | null = null;
    for (let iteration = 0; iteration < 6; iteration++) {
      const good = match(points, predicted).filter((pair) => pair.d < FIT_MAX * scale);
      if (good.length < 6) break;
      H = fitHomography(
        good.map((pair) => lattice[pair.spot]),
        good.map((pair) => points[pair.point]),
      );
      const fitted = H;
      predicted = lattice.map((p) => applyH(fitted, p));
    }
    if (!H) continue;
    const pairs = match(points, predicted);
    const ds = pairs.map((pair) => pair.d).sort((a, b) => a - b);
    const error = ds[Math.floor(ds.length / 2)] / scale;
    const score = error + 0.001 * Math.min(deg, 360 - deg);
    if (!best || score < best.score) best = { score, rotation: deg, H, error };
  }
  return best;
}

// ---- What the model reports ----

export interface PointedBoard {
  hexes: { terrain: string; number: number; x: number; y: number }[];
  robber: { x: number; y: number };
  harbours: { kind: string; x: number; y: number }[];
  notes: string;
}
export interface PointedPieces {
  buildings: {
    color: string;
    kind: string;
    city_likelihood: number;
    x: number;
    y: number;
    end1_x: number;
    end1_y: number;
    end2_x: number;
    end2_y: number;
  }[];
  roads: { color: string; x: number; y: number }[];
  notes: string;
}
/** Where an uploaded image sits in the photo: its top-left corner in photo pixels, and image
 *  pixels per photo pixel (1 for a crop at full resolution). */
export interface ImageFrame {
  x0: number;
  y0: number;
  scale: number;
  width: number;
  height: number;
}

interface Detection {
  color: string;
  weight: number;
  likelihood?: number;
  length?: number;
}

function vote(detections: Detection[]): { color: string; share: number } {
  const tally = new Map<string, number>();
  for (const d of detections) tally.set(d.color, (tally.get(d.color) ?? 0) + d.weight);
  const [color, weight] = [...tally.entries()].sort((a, b) => b[1] - a[1])[0];
  const total = [...tally.values()].reduce((s, w) => s + w, 0);
  return { color, share: weight / total };
}

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
};

/**
 * Turns the pointed board and pieces into the board state the app stores. `overview` is the image
 * the board call saw; each crop's pieces come with that crop's frame.
 */
export function assembleBoard(
  layout: Layout,
  board: PointedBoard,
  overview: ImageFrame,
  crops: { frame: ImageFrame; pieces: PointedPieces }[],
) {
  const spots = boardSpots(layout);
  const lattice = spots.hexes.map((h) => h.p);
  const pointed = board.hexes.map((h): Pt => [h.x, h.y]);
  const fit = fitBoard(layout, lattice, pointed);
  if (!fit) throw new Error('Het bord is niet herkend op de foto.');
  const toBoard = invert(fit.H);
  const fromOverview = (p: Pt) => applyH(toBoard, p);

  // Hexes: each pointed centre on its spot; a spot claimed twice keeps the closest.
  const predicted = lattice.map((p) => applyH(fit.H, p));
  const scale = dist(applyH(fit.H, [0, 0]), applyH(fit.H, [1, 0]));
  const hexes = match(pointed, predicted)
    .filter((pair) => pair.d < FIT_MAX * scale)
    .map((pair) => ({
      ...spots.hexes[pair.spot].name,
      terrain: board.hexes[pair.point].terrain,
      number: board.hexes[pair.point].number,
    }));

  const robber = nearest(spots.hexes, fromOverview([board.robber.x, board.robber.y])).spot.name;

  const coastal = spots.edges.filter((e) => e.count === 1);
  const harbourEdges = new Set<string>();
  const harbours = board.harbours.flatMap((h) => {
    const { spot, d } = nearest(coastal, fromOverview([h.x, h.y]));
    const key = pointKey(spot.p);
    if (d > 0.9 || harbourEdges.has(key)) return [];
    harbourEdges.add(key);
    return [{ ...spot.name, kind: h.kind }];
  });

  // Pieces: crop pixels → photo → overview pixels → board, snapped and pooled per corner/edge.
  const atCorner = new Map<string, Detection[]>();
  const atEdge = new Map<string, Detection[]>();
  const roadsOnCorners = new Map<string, Detection[]>();
  let rejected = 0;
  for (const { frame, pieces } of crops) {
    const toPoint = (x: number, y: number): Pt =>
      fromOverview([
        (frame.x0 + x / frame.scale) * overview.scale,
        (frame.y0 + y / frame.scale) * overview.scale,
      ]);
    // Pieces near a crop's border are often cut off, so they count for less in a vote.
    const weight = (x: number, y: number) =>
      Math.min(x, y, frame.width - x, frame.height - y) / Math.min(frame.width, frame.height) +
      0.05;

    for (const b of pieces.buildings) {
      const p = toPoint(b.x, b.y);
      const { spot, d, second } = nearest(spots.corners, p);
      if (d > BUILDING_MAX || (d > 0.4 && second / d < 1.4)) {
        rejected++;
        continue;
      }
      const key = pointKey(spot.p);
      const length = dist(toPoint(b.end1_x, b.end1_y), toPoint(b.end2_x, b.end2_y));
      const list = atCorner.get(key) ?? [];
      list.push({
        color: b.color,
        weight: weight(b.x, b.y),
        likelihood: b.city_likelihood,
        length,
      });
      atCorner.set(key, list);
    }
    for (const r of pieces.roads) {
      const p = toPoint(r.x, r.y);
      const corner = nearest(spots.corners, p);
      if (corner.d < ROAD_ON_CORNER) {
        // From straight above a settlement looks like a short stick, and no road can lie on a
        // corner — so this is most likely a settlement (checked against the distance rule below).
        const key = pointKey(corner.spot.p);
        const list = roadsOnCorners.get(key) ?? [];
        list.push({ color: r.color, weight: weight(r.x, r.y) });
        roadsOnCorners.set(key, list);
        continue;
      }
      const { spot, d, second } = nearest(spots.edges, p);
      if (d > ROAD_MAX || (d > 0.3 && second / d < 1.3)) {
        rejected++;
        continue;
      }
      const key = pointKey(spot.p);
      const list = atEdge.get(key) ?? [];
      list.push({ color: r.color, weight: weight(r.x, r.y) });
      atEdge.set(key, list);
    }
  }

  const cornerByKey = new Map(spots.corners.map((c) => [pointKey(c.p), c]));
  const pooled = [...atCorner.entries()].map(([key, detections]) => {
    const { color, share } = vote(detections);
    const same = detections.filter((d) => d.color === color);
    const total = same.reduce((s, d) => s + d.weight, 0);
    const likelihood = same.reduce((s, d) => s + (d.likelihood ?? 0) * d.weight, 0) / total;
    return { key, color, share, likelihood, length: median(same.map((d) => d.length ?? 0)) };
  });

  // City evidence: the model's own likelihood and the measured length (cities are ~1.5× longer),
  // each scaled 0..1 within this photo. The app weighs it against the recorded scores.
  const unit = (v: number, all: number[]) => {
    const lo = Math.min(...all);
    const hi = Math.max(...all);
    return hi > lo ? (v - lo) / (hi - lo) : 0.5;
  };
  const likelihoods = pooled.map((b) => b.likelihood);
  const lengths = pooled.map((b) => b.length);
  // The combined score also decides the kind until the scores can (slightly better than the
  // model's own call on the test board).
  const buildings = pooled.map((b) => {
    const cityScore =
      Math.round((0.5 * unit(b.likelihood, likelihoods) + 0.5 * unit(b.length, lengths)) * 100) /
      100;
    return {
      color: b.color,
      ...cornerByKey.get(b.key)!.name,
      kind: cityScore >= 0.5 ? 'city' : 'settlement',
      sure: b.share > 0.99 && Math.abs(cityScore - 0.5) >= 0.3,
      cityScore,
    };
  });

  // Road-shaped hits on a corner become settlements unless the distance rule forbids a building
  // there — then the model pointed near the end of a real road.
  const occupied = pooled.map((b) => cornerByKey.get(b.key)!.p);
  for (const [key, detections] of roadsOnCorners) {
    const p = cornerByKey.get(key)!.p;
    if (atCorner.has(key) || occupied.some((q) => dist(p, q) < 1.05)) continue;
    buildings.push({
      color: vote(detections).color,
      ...cornerByKey.get(key)!.name,
      kind: 'settlement',
      sure: false,
      cityScore: 0,
    });
    occupied.push(p);
  }

  const edgeByKey = new Map(spots.edges.map((e) => [pointKey(e.p), e]));
  const roads = [...atEdge.entries()].map(([key, detections]) => ({
    color: vote(detections).color,
    ...edgeByKey.get(key)!.name,
  }));

  return {
    state: {
      orientation: `rotation ${fit.rotation}°`,
      hexes,
      robber,
      harbours,
      buildings,
      roads,
      notes: [board.notes, ...crops.map((c) => c.pieces.notes)].filter(Boolean).join('\n'),
    },
    diagnostics: {
      rotation: fit.rotation,
      fitError: Math.round(fit.error * 100) / 100,
      hexesPlaced: hexes.length,
      rejected,
    },
  };
}
