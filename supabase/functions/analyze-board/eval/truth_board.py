"""Spike: hand-transcribed board state for session dad343ed -> rule check + SVG render."""
import math, json, html
from collections import Counter, defaultdict

PHOTO = "file:///C:/Users/joche/Downloads/628c1a2c-4491-4683-81bd-0ce3601c3af0.jpg"
S3 = math.sqrt(3)

# ---- Board spec (5-6 player base game) ----
SPEC = {
    "rows": [3, 4, 5, 6, 5, 4, 3],
    "terrain": {"forest": 6, "pasture": 6, "fields": 6, "hills": 5, "mountains": 5, "desert": 2},
    "tokens": {2: 2, 3: 3, 4: 3, 5: 3, 6: 3, 8: 3, 9: 3, 10: 3, 11: 3, 12: 2},
    "harbours": {"3:1": 5, "lumber": 1, "brick": 1, "wool": 2, "grain": 1, "ore": 1},
    "limits": {"settlement": 5, "city": 4, "road": 15},
}

# ---- What was read from the photo (row by row, left to right) ----
HEXES = [
    ["hills 5", "pasture 3", "desert"],
    ["forest 10", "pasture 9", "fields 10", "fields 12"],
    ["forest 5", "desert", "mountains 6", "forest 5", "fields 10"],
    ["mountains 2", "fields 8", "hills 2", "pasture 11", "pasture 8", "mountains 12"],
    ["mountains 4", "forest 9", "fields 6", "hills 9", "forest 3"],
    ["fields 11", "forest 3", "mountains 4", "pasture 11"],
    ["pasture 6", "hills 4", "hills 8"],
]
ROBBER = (3, 1)
# (row, col, edge, kind, note)
HARBOURS = [
    (0, 0, "NE", "3:1", ""), (0, 2, "NE", "ore", "icon small, read as ore"),
    (1, 0, "NW", "grain", ""), (1, 3, "E", "wool", ""), (2, 0, "W", "3:1", ""),
    (3, 5, "E", "brick", "icon outside photo, inferred by elimination"),
    (4, 0, "W", "3:1", ""), (5, 3, "E", "wool", ""), (5, 0, "SW", "3:1", ""),
    (6, 1, "SW", "3:1", ""), (6, 2, "SE", "lumber", ""),
]
# buildings: (row, col, corner, kind, unsure)
PLAYERS = {
    "green": {"fill": "#3f9b4a",
        "buildings": [(1,0,"NW","settlement",0),(1,0,"NE","settlement",0),(1,0,"S","settlement",0),
                      (2,1,"S","settlement",0),(2,2,"SE","settlement",0)],
        "roads": [(1,0,"W"),(1,0,"NW"),(1,0,"NE"),(1,0,"E"),(1,0,"SE"),(2,0,"E"),
                  (2,1,"SW"),(2,1,"SE"),(2,2,"SW"),(2,2,"SE"),(2,3,"SW")]},
    "red": {"fill": "#d4302b",
        "buildings": [(0,0,"NE","settlement",0),(1,1,"SE","city",0),(4,1,"NE","city",0),
                      (5,0,"NW","city",0),(5,0,"NE","settlement",0)],
        "roads": [(0,0,"E"),(0,1,"SW"),(1,1,"E"),(4,2,"NW"),(4,1,"E"),(5,1,"NW"),(5,0,"NW"),(5,0,"NE")]},
    "blue": {"fill": "#2f6fd6",
        "buildings": [(2,0,"NW","settlement",0),(2,0,"S","city",0),(3,0,"S","settlement",0),
                      (4,0,"NE","city",0),(6,0,"NW","settlement",0),(6,0,"NE","city",0)],
        "roads": [(2,0,"W"),(2,0,"SW"),(3,0,"E"),(3,0,"SE"),(4,0,"NE"),(6,0,"NW"),(6,0,"NE")]},
    "orange": {"fill": "#f08a24",
        "buildings": [(2,3,"N","settlement",0),(2,3,"SE","settlement",0),(6,2,"NW","city",0),
                      (6,2,"NE","settlement",0),(6,1,"S","settlement",0)],
        "roads": [(2,3,"NE"),(1,3,"SE"),(2,3,"E"),(6,2,"NW"),(6,2,"NE"),(6,1,"E"),(6,1,"SE")]},
    "white": {"fill": "#f4f1ea",
        "buildings": [(2,4,"SE","settlement",0),(3,5,"SE","city",0),(4,4,"NW","city",0),
                      (5,2,"N","settlement",0),(4,4,"S","settlement",0)],
        "roads": [(2,4,"E"),(3,5,"NE"),(3,5,"E"),(3,5,"SE"),(3,5,"SW"),(4,4,"NW"),(4,4,"W"),
                  (5,2,"NW"),(4,4,"SW")]},
}
# Recorded in the app for this session (field "nederzettingen" = building points)
NAMES = {"green": "Pim", "red": "Sangu", "blue": "Martje", "orange": "Μay-C", "white": "Faralley"}
RECORDED = {"Pim": 5, "Μay-C": 6, "Faralley": 7, "Sangu": 8, "Martje": 9}

