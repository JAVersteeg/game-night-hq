/**
 * One-tap corrections to a board. Each returns a new state; the targets are compared geometrically,
 * so a corner or edge can be corrected via whichever hex the tap happened to land on.
 */
import {
  allHexes,
  cornerKey,
  EDGES,
  edgeKey,
  type BoardState,
  type BuildingKind,
  type Corner,
  type Edge,
  type HarbourKind,
  type Layout,
  type PieceColor,
  type Terrain,
} from '@/features/boardScan/catan';

export function setHex(
  state: BoardState,
  row: number,
  col: number,
  hex: { terrain: Terrain; number: number },
): BoardState {
  // A desert never carries a token; anything else keeps the number it was given.
  const number = hex.terrain === 'desert' ? 0 : hex.number;
  return {
    ...state,
    hexes: [
      ...state.hexes.filter((h) => h.row !== row || h.col !== col),
      { row, col, terrain: hex.terrain, number },
    ],
  };
}

export function moveRobber(state: BoardState, row: number, col: number): BoardState {
  return { ...state, robber: { row, col } };
}

/** `piece` null clears the corner. A piece set by hand is certain, and the scores leave it be. */
export function setCorner(
  layout: Layout,
  state: BoardState,
  target: { row: number; col: number; corner: Corner },
  piece: { kind: BuildingKind; color: PieceColor } | null,
): BoardState {
  const key = cornerKey(layout, target.row, target.col, target.corner);
  const others = state.buildings.filter((b) => cornerKey(layout, b.row, b.col, b.corner) !== key);
  return {
    ...state,
    buildings: piece ? [...others, { ...target, ...piece, sure: true, edited: true }] : others,
  };
}

export function setRoad(
  layout: Layout,
  state: BoardState,
  target: { row: number; col: number; edge: Edge },
  color: PieceColor | null,
): BoardState {
  const key = edgeKey(layout, target.row, target.col, target.edge);
  const others = state.roads.filter((r) => edgeKey(layout, r.row, r.col, r.edge) !== key);
  return { ...state, roads: color ? [...others, { ...target, color }] : others };
}

export function setHarbour(
  layout: Layout,
  state: BoardState,
  target: { row: number; col: number; edge: Edge },
  kind: HarbourKind | null,
): BoardState {
  const key = edgeKey(layout, target.row, target.col, target.edge);
  const others = state.harbours.filter((h) => edgeKey(layout, h.row, h.col, h.edge) !== key);
  return { ...state, harbours: kind ? [...others, { ...target, kind }] : others };
}

/** Coastal edges border the sea: no other land hex shares them. Only those can carry a harbour. */
export function isCoastal(
  layout: Layout,
  target: { row: number; col: number; edge: Edge },
): boolean {
  const key = edgeKey(layout, target.row, target.col, target.edge);
  let count = 0;
  for (const { row, col } of allHexes(layout)) {
    for (const edge of EDGES) if (edgeKey(layout, row, col, edge) === key) count++;
  }
  return count === 1;
}

export function buildingAt(
  layout: Layout,
  state: BoardState,
  target: { row: number; col: number; corner: Corner },
) {
  const key = cornerKey(layout, target.row, target.col, target.corner);
  return state.buildings.find((b) => cornerKey(layout, b.row, b.col, b.corner) === key) ?? null;
}

export function roadAt(
  layout: Layout,
  state: BoardState,
  target: { row: number; col: number; edge: Edge },
) {
  const key = edgeKey(layout, target.row, target.col, target.edge);
  return state.roads.find((r) => edgeKey(layout, r.row, r.col, r.edge) === key) ?? null;
}

export function harbourAt(
  layout: Layout,
  state: BoardState,
  target: { row: number; col: number; edge: Edge },
) {
  const key = edgeKey(layout, target.row, target.col, target.edge);
  return state.harbours.find((h) => edgeKey(layout, h.row, h.col, h.edge) === key) ?? null;
}
