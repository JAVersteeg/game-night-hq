"""Geometry for the pointing experiment: python -I -X utf8 snap.py <label> [--solve]

The model only says WHAT is WHERE (pixel positions). This script works out the rest:
  1. fits the known board shape onto the pointed hex centres (rotation search + iterative
     closest point + homography) — so the model never has to name rows/columns;
  2. maps every piece from its crop into board space and snaps it to the nearest corner/edge;
  3. merges the duplicates from overlapping crops;
  4. with --solve, resolves settlement/city with the recorded building points (blind to colours).
Writes a state that score.py can grade.
"""
import itertools, json, math, os, sys
import numpy as np

label = sys.argv[1]
SOLVE = '--solve' in sys.argv
ONLY = next((a.split('=', 1)[1] for a in sys.argv if a.startswith('--only=')), None)
OUT = next((a.split('=', 1)[1] for a in sys.argv if a.startswith('--out=')), None)
S3 = math.sqrt(3)
ROWS = [3, 4, 5, 6, 5, 4, 3]
CORNERS = ["N", "NE", "SE", "S", "SW", "NW"]
EDGES = ["NE", "E", "SE", "SW", "W", "NW"]

def center(r, c):
    return np.array([(c - (ROWS[r] - 1) / 2) * S3, (r - 3) * 1.5])

def corner(r, c, i):
    a = math.radians(-90 + 60 * i)
    return center(r, c) + np.array([math.cos(a), math.sin(a)])

def key(p):
    return (round(float(p[0]), 2) + 0.0, round(float(p[1]), 2) + 0.0)

HEXES = [(r, c) for r, n in enumerate(ROWS) for c in range(n)]
LATTICE = np.array([center(r, c) for r, c in HEXES])
corners, edges, edge_count = {}, {}, {}
for r, c in HEXES:
    for i in range(6):
        corners.setdefault(key(corner(r, c, i)), (r, c, CORNERS[i]))
        mid = (corner(r, c, i) + corner(r, c, (i + 1) % 6)) / 2
        edges.setdefault(key(mid), (r, c, EDGES[i]))
        edge_count[key(mid)] = edge_count.get(key(mid), 0) + 1
corner_pts = np.array(list(corners.keys()))
edge_pts = np.array(list(edges.keys()))
coastal_pts = np.array([k for k in edges if edge_count[k] == 1])

def norm_matrix(pts):
    c = pts.mean(0)
    s = math.sqrt(2) / np.mean(np.linalg.norm(pts - c, axis=1))
    return np.array([[s, 0, -s * c[0]], [0, s, -s * c[1]], [0, 0, 1]])

def fit_h(src, dst):
    """Homography src -> dst, normalised DLT."""
    Ts, Td = norm_matrix(src), norm_matrix(dst)
    s = (np.c_[src, np.ones(len(src))] @ Ts.T)[:, :2]
    d = (np.c_[dst, np.ones(len(dst))] @ Td.T)[:, :2]
    A = []
    for (x, y), (u, v) in zip(s, d):
        A += [[x, y, 1, 0, 0, 0, -u * x, -u * y, -u], [0, 0, 0, x, y, 1, -v * x, -v * y, -v]]
    _, _, vt = np.linalg.svd(np.array(A))
    H = np.linalg.inv(Td) @ vt[-1].reshape(3, 3) @ Ts
    return H / H[2, 2]

def apply_h(H, pts):
    pts = np.asarray(pts, float)
    p = np.c_[pts, np.ones(len(pts))] @ H.T
    return p[:, :2] / p[:, 2:]

def assign(pred, pts):
    """Greedy one-to-one: each pointed centre to its nearest free lattice spot."""
    d = np.linalg.norm(pts[:, None, :] - pred[None, :, :], axis=2)
    pairs, used_p, used_l = [], set(), set()
    for flat in np.argsort(d, axis=None):
        i, j = divmod(int(flat), d.shape[1])
        if i in used_p or j in used_l:
            continue
        used_p.add(i); used_l.add(j); pairs.append((i, j, d[i, j]))
    return pairs