# ---- Geometry ----
CORNERS = ["N", "NE", "SE", "S", "SW", "NW"]
EDGES = ["NE", "E", "SE", "SW", "W", "NW"]  # edge i joins corner i and i+1

def center(r, c):
    n = SPEC["rows"][r]
    return ((c - (n - 1) / 2) * S3, r * 1.5)

def corner_xy(r, c, i):
    x, y = center(r, c)
    a = math.radians(-90 + 60 * i)
    return (x + math.cos(a), y + math.sin(a))

def vkey(p):
    return (round(p[0], 2), round(p[1], 2))

def corner_key(r, c, name):
    return vkey(corner_xy(r, c, CORNERS.index(name)))

def edge_key(r, c, name):
    i = EDGES.index(name)
    return tuple(sorted([vkey(corner_xy(r, c, i)), vkey(corner_xy(r, c, (i + 1) % 6))]))

def parse_hex(s):
    parts = s.split()
    return parts[0], (int(parts[1]) if len(parts) > 1 else None)

hexes = {(r, c): parse_hex(s) for r, row in enumerate(HEXES) for c, s in enumerate(row)}
all_vertices = {corner_key(r, c, n) for (r, c) in hexes for n in CORNERS}

# ---- Rule check ----
checks = []  # (ok, text)
def check(ok, text):
    checks.append((bool(ok), text))

check([len(r) for r in HEXES] == SPEC["rows"], f"Grid shape {[len(r) for r in HEXES]}")
tc = Counter(t for t, _ in hexes.values())
check(tc == Counter(SPEC["terrain"]), "Terrain counts " + ", ".join(f"{k} {tc[k]}/{v}" for k, v in SPEC["terrain"].items()))
nc = Counter(n for _, n in hexes.values() if n)
check(nc == Counter(SPEC["tokens"]), "Number tokens " + ", ".join(f"{k}×{nc[k]}" for k in sorted(SPEC["tokens"])))
check(all((t == "desert") == (n is None) for t, n in hexes.values()), "Deserts have no token, everything else has one")
reds = [k for k, (_, n) in hexes.items() if n in (6, 8)]
adjacent_reds = [(a, b) for i, a in enumerate(reds) for b in reds[i + 1:]
                 if math.dist(center(*a), center(*b)) < S3 + 0.01]
check(not adjacent_reds, "No two red numbers (6/8) adjacent" + (f": {adjacent_reds}" if adjacent_reds else ""))
hc = Counter(k for *_, k, _ in HARBOURS)
check(hc == Counter(SPEC["harbours"]), "Harbours " + ", ".join(f"{k} {hc[k]}/{v}" for k, v in SPEC["harbours"].items()))

occupied = {}
for p, d in PLAYERS.items():
    for r, c, n, kind, _ in d["buildings"]:
        occupied[corner_key(r, c, n)] = p
neighbours = defaultdict(set)
for (r, c) in hexes:
    for i in range(6):
        a, b = vkey(corner_xy(r, c, i)), vkey(corner_xy(r, c, (i + 1) % 6))
        neighbours[a].add(b); neighbours[b].add(a)

