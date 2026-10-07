import { memo } from 'react';
import Svg, { Circle, G, Line, Polygon, Rect, Text as SvgText } from 'react-native-svg';

import {
  allHexes,
  cornerPoint,
  CORNERS,
  EDGES,
  HARBOUR_LABEL,
  hexCenter,
  type BoardState,
  type Corner,
  type Edge,
  type Layout,
  type PieceColor,
  type Terrain,
} from '@/features/boardScan/catan';
import { theme } from '@/lib/theme';

/**
 * Colours of the physical game rather than the app: the board should read as the board on the
 * table, so these sit outside the design tokens, like the per-game palettes in `games/colors.ts`.
 * Toned slightly down so they sit calmly on the dark surface.
 */
const TERRAIN_FILL: Record<Terrain, string> = {
  forest: '#2f6b3a',
  pasture: '#8fbf55',
  fields: '#dcb942',
  hills: '#c26d3a',
  mountains: '#8b9198',
  desert: '#d6c495',
};
export const PIECE_FILL: Record<PieceColor, string> = {
  red: '#cc3b30',
  blue: '#3471d4',
  orange: '#ec8a2c',
  white: '#efebe2',
  green: '#3f9b4a',
  brown: '#7b4d2c',
};
const SEA = '#26425a';
const TOKEN = '#f3e6c8';
const TOKEN_INK = '#2a241d';
const TOKEN_RED = '#b8322a';
const OUTLINE = '#16120e';

/** Pixels per hex radius in the SVG's own units; the view scales to its width. */
const S = 40;
const PAD = 1.5;

export type BoardTarget =
  | { type: 'hex'; row: number; col: number }
  | { type: 'corner'; row: number; col: number; corner: Corner }
  | { type: 'edge'; row: number; col: number; edge: Edge };

function bounds(layout: Layout) {
  const points = allHexes(layout).flatMap(({ row, col }) =>
    [0, 1, 2, 3, 4, 5].map((i) => cornerPoint(layout, row, col, i)),
  );
  const minX = Math.min(...points.map((p) => p.x)) - PAD;
  const minY = Math.min(...points.map((p) => p.y)) - PAD;
  const maxX = Math.max(...points.map((p) => p.x)) + PAD;
  const maxY = Math.max(...points.map((p) => p.y)) + PAD;
  return { minX, minY, width: maxX - minX, height: maxY - minY };
}

/**
 * Where a tapped spot sits in a `BoardView` drawn at `width`: its centre in view pixels from the
 * view's top-left, and a radius that covers it — for placing a popover and its highlight.
 */
export function targetAnchor(
  layout: Layout,
  target: BoardTarget,
  width: number,
): { x: number; y: number; r: number } {
  const box = bounds(layout);
  const k = width / box.width;
  const toView = (p: { x: number; y: number }) => ({
    x: (p.x - box.minX) * k,
    y: (p.y - box.minY) * k,
  });
  if (target.type === 'hex') {
    return { ...toView(hexCenter(layout, target.row, target.col)), r: 0.95 * k };
  }
  if (target.type === 'corner') {
    const p = cornerPoint(layout, target.row, target.col, CORNERS.indexOf(target.corner));
    return { ...toView(p), r: 0.42 * k };
  }
  const e = EDGES.indexOf(target.edge);
  const a = cornerPoint(layout, target.row, target.col, e);
  const b = cornerPoint(layout, target.row, target.col, (e + 1) % 6);
  return { ...toView({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }), r: 0.5 * k };
}