# Fresh runs land in par_results/; fixtures/ keeps the raw output of earlier runs on the test photo,
# so the geometry can be re-tested without calling the API.
run_path = f'par_results/{label}.json'
run = json.load(open(run_path if os.path.exists(run_path) else f'fixtures/{label}.json'))
geo_path = 'par_imgs/geometry.json'
geo = json.load(open(geo_path if os.path.exists(geo_path) else 'fixtures/geometry.json'))
board = run['results'][0]['output']
ov = geo['images'][0]
P = np.array([[h['x'], h['y']] for h in board['hexes']], float)

# 1. Fit the board shape onto the pointed centres. No mirroring: a photo from above never is.
nn = np.sort(np.linalg.norm(P[:, None] - P[None], axis=2), axis=1)[:, 1]
scale = np.median(nn) / S3
best = None
for deg in range(0, 360, 5):
    t = math.radians(deg)
    R = np.array([[math.cos(t), -math.sin(t)], [math.sin(t), math.cos(t)]])
    pred = P.mean(0) + (LATTICE - LATTICE.mean(0)) @ R.T * scale
    for _ in range(6):  # iterative closest point, refitting a homography each round
        pairs = assign(pred, P)
        good = [(i, j) for i, j, d in pairs if d < 0.5 * scale * S3]
        if len(good) < 6:
            break
        H = fit_h(LATTICE[[j for _, j in good]], P[[i for i, _ in good]])
        pred = apply_h(H, LATTICE)
    pairs = assign(pred, P)
    err = np.median([d for _, _, d in pairs]) / scale
    # Among equally good fits (the board shape is symmetric under 180°), prefer the upright one.
    score = err + 0.001 * min(deg, 360 - deg)
    if best is None or score < best[0]:
        best = (score, deg, H, pairs, err)
_, deg, H, pairs, err = best
Hinv = np.linalg.inv(H)
hexes = []
for i, j, d in pairs:
    if d > 0.5 * scale * S3:
        continue
    h = board['hexes'][i]
    r, c = HEXES[j]
    hexes.append({'row': r, 'col': c, 'terrain': h['terrain'], 'number': h['number']})
print(f'board fit: rotation {deg}°, {len(hexes)}/30 hexes placed from {len(P)} pointed, '
      f'median error {err:.2f} hex radii')

def to_lattice(points_overview):
    return apply_h(Hinv, points_overview)

robber_hex = None
if 'robber' in board and 'x' in board['robber']:
    p = to_lattice([[board['robber']['x'], board['robber']['y']]])[0]
    robber_hex = HEXES[int(np.linalg.norm(LATTICE - p, axis=1).argmin())]

# 2. Pieces from the crops -> overview pixels -> lattice, snapped.
det_b, det_r, dists_b, dists_r, rejected, from_roads = {}, {}, [], [], [], {}
geo_by_file = {g['file']: g for g in geo['images']}
for res_ in run['results'][1:]:
    if ONLY and ONLY not in res_['model']:
        continue
    img = geo_by_file[res_['file']]
    out = res_['output']
    w, h = img['size']
    def to_overview(x, y, img=img):
        return [(img['x0'] + x / img['scale']) * ov['scale'], (img['y0'] + y / img['scale']) * ov['scale']]
    def margin(x, y, w=w, h=h):
        return min(x, y, w - x, h - y) / min(w, h)
    for b in out['buildings']:
        p = to_lattice([to_overview(b['x'], b['y'])])[0]
        d = np.linalg.norm(corner_pts - p, axis=1)
        j = int(d.argmin())
        second = np.partition(d, 1)[1]
        if d[j] > 0.65 or (d[j] > 0.4 and second / d[j] < 1.4):
            rejected.append(('building', b['color'], round(float(d[j]), 2)))
            continue
        dists_b.append(d[j])
        length = None
        if 'end1_x' in b:
            e = to_lattice([to_overview(b['end1_x'], b['end1_y']), to_overview(b['end2_x'], b['end2_y'])])
            length = float(np.linalg.norm(e[0] - e[1]))
        det_b.setdefault(tuple(corner_pts[j]), []).append({**b, 'w': margin(b['x'], b['y']) + 0.05, 'len': length})
    for r in out['roads']:
        p = to_lattice([to_overview(r['x'], r['y'])])[0]
        d = np.linalg.norm(edge_pts - p, axis=1)
        j = int(d.argmin())
        second = np.partition(d, 1)[1]
        dc = np.linalg.norm(corner_pts - p, axis=1)
        if dc.min() < 0.2:
            # A road can't lie on a corner: from straight above a settlement looks like a short
            # stick, so this is a building the model took for a road.
            k = int(dc.argmin())
            from_roads.setdefault(tuple(corner_pts[k]), []).append(
                {'color': r['color'], 'kind': 'settlement', 'city_likelihood': 0.0, 'x': r['x'], 'y': r['y'],
                 'w': 0.5 * (margin(r['x'], r['y']) + 0.05), 'len': None, 'from_road': True})
            continue
        if d[j] > 0.5 or (d[j] > 0.3 and second / d[j] < 1.3):
            rejected.append(('road', r['color'], round(float(d[j]), 2)))
            continue
        dists_r.append(d[j])
        det_r.setdefault(tuple(edge_pts[j]), []).append({**r, 'w': margin(r['x'], r['y']) + 0.05})