def longest_road(player, edges):
    adj = defaultdict(list)
    for e in edges:
        adj[e[0]].append(e); adj[e[1]].append(e)
    best = 0
    def dfs(v, used):
        nonlocal best
        best = max(best, len(used))
        if used and occupied.get(v, player) != player:
            return  # opponent building cuts the road
        for e in adj[v]:
            if e not in used:
                dfs(e[1] if e[0] == v else e[0], used | {e})
    for v in list(adj):
        dfs(v, frozenset())
    return best

summary = {}
for p, d in PLAYERS.items():
    kinds = Counter(b[3] for b in d["buildings"])
    roads = {edge_key(*r) for r in d["roads"]}
    lim = SPEC["limits"]
    check(kinds["settlement"] <= lim["settlement"] and kinds["city"] <= lim["city"] and len(roads) <= lim["road"],
          f"{p}: {kinds['settlement']} settlements (max 5), {kinds['city']} cities (max 4), {len(roads)} roads (max 15)")
    my = [corner_key(r, c, n) for r, c, n, *_ in d["buildings"]]
    too_close = [v for v in my for w in neighbours[v] if w in occupied]
    check(not too_close, f"{p}: distance rule (no building next to another)")
    road_vs = {v for e in roads for v in e}
    check(all(v in road_vs for v in my), f"{p}: every building touches an own road")
    # each road must connect to own network: walk from own buildings
    reach, frontier = set(), [v for v in my]
    seen_v = set(frontier)
    while frontier:
        v = frontier.pop()
        if occupied.get(v, p) != p:
            continue
        for e in roads:
            if v in e and e not in reach:
                reach.add(e)
                w = e[1] if e[0] == v else e[0]
                if w not in seen_v:
                    seen_v.add(w); frontier.append(w)
    check(reach == roads, f"{p}: all roads connected to own buildings")
    lr = longest_road(p, roads)
    pts = kinds["settlement"] + 2 * kinds["city"]
    summary[p] = {"settlements": kinds["settlement"], "cities": kinds["city"], "roads": len(roads),
                  "building_points": pts, "longest_road": lr,
                  "unsure": sum(b[4] for b in d["buildings"])}
lr_holder = max(summary, key=lambda p: summary[p]["longest_road"])
if summary[lr_holder]["longest_road"] >= 5:
    summary[lr_holder]["longest_road_card"] = True

for p, s in summary.items():
    s["board_total"] = s["building_points"] + (2 if s.get("longest_road_card") else 0)
    rec = RECORDED[NAMES[p]]
    check(s["building_points"] == rec, f"{p} ({NAMES[p]}): building points read {s['building_points']} vs recorded {rec}")

# ---- Render ----
TERRAIN_FILL = {"forest": "#2e6b34", "pasture": "#9ccc4a", "fields": "#e9c83a", "hills": "#c8743a",
                "mountains": "#8d939b", "desert": "#e6d6a8"}
HARBOUR_LABEL = {"3:1": "3:1", "lumber": "2:1 hout", "brick": "2:1 steen", "wool": "2:1 wol",
                 "grain": "2:1 graan", "ore": "2:1 erts"}
SC = 46  # px per unit
xs = [corner_xy(r, c, i)[0] for (r, c) in hexes for i in range(6)]
ys = [corner_xy(r, c, i)[1] for (r, c) in hexes for i in range(6)]
pad = 1.6
minx, miny = min(xs) - pad, min(ys) - pad
W, H = (max(xs) - minx + pad) * SC, (max(ys) - miny + pad) * SC
def P(x, y):
    return ((x - minx) * SC, (y - miny) * SC)
def pts(points):
    return " ".join(f"{P(*p)[0]:.1f},{P(*p)[1]:.1f}" for p in points)

