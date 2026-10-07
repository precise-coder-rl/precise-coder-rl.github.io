"""Recover plotted data from the vector figures in the paper PDF.

Maps path coordinates back to data space using each panel's tick marks.
Writes assets/figure-data.js (reward-term correlations, training curves,
agentic scatter, hypothesis lines).

Usage: python3 tools/extract_figure_data.py [path/to/main.pdf]
"""
import json
import sys
import fitz

PDF = sys.argv[1] if len(sys.argv) > 1 else "main.pdf"
doc = fitz.open(PDF)


def col(g):
    c = g.get("color") or g.get("fill")
    return tuple(round(x, 2) for x in c) if c else None


def ticks(page, clip):
    """Short black tick segments inside clip -> (x_ticks, y_ticks) positions."""
    xs, ys = set(), set()
    for g in page.get_drawings():
        r = g["rect"]
        x0, y0, x1, y1 = clip
        inside = x0 <= r.x0 and r.x1 <= x1 and y0 <= r.y0 and r.y1 <= y1  # rects may be zero-width
        if not inside or col(g) != (0.0, 0.0, 0.0) or len(g["items"]) != 1:
            continue
        if r.width < 0.5 and 0.6 < r.height < 5:
            xs.add(round(r.x0, 2))
        elif r.height < 0.5 and 0.6 < r.width < 5:
            ys.add(round(r.y0, 2))
    return sorted(xs), sorted(ys, reverse=True)  # y ascending in data = descending in page


def scaler(p0, p1, v0, v1):
    return lambda p: v0 + (p - p0) * (v1 - v0) / (p1 - p0)


def polyline(g):
    pts = []
    for it in g["items"]:
        if it[0] == "l":
            for q in (it[1], it[2]):
                if not pts or (abs(pts[-1][0] - q.x) > 1e-3 or abs(pts[-1][1] - q.y) > 1e-3):
                    pts.append((q.x, q.y))
    return pts


def center(g):
    r = g["rect"]
    return (r.x0 + r.width / 2, r.y0 + r.height / 2)


out = {}

# ---------- Figure 1b: training dynamics (page 2) ----------
page = doc[1]
BLUE, GRAY = (0.0, 0.45, 0.7), (0.43, 0.43, 0.43)
panels = [
    ("pass", (138, 170, 236, 275), [0, 0.2, 0.4, 0.6, 0.8, 1.0]),
    ("lines", (270, 170, 368, 275), [0, 2.5, 5, 7.5, 10, 12.5, 15]),
    ("noop", (402, 170, 500, 275), [0, 20, 40, 60, 80]),
]
fig1b = {}
for name, clip, ylabels in panels:
    xt, yt = ticks(page, clip)
    fx = scaler(xt[0], xt[-1], 0, 300)
    fy = scaler(yt[0], yt[len(ylabels) - 1], ylabels[0], ylabels[-1])
    series = {"grpo": {"raw": [], "smooth": None, "points": []}, "pc": {"raw": [], "smooth": None, "points": []}}
    for g in page.get_drawings():
        if not fitz.Rect(clip).contains(g["rect"]):
            continue
        c = col(g)
        key = "pc" if c == BLUE else "grpo" if c == GRAY else None
        if not key:
            continue
        if g["type"] == "s" and len(g["items"]) > 5:
            pts = [[round(fx(x), 2), round(fy(y), 4)] for x, y in polyline(g)]
            if (g.get("width") or 0) > 1.2:
                series[key]["smooth"] = pts
            else:
                series[key]["raw"].append(pts)
        elif g["type"] == "fs" and g["rect"].width < 4:
            x, y = center(g)
            series[key]["points"].append([round(fx(x), 1), round(fy(y), 2)])
    fig1b[name] = series
out["fig1b"] = fig1b

# ---------- Figure 5: agentic scatter (page 7) ----------
page = doc[6]
clip = (360, 240, 508, 354)
xt, yt = ticks(page, clip)
fx = scaler(xt[0], xt[-1], 40, 70)
fy = scaler(yt[0], yt[-1], 40, 60)
names = {(0.84, 0.37, 0.0): "Qwen3.5-9B", (0.43, 0.43, 0.43): "GRPO (unit test)"}
pts = []
for g in page.get_drawings():
    if fitz.Rect(clip).contains(g["rect"]) and g["type"] == "fs" and col(g) != (0.0, 0.0, 0.0) and g["rect"].width < 5:
        x, y = center(g)
        pts.append({"c": col(g), "x": round(fx(x), 2), "y": round(fy(y), 2), "square": len(g["items"]) == 1})
fig5 = []
for p in pts:
    name = names.get(p["c"]) or ("PreciseCoder-9B-Agent" if p["square"] else "PreciseCoder-9B")
    fig5.append({"name": name, "precision": p["x"], "pass": p["y"]})
out["fig5"] = fig5

# ---------- Figure 8: no-op rate by hypothesis quartile (page 9) ----------
# Color = method, dashed = 4B, solid = 9B.
page = doc[8]
clip = (336, 78, 508, 202)
xt, yt = ticks(page, clip)
fy = scaler(yt[0], yt[3], 0, 60)
METHOD = {(0.84, 0.37, 0.0): ("Qwen3.5-{}", ""), (0.43, 0.43, 0.43): ("{} + GRPO (unit)", ""), (0.0, 0.45, 0.7): ("PreciseCoder-{}", "")}
fig7 = {}
for g in page.get_drawings():
    c = col(g)
    if c in METHOD and g["type"] == "s" and len(g["items"]) == 3 and fitz.Rect(clip).contains(g["rect"]):
        dashed = bool(g.get("dashes")) and g["dashes"] != "[] 0"
        fig7[METHOD[c][0].format("4B" if dashed else "9B")] = [round(fy(y), 1) for _, y in polyline(g)]
out["fig7"] = fig7

# ---------- Figure 2: reward-term correlations (page 4) ----------
# x = r(term, unit), y = r(term, -l | unit = 1); markers joined 4B -> 9B by a short line.
page = doc[3]
clip = (355, 415, 505, 545)
xt, yt = ticks(page, clip)
fx = scaler(xt[0], xt[-1], 0, 1)
fy = scaler(yt[0], yt[-1], 0, 1)
TERMS = {(0.0, 0.62, 0.45): "negl", (0.0, 0.63, 0.66): "prec", (0.48, 0.31, 0.72): "rec", (0.0, 0.45, 0.7): "f1", (0.43, 0.43, 0.43): "unit"}
terms = {}
for g in page.get_drawings():
    c = col(g)
    if c in TERMS and g["type"] == "s" and len(g["items"]) == 1 and fitz.Rect(clip).contains(fitz.Rect(g["rect"]).normalize() | g["rect"].tl):
        a, b = g["items"][0][1], g["items"][0][2]
        terms[TERMS[c]] = [[round(fx(a.x), 3) + 0.0, round(fy(a.y), 3) + 0.0], [round(fx(b.x), 3) + 0.0, round(fy(b.y), 3) + 0.0]]
out["rewardTerms"] = terms

with open("assets/figure-data.js", "w") as f:
    f.write("// Generated by tools/extract_figure_data.py from the paper PDF. Do not edit by hand.\n")
    f.write("window.FIGURE_DATA = " + json.dumps(out, separators=(",", ":")) + ";\n")

print("fig5", fig5)
print("fig7", fig7)
print("rewardTerms", terms)
for k, v in fig1b.items():
    print(k, {s: (len(v[s]["raw"]), len(v[s]["smooth"] or []), len(v[s]["points"])) for s in v},
          "ends", v["grpo"]["smooth"][-1] if v["grpo"]["smooth"] else None)