print(f'snap distance (hex radii): buildings median {np.median(dists_b):.2f} max {max(dists_b):.2f}; '
      f'roads median {np.median(dists_r):.2f} max {max(dists_r):.2f}; rejected {len(rejected)}: {rejected}')

def vote(dets, field):
    tally = {}
    for d in dets:
        tally[d[field]] = tally.get(d[field], 0) + d['w']
    top = max(tally, key=tally.get)
    return top, tally[top] / sum(tally.values())

buildings = []
for k, dets in det_b.items():
    color, share = vote(dets, 'color')
    same = [d for d in dets if d['color'] == color]
    q = sum(d['city_likelihood'] * d['w'] for d in same) / sum(d['w'] for d in same)
    r, c, cn = corners[k]
    lens = [d['len'] for d in same if d['len']]
    buildings.append({'color': color, 'row': r, 'col': c, 'corner': cn,
                      'kind': 'city' if q >= 0.5 else 'settlement',
                      'sure': share > 0.99 and (q < 0.25 or q > 0.75), 'q': round(q, 2),
                      'len': round(float(np.median(lens)), 3) if lens else None})
# Road-shaped detections on a corner become settlements, unless the distance rule forbids a
# building there (then it was a real road the model pointed at near one end).
taken = [np.array(k) for k in det_b]
for k, dets in from_roads.items():
    if k in det_b or any(np.linalg.norm(np.array(k) - t) < 1.05 for t in taken):
        continue
    color, _ = vote(dets, 'color')
    r, c, cn = corners[k]
    buildings.append({'color': color, 'row': r, 'col': c, 'corner': cn, 'kind': 'settlement',
                      'sure': False, 'q': 0.0, 'len': None})
    taken.append(np.array(k))

roads = []
for k, dets in det_r.items():
    color, _ = vote(dets, 'color')
    r, c, e = edges[k]
    roads.append({'color': color, 'row': r, 'col': c, 'edge': e})
harbours = []
for hb in board['harbours']:
    p = to_lattice([[hb['x'], hb['y']]])[0]
    j = int(np.linalg.norm(coastal_pts - p, axis=1).argmin())
    r, c, e = edges[tuple(coastal_pts[j])]
    harbours.append({'row': r, 'col': c, 'edge': e, 'kind': hb['kind']})