svg = [f'<svg viewBox="0 0 {W:.0f} {H:.0f}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Digitaal bord">']
# sea
sea = [corner_xy(r, c, i) for (r, c) in hexes for i in range(6)]
cx0, cy0 = sum(p[0] for p in sea) / len(sea), sum(p[1] for p in sea) / len(sea)
svg.append(f'<circle cx="{P(cx0,cy0)[0]:.0f}" cy="{P(cx0,cy0)[1]:.0f}" r="{(max(ys)-min(ys))/2*SC+50:.0f}" fill="var(--sea)"/>')
for (r, c), (t, n) in hexes.items():
    poly = [corner_xy(r, c, i) for i in range(6)]
    svg.append(f'<polygon points="{pts(poly)}" fill="{TERRAIN_FILL[t]}" stroke="#f3e3b8" stroke-width="3"><title>{t} {n or ""} (rij {r+1}, {c+1})</title></polygon>')
    x, y = P(*center(r, c))
    if n:
        col = "#c0262d" if n in (6, 8) else "#222"
        pips = 6 - abs(7 - n)
        svg.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="15" fill="#f6ecd2" stroke="#7a6a44"/>')
        svg.append(f'<text x="{x:.1f}" y="{y+4:.1f}" text-anchor="middle" font-size="14" font-weight="700" fill="{col}">{n}</text>')
        for k in range(pips):
            svg.append(f'<circle cx="{x + (k-(pips-1)/2)*3.4:.1f}" cy="{y+10:.1f}" r="1.2" fill="{col}"/>')
    else:
        svg.append(f'<text x="{x:.1f}" y="{y+4:.1f}" text-anchor="middle" font-size="11" fill="#6b5a2e">woestijn</text>')
# harbours
for r, c, e, kind, note in HARBOURS:
    i = EDGES.index(e)
    a, b = corner_xy(r, c, i), corner_xy(r, c, (i + 1) % 6)
    hx, hy = center(r, c)
    mx, my = (a[0] + b[0]) / 2, (a[1] + b[1]) / 2
    ox, oy = hx + (mx - hx) * 1.75, hy + (my - hy) * 1.75
    for q in (a, b):
        svg.append(f'<line x1="{P(*q)[0]:.1f}" y1="{P(*q)[1]:.1f}" x2="{P(ox,oy)[0]:.1f}" y2="{P(ox,oy)[1]:.1f}" stroke="#f6ecd2" stroke-width="2" stroke-dasharray="3 3"/>')
    px, py = P(ox, oy)
    dash = ' stroke-dasharray="3 2"' if note else ""
    svg.append(f'<rect x="{px-26:.1f}" y="{py-10:.1f}" width="52" height="20" rx="10" fill="#f6ecd2" stroke="#7a6a44"{dash}><title>{note}</title></rect>')
    svg.append(f'<text x="{px:.1f}" y="{py+4:.1f}" text-anchor="middle" font-size="10" fill="#333">{HARBOUR_LABEL[kind]}{"?" if note else ""}</text>')
# roads
for p, d in PLAYERS.items():
    for r, c, e in d["roads"]:
        i = EDGES.index(e)
        a, b = corner_xy(r, c, i), corner_xy(r, c, (i + 1) % 6)
        a2 = (a[0] + (b[0]-a[0])*0.2, a[1] + (b[1]-a[1])*0.2)
        b2 = (a[0] + (b[0]-a[0])*0.8, a[1] + (b[1]-a[1])*0.8)
        for w, col in ((9, "#222"), (6, d["fill"])):
            svg.append(f'<line x1="{P(*a2)[0]:.1f}" y1="{P(*a2)[1]:.1f}" x2="{P(*b2)[0]:.1f}" y2="{P(*b2)[1]:.1f}" stroke="{col}" stroke-width="{w}" stroke-linecap="round"/>')
# buildings
for p, d in PLAYERS.items():
    for r, c, n, kind, unsure in d["buildings"]:
        x, y = P(*corner_xy(r, c, CORNERS.index(n)))
        if kind == "settlement":
            shape = [(-7, 7), (7, 7), (7, -2), (0, -9), (-7, -2)]
        else:
            shape = [(-11, 8), (11, 8), (11, -3), (3, -3), (3, -8), (-4, -14), (-11, -8)]
        dash = ' stroke-dasharray="3 2"' if unsure else ""
        svg.append(f'<polygon points="{" ".join(f"{x+u:.1f},{y+v:.1f}" for u, v in shape)}" fill="{d["fill"]}" stroke="#111" stroke-width="{2 if unsure else 1.5}"{dash}><title>{p} {kind}{" (onzeker)" if unsure else ""}</title></polygon>')
        if unsure:
            svg.append(f'<text x="{x+12:.1f}" y="{y-8:.1f}" font-size="12" font-weight="700" fill="#111" stroke="#fff" stroke-width="3" paint-order="stroke">?</text>')
