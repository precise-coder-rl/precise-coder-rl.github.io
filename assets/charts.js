/* =====================================================================
   Native, theme-aware SVG rebuilds of the paper's figures.
   Colors come from CSS tokens (see .s-* classes in style.css), so every
   chart follows light/dark mode. Charts re-render at their real pixel
   width, so text stays legible on phones.
   Data: Table 2 (RESULTS in main.js), numbers quoted in the paper text,
   and window.FIGURE_DATA (recovered from the PDF's vector paths).
   ===================================================================== */
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const FD = window.FIGURE_DATA || {};

  /* ---------- helpers ---------- */
  const el = (tag, attrs = {}, parent, text) => {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) if (attrs[k] != null) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    if (parent) parent.appendChild(e);
    return e;
  };
  const div = (cls, parent, html) => {
    const d = document.createElement("div");
    d.className = cls;
    if (html != null) d.innerHTML = html;
    if (parent) parent.appendChild(d);
    return d;
  };
  const lin = (d0, d1, r0, r1) => {
    const f = v => r0 + ((v - d0) * (r1 - r0)) / (d1 - d0);
    f.invert = p => d0 + ((p - r0) * (d1 - d0)) / (r1 - r0);
    return f;
  };
  const f1 = v => (Math.round(v * 10) / 10).toFixed(1);
  const pathOf = (pts, sx, sy) => "M" + pts.map(p => sx(p[0]).toFixed(1) + "," + sy(p[1]).toFixed(1)).join("L");
  const num = v => (typeof v === "number" ? v : parseFloat(v));
  const sd = v => (typeof v === "string" && v.includes("±") ? parseFloat(v.split("±")[1]) : 0);

  /* ---------- tooltip ---------- */
  const tip = div("chart-tip", document.body);
  tip.setAttribute("role", "status");
  const showTip = (html, x, y) => {
    tip.innerHTML = html;
    tip.classList.add("on");
    const r = tip.getBoundingClientRect();
    let left = x + 14, top = y + 14;
    if (left + r.width > innerWidth - 8) left = x - r.width - 14;
    if (top + r.height > innerHeight - 8) top = y - r.height - 14;
    tip.style.transform = `translate(${Math.max(8, left)}px, ${Math.max(8, top)}px)`;
  };
  const hideTip = () => tip.classList.remove("on");
  const hot = (node, html) => {
    node.classList.add("hot");
    node.addEventListener("pointermove", e => showTip(typeof html === "function" ? html(e) : html, e.clientX, e.clientY));
    node.addEventListener("pointerleave", hideTip);
  };
  addEventListener("scroll", hideTip, { passive: true });

  /* ---------- layout primitives ---------- */
  function legend(host, items) {
    div("chart-legend", host, items.map(i =>
      `<span class="${i.cls}"><i class="sw ${i.shape || "block"}"></i>${i.label}</span>`).join(""));
  }
  function panelHost(host, title, sub) {
    const p = div("panel", host);
    if (title) div("panel-title", p, title + (sub ? ` <span>${sub}</span>` : ""));
    return p;
  }
  // Cartesian frame at the host's real pixel width.
  function frame(host, o) {
    const W = Math.max(200, host.clientWidth);
    const ratio = W < 480 && o.x ? Math.max(o.ratio || 0.62, 0.9) : o.ratio || 0.62; // taller scatters/lines on phones
    const H = o.H || Math.round(W * ratio);
    const m = Object.assign({ t: 10, r: 14, b: o.xlabel ? 40 : 26, l: 38 }, o.m || {});
    const svg = el("svg", { width: W, height: H, viewBox: `0 0 ${W} ${H}`, class: "chart-svg", role: "img", "aria-label": o.label || "" }, host);
    const sx = o.x ? lin(o.x[0], o.x[1], m.l, W - m.r) : null;
    const sy = lin(o.y[0], o.y[1], H - m.b, m.t);
    const g = el("g", {}, svg);
    (o.yticks || []).forEach(v => {
      el("line", { x1: m.l, x2: W - m.r, y1: sy(v), y2: sy(v), class: v === o.y[0] ? "axis" : "grid" }, g);
      el("text", { x: m.l - 8, y: sy(v) + 4, "text-anchor": "end", class: "tick" }, g, (o.yfmt || String)(v));
    });
    if (sx) (o.xticks || []).forEach(v => {
      if (o.xgrid) el("line", { x1: sx(v), x2: sx(v), y1: m.t, y2: H - m.b, class: "grid" }, g);
      el("text", { x: sx(v), y: H - m.b + 17, "text-anchor": "middle", class: "tick" }, g, (o.xfmt || String)(v));
    });
    if (o.xlabel) el("text", { x: (m.l + W - m.r) / 2, y: H - 6, "text-anchor": "middle", class: "axis-label" }, g, o.xlabel);
    return { svg, g, sx, sy, W, H, m };
  }
  const toSvgX = (svg, e) => {
    const pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    return pt.matrixTransform(svg.getScreenCTM().inverse()).x;
  };

  /* ---------- grouped bar panel ---------- */
  // groups: [{label, bars:[{cls, name, v, text?}]}]; slots = bars per full group
  function barPanel(host, { groups, slots, y, yticks, yfmt, valfmt, what, emph = "s-pc", ratio = 0.78, H }) {
    const F = frame(host, { y, yticks, yfmt, ratio, H, m: { b: 30 } });
    const { g, sy, W, m } = F;
    const gw = (W - m.l - m.r) / groups.length;
    const bw = Math.min(26, (gw * 0.78) / slots);
    groups.forEach((grp, gi) => {
      const cx = m.l + gw * gi + gw / 2;
      const x0 = cx - (bw * grp.bars.length) / 2;
      grp.bars.forEach((b, bi) => {
        const x = x0 + bi * bw, top = sy(b.v), base = sy(y[0]);
        const r = el("rect", { x: x + 1, y: top, width: bw - 2, height: Math.max(0.5, base - top), rx: 1.5, class: `bar ${b.cls}` }, g);
        hot(r, `<b>${b.name}</b> · ${grp.label}<br>${what}: ${(valfmt || f1)(b.v)}`);
        if (b.cls === emph || grp.bars.length <= 2) {
          el("text", { x: x + bw / 2, y: top - 5, "text-anchor": "middle", class: `val ${b.cls}` }, g, (valfmt || f1)(b.v));
        }
      });
      el("text", { x: cx, y: sy(y[0]) + 18, "text-anchor": "middle", class: "tick cat" }, g, grp.label);
    });
    return F;
  }

  /* =====================================================================
     1 · Training dynamics (Figure 1b)
     ===================================================================== */
  function training(host) {
    const T = FD.fig1b;
    if (!T) return;
    legend(host, [
      { label: "GRPO (unit test)", cls: "s-grpo", shape: "line" },
      { label: "PreciseCoder (unit + F₁)", cls: "s-pc", shape: "line" },
      { label: "single runs", cls: "s-muted", shape: "thin" },
    ]);
    const grid = div("panels three", host);
    const specs = [
      { k: "pass", title: "Unit-test pass rate", sub: "train", y: [0, 1], yt: [0, 0.2, 0.4, 0.6, 0.8, 1], yf: v => v.toFixed(1), vf: v => v.toFixed(2) },
      { k: "lines", title: "Edited lines when tests pass", sub: "train", y: [0, 15], yt: [0, 5, 10, 15], yf: String, vf: f1 },
      { k: "noop", title: "No-op rate on correct code", sub: "val, %", y: [0, 80], yt: [0, 20, 40, 60, 80], yf: String, vf: v => f1(v) + "%" },
    ];
    specs.forEach(s => {
      const p = panelHost(grid, s.title, s.sub);
      const F = frame(p, { x: [0, 330], y: s.y, xticks: [0, 100, 200, 300], yticks: s.yt, yfmt: s.yf, xlabel: "training step", ratio: 0.72, label: `${s.title}: GRPO vs PreciseCoder over training` });
      const { g, sx, sy, svg, m, H, W } = F;
      const series = [["grpo", "s-grpo", "GRPO"], ["pc", "s-pc", "PreciseCoder"]];
      series.forEach(([k, cls]) => T[s.k][k].raw.forEach(r => el("path", { d: pathOf(r, sx, sy), class: `raw ${cls}` }, g)));
      series.forEach(([k, cls]) => {
        const sm = T[s.k][k].smooth;
        if (sm) el("path", { d: pathOf(sm, sx, sy), class: `line draw ${cls}`, pathLength: 1 }, g);
        T[s.k][k].points.forEach(pt => el("circle", { cx: sx(pt[0]), cy: sy(pt[1]), r: 2.6, class: `dot ${cls}` }, g));
      });
      // hover crosshair
      const cross = el("line", { y1: m.t, y2: H - m.b, class: "cross" }, g);
      const dots = series.map(([, cls]) => el("circle", { r: 3.6, class: `dot ring ${cls}` }, g));
      const hit = el("rect", { x: m.l, y: m.t, width: W - m.l - m.r, height: H - m.t - m.b, class: "hit" }, g);
      const nearest = (arr, x) => arr.reduce((a, b) => (Math.abs(b[0] - x) < Math.abs(a[0] - x) ? b : a));
      hit.addEventListener("pointermove", e => {
        const x = sx.invert(toSvgX(svg, e));
        const vals = series.map(([k]) => {
          const src = T[s.k][k].points.length ? T[s.k][k].points : T[s.k][k].smooth;
          return nearest(src, x);
        });
        cross.setAttribute("x1", sx(vals[0][0])); cross.setAttribute("x2", sx(vals[0][0]));
        vals.forEach((v, i) => { dots[i].setAttribute("cx", sx(v[0])); dots[i].setAttribute("cy", sy(v[1])); });
        g.classList.add("hovering");
        showTip(`step ${Math.round(vals[0][0])}<br><span class="s-grpo"><i class="sw line"></i></span>GRPO: <b>${s.vf(vals[0][1])}</b><br><span class="s-pc"><i class="sw line"></i></span>PreciseCoder: <b>${s.vf(vals[1][1])}</b>`, e.clientX, e.clientY);
      });
      hit.addEventListener("pointerleave", () => { g.classList.remove("hovering"); hideTip(); });
    });
  }

  /* =====================================================================
     2 · Precision vs pass rate (Figure 12) — from Table 2
     ===================================================================== */
  function frontier(host) {
    const R = window.RESULTS;
    if (!R) return;
    const row = (blk, name) => R[blk].find(r => r[0] === name);
    const pt = (r, name, cls) => ({ name, cls, prec: num(r[2]), pass: num(r[1]), lines: num(r[4]), ex: sd(r[2]), ey: sd(r[1]) });
    const bases = [
      pt(row("Qwen3.5-4B", "Base"), "Qwen3.5-4B", "s-base"),
      pt(row("Qwen3.5-9B", "Base"), "Qwen3.5-9B", "s-base"),
      pt(row("Qwen3.6-27B & frontier", "Qwen3.6-27B (base)"), "Qwen3.6-27B", "s-base"),
    ];
    const pcs = [
      pt(row("Qwen3.5-4B", "PreciseCoder"), "PreciseCoder-4B", "s-pc"),
      pt(row("Qwen3.5-9B", "PreciseCoder"), "PreciseCoder-9B", "s-pc"),
      pt(row("Qwen3.6-27B & frontier", "PreciseCoder-27B"), "PreciseCoder-27B", "s-pc"),
    ];
    const fr = R["Qwen3.6-27B & frontier"].slice(3).map(r => pt(r, r[0], "s-front"));
    legend(host, [
      { label: "Base model", cls: "s-base", shape: "dot" },
      { label: "PreciseCoder (ours)", cls: "s-pc", shape: "dot" },
      { label: "Frontier model", cls: "s-front", shape: "dot" },
      { label: "bubble area = edited lines", cls: "s-muted", shape: "none" },
    ]);
    const p = panelHost(host, "Unit-test pass rate (%)");
    const F = frame(p, { x: [30, 85], y: [30, 92], xticks: [30, 40, 50, 60, 70, 80], yticks: [30, 40, 50, 60, 70, 80, 90], xlabel: "Edit precision on PDB Test (%)", ratio: 0.72, xgrid: true, label: "Edit precision versus pass rate on PDB Test" });
    const { g, sx, sy } = F;
    const rad = l => Math.sqrt(l) * 2.4 + 1;
    el("defs", {}, F.svg).innerHTML = `<marker id="arrowhead" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0L8,4L0,8z" class="arrowhead"/></marker>`;
    bases.forEach((b, i) => {
      const c = pcs[i];
      const x1 = sx(b.prec), y1 = sy(b.pass), x2 = sx(c.prec), y2 = sy(c.pass);
      const ang = Math.atan2(y2 - y1, x2 - x1), r1 = rad(b.lines) + 4, r2 = rad(c.lines) + 6;
      const a = [x1 + Math.cos(ang) * r1, y1 + Math.sin(ang) * r1], z = [x2 - Math.cos(ang) * r2, y2 - Math.sin(ang) * r2];
      const mx = (a[0] + z[0]) / 2 + Math.sin(ang) * 18, my = (a[1] + z[1]) / 2 - Math.cos(ang) * 18;
      el("path", { d: `M${a[0]},${a[1]} Q${mx},${my} ${z[0]},${z[1]}`, class: "arrow draw", pathLength: 1, "marker-end": "url(#arrowhead)" }, g);
    });
    const LBL = {
      "Qwen3.5-4B": [1, 0, "start", 0], "Qwen3.5-9B": [-1, -1, "end", 0], "Qwen3.6-27B": [-1, 0, "end", 0],
      "PreciseCoder-4B": [1, 0, "start", 0], "PreciseCoder-9B": [1, 0, "start", 0], "PreciseCoder-27B": [0, -1, "middle", 10],
      "GPT-5.6 Sol (high)": [1, 0, "start", 0], "DeepSeek-V4-Pro": [-1, 0, "end", 0],
      "DeepSeek-V4.1-Flash": [1, -1, "start", 0], "Qwen3.8-Flash-Next": [0, 1, "middle", 2],
    };
    [...bases, ...pcs, ...fr].forEach(d => {
      const cx = sx(d.prec), cy = sy(d.pass), r = rad(d.lines);
      if (d.ex) {
        el("line", { x1: sx(d.prec - d.ex), x2: sx(d.prec + d.ex), y1: cy, y2: cy, class: `err ${d.cls}` }, g);
        el("line", { x1: cx, x2: cx, y1: sy(d.pass - d.ey), y2: sy(d.pass + d.ey), class: `err ${d.cls}` }, g);
      }
      const c = el("circle", { cx, cy, r, class: `bubble ${d.cls}` }, g);
      hot(c, `<b>${d.name}</b><br>Precision ${f1(d.prec)}%${d.ex ? ` ± ${d.ex}` : ""}<br>Pass ${f1(d.pass)}%${d.ey ? ` ± ${d.ey}` : ""}<br>Edited lines ${f1(d.lines)}`);
      if (F.W < 480 && d.cls === "s-front" && !d.name.startsWith("GPT")) return; // tooltips only on phones
      const [dx, dy, anchor, extra] = F.W < 480 && d.name.startsWith("GPT") ? [-1, 0, "end", 0] : LBL[d.name] || [1, 0, "start", 0];
      el("text", { x: cx + dx * (r + 6), y: cy + dy * (r + 6 + (extra || 0)) + (dy === 0 ? 4 : dy > 0 ? 6 : -2), "text-anchor": anchor, class: `pt-label ${d.cls}` }, g, d.name);
    });
  }

  /* =====================================================================
     3 · No-op vs precision (Figure 3) — from Table 2
     ===================================================================== */
  function restraint(host) {
    const R = window.RESULTS;
    if (!R) return;
    const METHOD = { Base: "s-base", SFT: "s-other", DPO: "s-other", "GRPO (unit test)": "s-grpo", RECAP: "s-other", "EA-GRPO": "s-ea", PreciseCoder: "s-pc" };
    const pts = [];
    ["Qwen3.5-4B", "Qwen3.5-9B"].forEach(blk => R[blk].forEach(r =>
      pts.push({ size: blk.split("-")[1], method: r[0], cls: METHOD[r[0]], prec: num(r[2]), noop: num(r[5]), pass: num(r[1]) })));
    R["Qwen3.6-27B & frontier"].slice(0, 2).forEach((r, i) =>
      pts.push({ size: "27B", method: i ? "PreciseCoder" : "Base", cls: i ? "s-pc" : "s-base", prec: num(r[2]), noop: num(r[5]), pass: num(r[1]) }));
    // least-squares fit + Pearson r
    const n = pts.length, mx = pts.reduce((a, p) => a + p.prec, 0) / n, my = pts.reduce((a, p) => a + p.noop, 0) / n;
    let sxy = 0, sxx = 0, syy = 0;
    pts.forEach(p => { sxy += (p.prec - mx) * (p.noop - my); sxx += (p.prec - mx) ** 2; syy += (p.noop - my) ** 2; });
    const slope = sxy / sxx, icpt = my - slope * mx, r = sxy / Math.sqrt(sxx * syy);

    legend(host, [
      { label: "Base", cls: "s-base", shape: "dot" },
      { label: "GRPO (unit test)", cls: "s-grpo", shape: "dot" },
      { label: "EA-GRPO", cls: "s-ea", shape: "dot" },
      { label: "SFT · DPO · RECAP", cls: "s-other", shape: "dot" },
      { label: "PreciseCoder", cls: "s-pc", shape: "dot" },
    ]);
    const p = panelHost(host, "No-op rate on correct code (%)");
    const F = frame(p, { x: [25, 85], y: [15, 60], xticks: [30, 40, 50, 60, 70, 80], yticks: [20, 30, 40, 50, 60], xlabel: "Edit precision on PDB Test (%)", ratio: 0.72, xgrid: true, label: "No-op rate on correct code versus edit precision" });
    const { g, sx, sy } = F;
    const X0 = 28, X1 = 82;
    el("line", { x1: sx(X0), y1: sy(slope * X0 + icpt), x2: sx(X1), y2: sy(slope * X1 + icpt), class: "fit draw", pathLength: 1 }, g);
    el("text", { x: sx(X1), y: sy(slope * X1 + icpt) - 8, "text-anchor": "end", class: "pt-label s-muted" }, g, `fit, r = ${r.toFixed(2)}`);
    pts.sort((a, b) => (a.cls === "s-pc") - (b.cls === "s-pc")).forEach(d => {
      const c = el("circle", { cx: sx(d.prec), cy: sy(d.noop), r: Math.sqrt(d.pass) * 0.85, class: `bubble ${d.cls}` }, g);
      hot(c, `<b>${d.method}</b> · ${d.size}<br>Precision ${f1(d.prec)}%<br>No-op ${f1(d.noop)}%<br>Pass ${f1(d.pass)}%`);
      if (d.cls === "s-pc") el("text", { x: sx(d.prec) + 10, y: sy(d.noop) + 4, class: "pt-label s-pc" }, g, d.size);
    });
  }

  /* =====================================================================
     4 · PDB-Wild (Figure 4) — numbers from the paper
     ===================================================================== */
  const M4 = [["s-base", "Base"], ["s-grpo", "GRPO (unit test)"], ["s-ea", "EA-GRPO"], ["s-pc", "PreciseCoder"]];
  const mkBars = vals => vals.map((v, i) => (v == null ? null : { cls: M4[i][0], name: M4[i][1], v })).filter(Boolean);
  const methodLegend = host => legend(host, M4.map(([cls, label]) => ({ cls, label: label === "PreciseCoder" ? "PreciseCoder (ours)" : label })));

  function wild(host) {
    methodLegend(host);
    const grid = div("panels three", host);
    const D = {
      pass: { "4B": [17.1, 22.8, 19.4, 27.6], "9B": [21.9, 32.9, 30.0, 32.3], "27B": [44.7, null, null, 55.9] },
      prec: { "4B": [17.9, 15.2, 29.0, 38.2], "9B": [26.2, 26.3, 38.4, 42.9], "27B": [44.4, null, null, 59.2] },
      lines: { "4B": [37.8, 51.5, 26.3, 10.8], "9B": [33.9, 28.3, 11.2, 12.0], "27B": [18.4, null, null, 9.1] },
    };
    const panels = [
      ["pass", "Unit-test pass rate (%)", "↑", [0, 60], [0, 20, 40, 60]],
      ["prec", "Edit precision (%)", "↑", [0, 60], [0, 20, 40, 60]],
      ["lines", "Edited lines", "↓", [0, 55], [0, 10, 20, 30, 40, 50]],
    ];
    panels.forEach(([k, title, dir, y, yticks]) => {
      const p = panelHost(grid, title, dir);
      barPanel(p, {
        groups: ["4B", "9B", "27B"].map(s => ({ label: s, bars: mkBars(D[k][s]) })),
        slots: 4, y, yticks, what: title.replace(" (%)", ""), valfmt: f1,
      });
    });
  }

  /* =====================================================================
     5 · SWE-Bench Verified (Figure 5) — numbers from the paper
     ===================================================================== */
  function swe(host) {
    methodLegend(host);
    const grid = div("panels swe", host);
    const pct = v => "+" + Math.round(v) + "%";
    const p1 = panelHost(grid, "Resolved (%)", "↑");
    barPanel(p1, {
      groups: [{ label: "Qwen3.5-9B", bars: mkBars([25.9, 28.1, 27.1, 32.7]) }, { label: "Qwen3.6-27B", bars: mkBars([67.9, null, null, 70.8]) }],
      slots: 4, y: [0, 80], yticks: [0, 20, 40, 60, 80], what: "Resolved", valfmt: f1, H: 240,
    });
    const p2 = panelHost(grid, "Over-edit vs. gold patch", "↓ resolved only");
    barPanel(p2, {
      groups: [{ label: "Qwen3.5-9B", bars: mkBars([28, 58, 37, 29]) }, { label: "Qwen3.6-27B", bars: mkBars([62, null, null, 42]) }],
      slots: 4, y: [0, 70], yticks: [0, 20, 40, 60], yfmt: v => v + "%", what: "Excess changed lines", valfmt: pct, H: 240,
    });
    const p3 = panelHost(grid, "Damage (%)", "↓ already fixed");
    barPanel(p3, {
      groups: [{ label: "Qwen3.6-27B", bars: mkBars([11.0, null, null, 8.9]) }],
      slots: 2, y: [0, 14], yticks: [0, 4, 8, 12], what: "Repos broken", valfmt: f1, H: 240,
    });
  }

  /* =====================================================================
     6 · Agentic editing (Figure 6) — recovered from the PDF
     ===================================================================== */
  function agentic(host) {
    const P = FD.fig5;
    if (!P) return;
    const CLS = { "Qwen3.5-9B": "s-base", "GRPO (unit test)": "s-grpo", "PreciseCoder-9B": "s-pc", "PreciseCoder-9B-Agent": "s-pc" };
    const p = panelHost(host, "Unit-test pass rate (%)", "five-turn agent, PDB Test");
    const F = frame(p, { x: [40, 72], y: [38, 60], xticks: [40, 45, 50, 55, 60, 65, 70], yticks: [40, 45, 50, 55, 60], xlabel: "Edit precision (%)", ratio: 0.8, xgrid: true, label: "Agentic editing: edit precision versus pass rate for 9B models" });
    const { g, sx, sy } = F;
    const by = Object.fromEntries(P.map(d => [d.name, d]));
    const a = by["PreciseCoder-9B"], b = by["PreciseCoder-9B-Agent"];
    if (a && b) {
      el("defs", {}, F.svg).innerHTML = `<marker id="arrowhead2" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L8,4L0,8z" class="arrowhead"/></marker>`;
      const x1 = sx(a.precision), y1 = sy(a.pass), x2 = sx(b.precision), y2 = sy(b.pass);
      const ang = Math.atan2(y2 - y1, x2 - x1);
      el("path", { d: `M${x1 + Math.cos(ang) * 10},${y1 + Math.sin(ang) * 10} L${x2 - Math.cos(ang) * 12},${y2 - Math.sin(ang) * 12}`, class: "arrow dashed", "marker-end": "url(#arrowhead2)" }, g);
      el("text", { x: (x1 + x2) / 2 + 8, y: (y1 + y2) / 2 + 14, class: "pt-label s-muted" }, g, "+ agentic RL");
    }
    const LBL = { "Qwen3.5-9B": [1, "start"], "GRPO (unit test)": [1, "start"], "PreciseCoder-9B": [1, "start"], "PreciseCoder-9B-Agent": [-1, "end"] };
    P.forEach(d => {
      const cx = sx(d.precision), cy = sy(d.pass), cls = CLS[d.name] || "s-muted";
      const node = d.name.endsWith("Agent")
        ? el("rect", { x: cx - 6, y: cy - 6, width: 12, height: 12, rx: 2, class: `bubble solid ${cls}` }, g)
        : el("circle", { cx, cy, r: 6, class: `bubble solid ${cls}` }, g);
      hot(node, `<b>${d.name}</b><br>Precision ${f1(d.precision)}%<br>Pass ${f1(d.pass)}%`);
      const [dx, anchor] = LBL[d.name] || [1, "start"];
      el("text", { x: cx + dx * 12, y: cy + 4, "text-anchor": anchor, class: `pt-label ${cls}` }, g, d.name);
    });
  }

  /* =====================================================================
     7 · Recall when the buggy line is quoted (Figure 7)
     ===================================================================== */
  function quote(host) {
    const rows = [
      ["Qwen3.5-4B", "s-base", 57, 44], ["4B + GRPO (unit)", "s-grpo", 66, 57], ["PreciseCoder-4B", "s-pc", 79, 65],
      ["Qwen3.5-9B", "s-base", 58, 50], ["9B + GRPO (unit)", "s-grpo", 73, 55], ["PreciseCoder-9B", "s-pc", 81, 72],
      ["GLM-5.2", "s-front", 84, 80], ["DeepSeek-V4-Pro", "s-front", 73, 58],
    ];
    legend(host, [
      { label: "every buggy line quoted in the thinking", cls: "s-ink", shape: "block" },
      { label: "not every buggy line quoted", cls: "s-ink", shape: "block faded" },
    ]);
    const p = panelHost(host, "Recall on PDB Test (%)");
    const W = Math.max(260, p.clientWidth), rowH = 34, lw = Math.min(138, W * 0.36), m = { t: 6, r: 34, b: 22, l: lw };
    const H = m.t + rows.length * rowH + m.b;
    const svg = el("svg", { width: W, height: H, viewBox: `0 0 ${W} ${H}`, class: "chart-svg", role: "img", "aria-label": "Recall with and without the buggy line quoted, per model" }, p);
    const g = el("g", {}, svg);
    const sx = lin(0, 100, m.l, W - m.r);
    [0, 25, 50, 75, 100].forEach(v => {
      el("line", { x1: sx(v), x2: sx(v), y1: m.t, y2: H - m.b, class: v ? "grid" : "axis" }, g);
      el("text", { x: sx(v), y: H - 6, "text-anchor": "middle", class: "tick" }, g, v);
    });
    rows.forEach(([name, cls, q, nq], i) => {
      const y = m.t + i * rowH + 5;
      if (i === 3 || i === 6) el("line", { x1: 8, x2: W - m.r, y1: y - 5, y2: y - 5, class: "sep" }, g);
      el("text", { x: lw - 10, y: y + 15, "text-anchor": "end", class: `row-label ${cls === "s-pc" ? "s-pc strong" : ""}` }, g, name);
      [[q, "", "quoted"], [nq, "faded", "not quoted"]].forEach(([v, extra, what], j) => {
        const r = el("rect", { x: sx(0), y: y + j * 12, width: sx(v) - sx(0), height: 10, rx: 1.5, class: `hbar ${cls} ${extra}` }, g);
        hot(r, `<b>${name}</b><br>Recall, ${what}: ${v}%<br>Gap: +${q - nq} points`);
        el("text", { x: sx(v) + 5, y: y + j * 12 + 9, class: "val small" }, g, v);
      });
    });
  }

  /* =====================================================================
     8 · No-op rate by bug-hypothesis quartile (Figure 8) — recovered
     ===================================================================== */
  function hypotheses(host) {
    const L = FD.fig7;
    if (!L) return;
    const S = [
      ["Qwen3.5-4B", "s-base", true], ["4B + GRPO (unit)", "s-grpo", true], ["PreciseCoder-4B", "s-pc", true],
      ["Qwen3.5-9B", "s-base", false], ["9B + GRPO (unit)", "s-grpo", false], ["PreciseCoder-9B", "s-pc", false],
    ];
    legend(host, [
      { label: "Base", cls: "s-base", shape: "line" },
      { label: "GRPO (unit test)", cls: "s-grpo", shape: "line" },
      { label: "PreciseCoder", cls: "s-pc", shape: "line" },
      { label: "9B solid · 4B dashed", cls: "s-muted", shape: "none" },
    ]);
    const p = panelHost(host, "No-op rate on correct code (%)", "GT Debug");
    const Q = ["lowest", "2nd", "3rd", "highest"];
    const F = frame(p, { x: [-0.25, 3.25], y: [0, 72], xticks: [0, 1, 2, 3], xfmt: i => Q[i], yticks: [0, 20, 40, 60], xlabel: "Bug hypotheses per 1k words (within-model quartile)", ratio: 0.8, m: { r: 18 }, label: "No-op rate by quartile of bug hypotheses" });
    const { g, sx, sy } = F;
    S.forEach(([name, cls, dashed]) => {
      const v = L[name];
      if (!v) return;
      const pts = v.map((y, i) => [i, y]);
      el("path", { d: pathOf(pts, sx, sy), class: `line draw ${cls} ${dashed ? "dashed-line" : ""}`, pathLength: 1 }, g);
      pts.forEach(([i, y]) => {
        const c = el("circle", { cx: sx(i), cy: sy(y), r: 3.4, class: `dot ${cls} ${dashed ? "hollow" : ""}` }, g);
        hot(c, `<b>${name}</b><br>${Q[i]} quartile: ${f1(y)}% no-op`);
      });
    });
    const pc9 = L["PreciseCoder-9B"];
    if (pc9) el("text", { x: sx(3) - 8, y: sy(pc9[3]) - 10, "text-anchor": "end", class: "pt-label s-pc" }, g, "PreciseCoder-9B");
  }

  /* ---------- mount + responsive re-render ---------- */
  /* =====================================================================
     0 · Reward-term correlations (paper Figure 2) — recovered from the PDF
     x = r(term, unit), y = r(term, −ℓ | unit = 1); points are [4B, 9B]
     ===================================================================== */
  function rewardterms(host) {
    const R = FD.rewardTerms;
    if (!R) return;
    const T = [
      { k: "unit", label: "unit test", cls: "s-grpo", lbl: [-1, -1, "end"] },
      { k: "negl", label: "−ℓ (edit size)", cls: "s-base", lbl: [1, 0, "start"] },
      { k: "prec", label: "precision", cls: "s-ea", lbl: [-1, -1, "end"] },
      { k: "rec", label: "recall", cls: "s-rec", lbl: [0, 1, "middle"] },
      { k: "f1", label: "F₁ (ours)", cls: "s-pc", lbl: [1, -1, "start"] },
    ].filter(t => R[t.k]).map(t => Object.assign(t, { pts: R[t.k] }));
    legend(host, [
      { label: "Qwen3.5-4B", cls: "s-ink", shape: "dot" },
      { label: "Qwen3.5-9B", cls: "s-ink", shape: "block" },
    ]);
    const p = panelHost(host, "Correlation with smaller edits, when passing", "fidelity");
    const F = frame(p, { x: [-0.02, 1.06], y: [-0.06, 1.1], xticks: [0, 0.2, 0.4, 0.6, 0.8, 1], xfmt: v => v.toFixed(1), yticks: [0, 0.2, 0.4, 0.6, 0.8, 1], yfmt: v => v.toFixed(1), xlabel: "Correlation with passing the unit test (stability)", ratio: 0.82, xgrid: true, label: "Correlation of each reward term with passing versus with smaller edits among passing samples" });
    const { g, sx, sy, svg } = F;
    // shaded "desired" corner: high on both axes
    el("defs", {}, svg).innerHTML = `<linearGradient id="desiredGrad" x1="0" y1="1" x2="1" y2="0"><stop offset="0" style="stop-color:var(--c-pc);stop-opacity:0"/><stop offset="1" style="stop-color:var(--c-pc);stop-opacity:.18"/></linearGradient>`;
    const g0 = el("g", {}, g);
    g.insertBefore(g0, g.firstChild);
    el("rect", { x: sx(0.55), y: sy(1.1), width: sx(1.06) - sx(0.55), height: sy(0.65) - sy(1.1), rx: 6, fill: "url(#desiredGrad)" }, g0);
    el("text", { x: sx(1.04), y: sy(1.1) + 15, "text-anchor": "end", class: "desired-label" }, g, "desired");
    const fmt = v => v.toFixed(2);
    T.forEach(t => {
      const [a, b] = t.pts;
      if (a[0] !== b[0] || a[1] !== b[1]) el("line", { x1: sx(a[0]), y1: sy(a[1]), x2: sx(b[0]), y2: sy(b[1]), class: `term-link ${t.cls}` }, g);
      t.pts.forEach(([x, y], i) => {
        const node = i === 0
          ? el("circle", { cx: sx(x), cy: sy(y), r: 5.5, class: `bubble solid ${t.cls}` }, g)
          : el("rect", { x: sx(x) - 5, y: sy(y) - 5, width: 10, height: 10, rx: 1.5, class: `bubble solid ${t.cls}` }, g);
        hot(node, `<b>${t.label}</b> · ${i ? "Qwen3.5-9B" : "Qwen3.5-4B"}<br>r with passing: ${fmt(x)}<br>r with −ℓ when passing: ${t.k === "unit" ? "n/a (constant)" : fmt(y)}`);
      });
      const [dx, dy, anchor] = t.lbl;
      const ax = t.k === "unit" ? sx(a[0]) : (sx(a[0]) + sx(b[0])) / 2, ay = (sy(a[1]) + sy(b[1])) / 2;
      el("text", { x: ax + dx * 12, y: ay + dy * 14 + 4, "text-anchor": anchor, class: `pt-label ${t.cls}` }, g, t.label);
    });
  }

  const CHARTS = { rewardterms, training, frontier, restraint, wild, swe, agentic, quote, hypotheses };
  document.querySelectorAll("[data-chart]").forEach(host => {
    const fn = CHARTS[host.dataset.chart];
    if (!fn) return;
    let lastW = 0;
    const render = () => {
      const w = host.clientWidth;
      if (!w || Math.abs(w - lastW) < 2) return;
      lastW = w;
      host.textContent = "";
      fn(host);
    };
    render();
    if ("ResizeObserver" in window) {
      let t;
      new ResizeObserver(() => { clearTimeout(t); t = setTimeout(render, 80); }).observe(host);
    }
  });
})();
