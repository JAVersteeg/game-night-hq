"""Score a model reading against truth.json: python -I -X utf8 score.py results/<file>.json"""
import json, math, sys

S3 = math.sqrt(3)
ROWS = [3, 4, 5, 6, 5, 4, 3]
CORNERS = ["N", "NE", "SE", "S", "SW", "NW"]
EDGES = ["NE", "E", "SE", "SW", "W", "NW"]
PRICES = {"claude-opus-5-5": (4, 20), "claude-sonnet-5-5": (2, 10), "claude-haiku-4-5": (1, 5)}

def center(r, c):
    return ((c - (ROWS[r] - 1) / 2) * S3, (r - 3) * 1.5)

def corner(r, c, i):
    x, y = center(r, c)
    a = math.radians(-90 + 60 * i)
    return (x + math.cos(a), y + math.sin(a))

def key(p):
    return (round(p[0], 1) + 0.0, round(p[1], 1) + 0.0)

def transforms():
    for k in range(6):
        for mirror in (False, True):
            a = math.radians(60 * k)
            def t(p, a=a, mirror=mirror):
                x, y = p
                if mirror:
                    x = -x
                return (x * math.cos(a) - y * math.sin(a), x * math.sin(a) + y * math.cos(a))
            yield f"rot{60*k}{'+mirror' if mirror else ''}", t

truth = json.load(open("truth.json"))
res = json.load(open(sys.argv[1]))
st = res["state"]

t_hex = {key(center(r, c)): s.split() for r, row in enumerate(truth["hexes"]) for c, s in enumerate(row)}
t_hex = {k: (v[0], int(v[1]) if len(v) > 1 else 0) for k, v in t_hex.items()}

def valid(r, c):
    return 0 <= r < len(ROWS) and 0 <= c < ROWS[r]

best = None
for name, T in transforms():
    hexes = {}
    for h in st["hexes"]:
        if valid(h["row"], h["col"]):
            hexes[key(T(center(h["row"], h["col"])))] = (h["terrain"], h["number"])
    hits = sum(1 for k, v in hexes.items() if t_hex.get(k, (None,))[0] == v[0])
    if best is None or hits > best[0]:
        best = (hits, name, T, hexes)
_, tname, T, m_hex = best

def vkey(r, c, cn):
    return key(T(corner(r, c, CORNERS.index(cn)))) if valid(r, c) else None
def ekey(r, c, e):
    if not valid(r, c):
        return None
    i = EDGES.index(e)
    return tuple(sorted([key(T(corner(r, c, i))), key(T(corner(r, c, (i + 1) % 6)))]))
def tv(r, c, cn):
    return key(corner(r, c, CORNERS.index(cn)))
def te(r, c, e):
    i = EDGES.index(e)
    return tuple(sorted([key(corner(r, c, i)), key(corner(r, c, (i + 1) % 6))]))

terrain_ok = sum(1 for k, v in t_hex.items() if m_hex.get(k, (None, None))[0] == v[0])
number_ok = sum(1 for k, v in t_hex.items() if m_hex.get(k, (None, None))[1] == v[1])
rob = st["robber"]
robber_ok = key(T(center(rob["row"], rob["col"]))) == key(center(*truth["robber"])) if valid(rob["row"], rob["col"]) else False

KIND = {"3:1": "generic"}
t_harb = {te(r, c, e): KIND.get(k, k) for r, c, e, k, _ in truth["harbours"]}
m_harb = {ekey(h["row"], h["col"], h["edge"]): h["kind"] for h in st["harbours"]}
harb_pos = sum(1 for k in t_harb if k in m_harb)
harb_ok = sum(1 for k, v in t_harb.items() if m_harb.get(k) == v)

t_b = {(tv(r, c, cn), p): kind for p, d in truth["players"].items() for r, c, cn, kind, _ in d["buildings"]}
m_b = {}
for b in st["buildings"]:
    k = vkey(b["row"], b["col"], b["corner"])
    if k:
        m_b[(k, b["color"])] = (b["kind"], b["sure"])
b_tp = [k for k in t_b if k in m_b]
kind_ok = sum(1 for k in b_tp if m_b[k][0] == t_b[k])
kind_ok_sure = [(m_b[k][0] == t_b[k]) for k in b_tp if m_b[k][1]]
unsure_wrong = sum(1 for k in b_tp if not m_b[k][1] and m_b[k][0] != t_b[k])
unsure = sum(1 for k in b_tp if not m_b[k][1])

t_r = {(te(r, c, e), p) for p, d in truth["players"].items() for r, c, e in d["roads"]}
m_r = {(ekey(x["row"], x["col"], x["edge"]), x["color"]) for x in st["roads"]}
r_tp = len(t_r & m_r)

u = res["usage"]
pin, pout = PRICES.get(res["model"], (0, 0))
cost = (u.get("input_tokens", 0) * pin + (u.get("cache_creation_input_tokens") or 0) * pin * 1.25
        + (u.get("cache_read_input_tokens") or 0) * pin * 0.1 + u.get("output_tokens", 0) * pout) / 1e6

print(f"{sys.argv[1]}  frame={tname}  model={res['model']}")
print(f"  terrain {terrain_ok}/30  numbers {number_ok}/30  robber {'ok' if robber_ok else 'WRONG'}  "
      f"harbours pos {harb_pos}/11 kind {harb_ok}/11")
print(f"  buildings found {len(b_tp)}/{len(t_b)} (+{len(m_b)-len(b_tp)} extra)  type right {kind_ok}/{len(b_tp)}  "
      f"[marked sure: {sum(kind_ok_sure)}/{len(kind_ok_sure)} right; unsure: {unsure}, of which wrong {unsure_wrong}]")
print(f"  roads found {r_tp}/{len(t_r)} (+{len(m_r)-r_tp} extra)")
print(f"  calls {u.get('calls', 1)} cache write {u.get('cache_creation_input_tokens')} read {u.get('cache_read_input_tokens')}")
print(f"  tokens in {u.get('input_tokens')} out {u.get('output_tokens')}  ≈ ${cost:.3f}  time {res['durationMs']/1000:.0f}s")