rx, ry = P(*center(*ROBBER))
svg.append(f'<g transform="translate({rx-20:.1f},{ry-14:.1f})"><ellipse cx="0" cy="6" rx="7" ry="4" fill="#111"/><rect x="-5" y="-6" width="10" height="12" rx="5" fill="#222"/><circle cx="0" cy="-9" r="5" fill="#222"/><title>Rover</title></g>')
svg.append("</svg>")

rows_html = "".join(
    f'<tr><td><span class="dot" style="background:{PLAYERS[p]["fill"]}"></span>{p} · {NAMES[p]}</td><td>{s["settlements"]}</td><td>{s["cities"]}</td>'
    f'<td>{s["roads"]}</td><td>{s["longest_road"]}{" 🏅" if s.get("longest_road_card") else ""}</td><td>{s["building_points"]}</td><td><b>{s["board_total"]}</b></td><td>{s["unsure"] or ""}</td></tr>'
    for p, s in summary.items())
checks_html = "".join(f'<li class="{"ok" if ok else "bad"}">{"✓" if ok else "✗"} {html.escape(t)}</li>' for ok, t in checks)
rec_html = ", ".join(f"{k} {v}" for k, v in RECORDED.items())

page = f"""<!doctype html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Catan bordanalyse</title><style>
:root{{--bg:#faf8f4;--fg:#1d1b18;--muted:#6d665c;--card:#fff;--line:#e4ded3;--sea:#3f7fc1;--ok:#2d7a3a;--bad:#b3261e}}
@media (prefers-color-scheme:dark){{:root:not([data-theme="light"]){{--bg:#171614;--fg:#eeeae3;--muted:#a59e93;--card:#211f1c;--line:#38342e;--sea:#2b5d93;--ok:#7bc58a;--bad:#f2867e}}}}
body{{margin:0;background:var(--bg);color:var(--fg);font:15px/1.5 system-ui,sans-serif}}
main{{max-width:1200px;margin:0 auto;padding:24px 16px}} h1{{font-size:22px;margin:0 0 4px}} p.sub{{color:var(--muted);margin:0 0 20px}}
.grid{{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:16px;align-items:start}}
.card{{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:14px}} .card h2{{font-size:15px;margin:0 0 10px}}
img,svg{{width:100%;height:auto;display:block;border-radius:8px}}
table{{width:100%;border-collapse:collapse;font-variant-numeric:tabular-nums}} td,th{{padding:5px 6px;border-bottom:1px solid var(--line);text-align:left}}
.dot{{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:6px;border:1px solid #0006}}
ul{{padding-left:0;list-style:none;margin:0}} li{{padding:2px 0}} li.ok{{color:var(--ok)}} li.bad{{color:var(--bad);font-weight:600}}
.note{{color:var(--muted);font-size:13px}}
</style></head><body><main>
<h1>Catan bordanalyse — test</h1>
<p class="sub">Markante mannen · 4 okt 2026 · handmatig gelezen uit de sessiefoto (900×1600) · stippellijn/“?” = onzeker</p>
<div class="grid">
<div class="card"><h2>Foto</h2><img src="{PHOTO}" alt="Sessiefoto"></div>
<div class="card"><h2>Digitaal bord</h2>{''.join(svg)}</div>
<div class="card"><h2>Per kleur</h2><table><tr><th>Kleur</th><th>Dorp</th><th>Stad</th><th>Weg</th><th>Langste</th><th>Gebouwen</th><th>Totaal*</th><th>?</th></tr>{rows_html}</table>
<p class="note">* Totaal = gebouwen + 2 voor de langste handelsroute. Grootste riddermacht en overwinningspuntkaarten staan niet op het bord.<br>Vastgelegd in de app (nederzettingen): {html.escape(rec_html)}</p></div>
<div class="card"><h2>Regelcontrole</h2><ul>{checks_html}</ul></div>
</div></main></body></html>"""
open("board.html", "w", encoding="utf-8").write(page)
print(json.dumps(summary, indent=1))
for ok, t in checks:
    print("OK " if ok else "XX ", t)