# 3. Optional: settlement/city from the recorded building points, blind to who had which colour.
RECORDED = {'Pim': 5, 'May-C': 6, 'Faralley': 7, 'Sangu': 8, 'Martje': 9}
LONGEST_ROAD = 'Pim'
if SOLVE:
    colors = sorted({b['color'] for b in buildings})
    # City evidence: the model's likelihood and the measured length, each scaled 0..1 in this photo.
    lens = [b['len'] for b in buildings if b['len']]
    qs = [b['q'] for b in buildings]
    def unit(v, vs):
        lo, hi = min(vs), max(vs)
        return (v - lo) / (hi - lo) if hi > lo else 0.5
    for b in buildings:
        b['q_raw'] = b['q']
        b['q'] = 0.5 * unit(b['q'], qs) + 0.5 * (unit(b['len'], lens) if b['len'] else 0.5)
    # Longest road per colour, opponents' buildings cutting it.
    occupied = {(b['row'], b['col'], b['corner']) for b in buildings}
    owner = {key(corner(b['row'], b['col'], CORNERS.index(b['corner']))): b['color'] for b in buildings}
    def longest(color):
        adj = {}
        for rd in roads:
            if rd['color'] != color: continue
            i = EDGES.index(rd['edge'])
            a, b2 = key(corner(rd['row'], rd['col'], i)), key(corner(rd['row'], rd['col'], (i + 1) % 6))
            e = (min(a, b2), max(a, b2))
            adj.setdefault(a, []).append((e, b2)); adj.setdefault(b2, []).append((e, a))
        best = 0
        def walk(v, used):
            nonlocal best
            best = max(best, len(used))
            if used and owner.get(v, color) != color: return
            for e, w in adj.get(v, []):
                if e not in used: walk(w, used | {e})
        for v in adj: walk(v, frozenset())
        return best
    road_len = {c: longest(c) for c in colors}
    top = max(road_len.values())
    holder = [c for c in colors if road_len[c] == top]
    holder = holder[0] if len(holder) == 1 and top >= 5 else None
    print('longest roads:', road_len, '-> holder', holder)
    clamp = lambda q: min(0.97, max(0.03, q))
    def best_for(color, points):
        bs = sorted([b for b in buildings if b['color'] == color], key=lambda b: -b['q'])
        k = points - len(bs)
        if k < 0 or k > min(4, len(bs)) or len(bs) - k > 5:
            return None
        ll = sum(math.log(clamp(b['q'])) for b in bs[:k]) + sum(math.log(1 - clamp(b['q'])) for b in bs[k:])
        return ll, {id(b) for b in bs[:k]}
    solutions = []
    FIXED = {'green': 'Pim', 'red': 'Sangu', 'blue': 'Martje', 'orange': 'May-C', 'white': 'Faralley'} if '--labelled' in sys.argv else None
    for perm in itertools.permutations(list(RECORDED), len(colors)):
        if FIXED and dict(zip(colors, perm)) != {c: FIXED[c] for c in colors}:
            continue
        if holder and LONGEST_ROAD and dict(zip(colors, perm)).get(holder) != LONGEST_ROAD:
            continue
        total, cities = 0.0, set()
        for color, name in zip(colors, perm):
            r = best_for(color, RECORDED[name])
            if r is None:
                break
            total += r[0]; cities |= r[1]
        else:
            solutions.append((total, dict(zip(colors, perm)), cities))
    solutions.sort(key=lambda s: -s[0])
    if solutions:
        print('solver mapping:', solutions[0][1], f'(log-likelihood {solutions[0][0]:.1f}; runner-up '
              f'{solutions[1][0]:.1f})' if len(solutions) > 1 else '')
        for b in buildings:
            kind = 'city' if id(b) in solutions[0][2] else 'settlement'
            if kind != b['kind']:
                b['sure'] = False
            b['kind'] = kind
    else:
        print('solver: no feasible assignment')

usage = {'input_tokens': sum(r['usage']['input_tokens'] for r in run['results']),
         'output_tokens': sum(r['usage']['output_tokens'] for r in run['results'])}
state = {'orientation': f'rotation {deg}', 'hexes': hexes,
         'robber': {'row': robber_hex[0], 'col': robber_hex[1]} if robber_hex else board.get('robber', {'row': -1, 'col': -1}),
         'harbours': harbours, 'buildings': buildings, 'roads': roads, 'notes': board.get('notes', '')}
suffix = '-solved' if SOLVE else ''
json.dump({'state': state, 'model': run['results'][0]['model'], 'usage': usage, 'durationMs': run['wall']},
          open(OUT or f'results/par-{label}{suffix}.json', 'w'), indent=1)