export const BoardView = memo(function BoardView({
  layout,
  state,
  width,
  editing = false,
  onPressTarget,
}: {
  layout: Layout;
  state: BoardState;
  width: number;
  editing?: boolean;
  onPressTarget?: (target: BoardTarget) => void;
}) {
  const box = bounds(layout);
  const height = (width * box.height) / box.width;
  const px = (p: { x: number; y: number }) => ({
    x: (p.x - box.minX) * S,
    y: (p.y - box.minY) * S,
  });
  const hexPoints = (row: number, col: number) =>
    [0, 1, 2, 3, 4, 5]
      .map((i) => px(cornerPoint(layout, row, col, i)))
      .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
      .join(' ');
  const hexByKey = new Map(state.hexes.map((h) => [`${h.row},${h.col}`, h]));

  return (
    <Svg
      width={width}
      height={height}
      viewBox={`0 0 ${box.width * S} ${box.height * S}`}
      accessibilityLabel="Digitaal speelbord"
    >
      <Rect x={0} y={0} width={box.width * S} height={box.height * S} rx={S * 0.6} fill={SEA} />

      {allHexes(layout).map(({ row, col }) => {
        const hex = hexByKey.get(`${row},${col}`);
        const c = px(hexCenter(layout, row, col));
        const red = hex?.number === 6 || hex?.number === 8;
        return (
          <G key={`hex-${row}-${col}`}>
            <Polygon
              points={hexPoints(row, col)}
              fill={hex ? TERRAIN_FILL[hex.terrain] : theme.surfaceSunken}
              stroke={TOKEN}
              strokeWidth={2}
            />
            {hex && hex.number > 0 ? (
              <G>
                <Circle cx={c.x} cy={c.y} r={S * 0.36} fill={TOKEN} />
                <SvgText
                  x={c.x}
                  y={c.y + S * 0.12}
                  fontSize={S * 0.36}
                  fontWeight="700"
                  textAnchor="middle"
                  fill={red ? TOKEN_RED : TOKEN_INK}
                >
                  {hex.number}
                </SvgText>
              </G>
            ) : null}
            {!hex ? (
              <SvgText
                x={c.x}
                y={c.y + S * 0.12}
                fontSize={S * 0.36}
                textAnchor="middle"
                fill={theme.inkSubtle}
              >
                ?
              </SvgText>
            ) : null}
          </G>
        );
      })}

      {state.harbours.map((h, i) => {
        const e = EDGES.indexOf(h.edge);
        if (e < 0) return null;
        const a = cornerPoint(layout, h.row, h.col, e);
        const b = cornerPoint(layout, h.row, h.col, (e + 1) % 6);
        const c = hexCenter(layout, h.row, h.col);
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        const out = px({ x: c.x + (mid.x - c.x) * 1.75, y: c.y + (mid.y - c.y) * 1.75 });
        return (
          <G key={`harbour-${i}`}>
            {[a, b].map((p, j) => {
              const q = px(p);
              return (
                <Line
                  key={j}
                  x1={q.x}
                  y1={q.y}
                  x2={out.x}
                  y2={out.y}
                  stroke={TOKEN}
                  strokeWidth={1.5}
                  strokeDasharray="3 3"
                />
              );
            })}
            <Rect
              x={out.x - S * 0.62}
              y={out.y - S * 0.22}
              width={S * 1.24}
              height={S * 0.44}
              rx={S * 0.22}
              fill={TOKEN}
            />
            <SvgText
              x={out.x}
              y={out.y + S * 0.09}
              fontSize={S * 0.24}
              textAnchor="middle"
              fill={TOKEN_INK}
            >
              {HARBOUR_LABEL[h.kind]}
            </SvgText>
          </G>
        );
      })}

      {state.roads.map((r, i) => {
        const e = EDGES.indexOf(r.edge);
        const a = px(cornerPoint(layout, r.row, r.col, e));
        const b = px(cornerPoint(layout, r.row, r.col, (e + 1) % 6));
        const from = { x: a.x + (b.x - a.x) * 0.18, y: a.y + (b.y - a.y) * 0.18 };
        const to = { x: a.x + (b.x - a.x) * 0.82, y: a.y + (b.y - a.y) * 0.82 };
        return (
          <G key={`road-${i}`}>
            <Line
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke={OUTLINE}
              strokeWidth={S * 0.24}
              strokeLinecap="round"
            />
            <Line
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke={PIECE_FILL[r.color]}
              strokeWidth={S * 0.15}
              strokeLinecap="round"
            />
          </G>
        );
      })}

      {state.buildings.map((b, i) => {
        const p = px(cornerPoint(layout, b.row, b.col, CORNERS.indexOf(b.corner)));
        const k = S / 40;
        const shape =
          b.kind === 'settlement'
            ? [
                [-7, 7],
                [7, 7],
                [7, -2],
                [0, -9],
                [-7, -2],
              ]
            : [
                [-11, 8],
                [11, 8],
                [11, -3],
                [3, -3],
                [3, -8],
                [-4, -14],
                [-11, -8],
              ];
        return (
          <G key={`building-${i}`}>
            <Polygon
              points={shape.map(([x, y]) => `${p.x + x * k},${p.y + y * k}`).join(' ')}
              fill={PIECE_FILL[b.color]}
              stroke={OUTLINE}
              strokeWidth={b.sure ? 1.5 : 2}
              strokeDasharray={b.sure ? undefined : '3 2'}
            />
            {!b.sure ? (
              <SvgText
                x={p.x + 12 * k}
                y={p.y - 8 * k}
                fontSize={S * 0.32}
                fontWeight="700"
                fill={theme.warning}
                stroke={OUTLINE}
                strokeWidth={2}
              >
                ?
              </SvgText>
            ) : null}
          </G>
        );
      })}

      {(() => {
        const c = px(hexCenter(layout, state.robber.row, state.robber.col));
        const x = c.x - S * 0.55;
        const y = c.y - S * 0.2;
        return (
          <G accessibilityLabel="Rover">
            <Rect
              x={x - S * 0.13}
              y={y - S * 0.12}
              width={S * 0.26}
              height={S * 0.36}
              rx={S * 0.12}
              fill={OUTLINE}
            />
            <Circle cx={x} cy={y - S * 0.2} r={S * 0.13} fill={OUTLINE} />
          </G>
        );
      })()}

      {editing ? (
        <G>
          {/* A tile only answers on its number token, not its whole area: tapping near a road or
              building shouldn't open the tile by accident. */}
          {allHexes(layout).map(({ row, col }) => {
            const c = px(hexCenter(layout, row, col));
            return (
              <Circle
                key={`tile-${row}-${col}`}
                cx={c.x}
                cy={c.y}
                r={S * 0.4}
                fill="transparent"
                onPress={() => onPressTarget?.({ type: 'hex', row, col })}
              />
            );
          })}
          {allHexes(layout).flatMap(({ row, col }) =>
            EDGES.map((edge, e) => {
              const a = px(cornerPoint(layout, row, col, e));
              const b = px(cornerPoint(layout, row, col, (e + 1) % 6));
              return (
                <Line
                  key={`edge-${row}-${col}-${edge}`}
                  x1={a.x + (b.x - a.x) * 0.25}
                  y1={a.y + (b.y - a.y) * 0.25}
                  x2={a.x + (b.x - a.x) * 0.75}
                  y2={a.y + (b.y - a.y) * 0.75}
                  stroke="transparent"
                  strokeWidth={S * 0.4}
                  onPress={() => onPressTarget?.({ type: 'edge', row, col, edge })}
                />
              );
            }),
          )}
          {allHexes(layout).flatMap(({ row, col }) =>
            CORNERS.map((corner, i) => {
              const p = px(cornerPoint(layout, row, col, i));
              return (
                <Circle
                  key={`corner-${row}-${col}-${corner}`}
                  cx={p.x}
                  cy={p.y}
                  r={S * 0.24}
                  fill={theme.ink}
                  fillOpacity={0.12}
                  onPress={() => onPressTarget?.({ type: 'corner', row, col, corner })}
                />
              );
            }),
          )}
        </G>
      ) : null}
    </Svg>
  );
});
