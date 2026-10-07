/* =====================================================================
   CONFIG — fill these in when ready. Empty values render as placeholders.
   ===================================================================== */
const CONFIG = {
  // e.g. { name: "Jane Doe", url: "https://...", affil: [1], equal: true }
  authors: [
    { name: "Yunkai Zhan", url: "https://mynameisjameszhan.github.io", affil: [1] },
    { name: "Miaosen Chai", url: "https://miaosenchai.com", affil: [2] },
    { name: "Shangshang Wang", url: "https://shangshang-wang.github.io/", affil: [1] },
    { name: "Jike Zhong", url: "https://jike338.github.io", affil: [1] },
    { name: "Yuqing Yang", url: "https://ayyyq.github.io", affil: [1] },
    { name: "Deqing Fu", url: "https://deqingfu.github.io", affil: [3, 1] },
    { name: "Serina Chang", url: "https://serinachang5.github.io", affil: [4] },
    { name: "Wang Bill Zhu", url: "https://billzhu.me", affil: [4] },
  ],
  // e.g. ["University X", "Lab Y"] — indices match `affil` above (1-based)
  affiliations: [
    "University of Southern California",
    "University of Chicago",
    "Google",
    "University of California, Berkeley",
  ],
  links: {
    paper: "",        // Paper PDF
    arxiv: "",        // arXiv abstract page
    code: "https://github.com/precise-coder-rl/PreciseCoder",         // GitHub repository
    huggingface: "",  // Hugging Face model
  },
  bibtex: {
    key: "precisecoder",
    author: "Zhan, Yunkai and Chai, Miaosen and Wang, Shangshang and Zhong, Jike and Yang, Yuqing and Fu, Deqing and Chang, Serina and Zhu, Wang Bill",
    journal: "",
    year: "2026",
  },
};

const ICONS = {
  paper: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/></svg>',
  arxiv: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 4l14 16M19 4L12 12M5 20l4.5-5"/></svg>',
  code: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.89 1.53 2.34 1.09 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02a9.56 9.56 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 12 2z"/></svg>',
  huggingface: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><circle cx="9" cy="10" r=".9" fill="currentColor"/><circle cx="15" cy="10" r=".9" fill="currentColor"/><path d="M8.5 14c1 1.6 2.2 2.3 3.5 2.3s2.5-.7 3.5-2.3"/></svg>',
};
const LINK_LABELS = { paper: "Paper", arxiv: "arXiv", code: "Code", huggingface: "Model" };

/* ============ Header: authors + links ============ */
function renderHeader() {
  const a = document.getElementById("authors");
  if (CONFIG.authors.length) {
    a.innerHTML = CONFIG.authors.map(p => {
      const sup = [...(p.affil || []), p.equal ? "*" : null].filter(Boolean).join(",");
      const name = p.url ? `<a href="${p.url}">${p.name}</a>` : p.name;
      return `<span>${name}${sup ? `<sup>${sup}</sup>` : ""}</span>`;
    }).join("");
  } else {
    a.innerHTML = '<span class="placeholder">author names</span>';
  }
  const f = document.getElementById("affils");
  f.innerHTML = CONFIG.affiliations.map((x, i) => `<span><sup>${i + 1}</sup>${x}</span>`).join("");

  const l = document.getElementById("links");
  l.innerHTML = Object.entries(CONFIG.links).map(([k, url]) => url
    ? `<a class="btn" href="${url}" target="_blank" rel="noopener">${ICONS[k]}${LINK_LABELS[k]}</a>`
    : `<span class="btn is-empty" aria-disabled="true">${ICONS[k]}${LINK_LABELS[k]}<span class="soon">soon</span></span>`
  ).join("");
}

/* ============ Demo (Figure 1a) ============ */
const CASES = {
  overedit: {
    inLabel: "input · buggy program",
    input: [
      { n: 4, t: "...", c: "dim" },
      { n: 5, t: "for x in set(nums):", c: "bug", tag: "bug" },
      { n: 6, t: "    d[x] += 1" },
      { n: 7, t: "    d[x + k * 2 + 1] -= 1" },
      { n: 8, t: "return max(accumulate(d))" },
    ],
    grpo: {
      lines: [
        { n: 4, t: "...", c: "dim" },
        { n: 5, t: "for x in nums:", c: "fix", tag: "fixed" },
        { n: 6, t: "    d[x] += 1" },
        { n: 7, t: "    d[x + k * 2 + 1] -= 1" },
        { n: 8, t: "max_val = 0", c: "extra", tag: "rewrite" },
        { n: 9, t: "current_val = 0 ...", c: "extra", tag: "rewrite" },
      ],
      verdict: [["good", "tests pass"], ["warn", "7 edits, 1 needed"]],
    },
    pc: {
      lines: [
        { n: 4, t: "...", c: "dim" },
        { n: 5, t: "for x in nums:", c: "fix", tag: "fixed" },
        { n: 6, t: "    d[x] += 1" },
        { n: 7, t: "    d[x + k * 2 + 1] -= 1" },
        { n: 8, t: "return max(accumulate(d))" },
      ],
      verdict: [["good", "tests pass"], ["info", "precise fix: 1 line"]],
    },
  },
  halluc: {
    inLabel: "input · correct code",
    input: [
      { n: 3, t: "...", c: "dim" },
      { n: 4, t: "def task_func(L):" },
      { n: 5, t: "    ...", c: "dim" },
      { n: 6, t: "    mean = np.mean(flattened)" },
      { n: 7, t: "    va = np.var(flattened)", c: "ok", tag: "correct" },
    ],
    grpo: {
      lines: [
        { n: 3, t: "...", c: "dim" },
        { n: 4, t: "def task_func(L):" },
        { n: 5, t: "    ...", c: "dim" },
        { n: 6, t: "    mean = np.mean(flattened)" },
        { n: 7, t: "    va = np.var(flattened, ddof=1)", c: "bad", tag: "“fixed”" },
      ],
      verdict: [["bad", "tests fail"], ["bad", "hallucinated a bug"]],
    },
    pc: {
      lines: [
        { n: 3, t: "...", c: "dim" },
        { n: 4, t: "def task_func(L):" },
        { n: 5, t: "    ...", c: "dim" },
        { n: 6, t: "    mean = np.mean(flattened)" },
        { n: 7, t: "    va = np.var(flattened)", c: "ok", tag: "kept" },
      ],
      verdict: [["good", "tests pass"], ["info", "precise answer: return unchanged"]],
    },
  },
};
const SIGN = { bug: "−", bad: "+", fix: "+", extra: "+", ok: " " };
const esc = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const lineHTML = l => `<span class="ln ${l.c || ""}"><span class="no">${l.n}</span><span class="sig">${SIGN[l.c] || " "}</span>${esc(l.t)}${l.tag ? `<span class="tag">${l.tag}</span>` : ""}</span>`;

const demo = { case: "overedit", model: "grpo" };
function renderDemo(animate) {
  const c = CASES[demo.case], out = c[demo.model];
  document.getElementById("in-label").textContent = c.inLabel;
  document.getElementById("code-in").innerHTML = c.input.map(lineHTML).join("");
  const o = document.getElementById("code-out");
  o.innerHTML = out.lines.map(lineHTML).join("");
  if (animate) { o.classList.remove("flash"); void o.offsetWidth; o.classList.add("flash"); }
  document.getElementById("verdict").innerHTML = out.verdict.map(([k, t]) => `<span class="pill ${k}">${t}</span>`).join("");
}
function initDemo() {
  document.querySelectorAll(".demo-tabs button").forEach(b => b.addEventListener("click", () => {
    document.querySelectorAll(".demo-tabs button").forEach(x => x.setAttribute("aria-selected", x === b));
    demo.case = b.dataset.case; renderDemo(true);
  }));
  document.querySelectorAll(".switch button").forEach(b => b.addEventListener("click", () => {
    document.querySelectorAll(".switch button").forEach(x => x.setAttribute("aria-checked", x === b));
    demo.model = b.dataset.model; renderDemo(true);
  }));
  renderDemo(false);
}

/* ============ Main results (Table 2) ============ */
// [pass, prec, rec, lines, noop, damage]; strings "m±s" for mean ± std
const RESULTS = {
  "Qwen3.5-4B": [
    ["Base", 36.5, 35.8, 48.5, 15.3, 30.6, 19.3],
    ["SFT", 41.2, 39.7, 54.7, 10.2, 34.9, 19.4],
    ["DPO", 51.5, 40.5, 61.2, 8.7, 30.6, 17.7],
    ["GRPO (unit test)", 55.1, 30.0, 60.1, 13.8, 19.3, 17.8],
    ["RECAP", 38.1, 59.8, 59.8, 2.9, 39.6, 18.2],
    ["EA-GRPO", 53.3, 58.6, 70.1, 3.7, 43.3, 18.8],
    ["PreciseCoder", "55.3±0.9", "64.9±1.3", "72.9±1.1", "3.0±0.1", "48.0±5.8", "13.5±1.5"],
  ],
  "Qwen3.5-9B": [
    ["Base", 41.2, 43.9, 53.1, 13.7, 36.6, 18.7],
    ["SFT", 47.9, 50.6, 63.3, 7.2, 41.0, 15.1],
    ["DPO", 56.6, 52.1, 68.6, 7.3, 41.3, 13.4],
    ["GRPO (unit test)", 63.9, 41.7, 68.4, 11.9, 30.7, 11.4],
    ["RECAP", 47.6, 66.1, 67.0, 2.7, 44.1, 15.7],
    ["EA-GRPO", 59.3, 67.0, 76.0, 3.5, 47.0, 13.5],
    ["PreciseCoder", "62.5±1.9", "67.7±1.5", "76.8±1.1", "3.0±0.1", "51.6±2.7", "11.8±0.9"],
  ],
  "Qwen3.6-27B & frontier": [
    ["Qwen3.6-27B (base)", 72.9, 49.8, 74.1, 7.4, 31.1, 15.5],
    ["PreciseCoder-27B", 77.7, 78.4, 85.0, 2.7, 47.3, 10.2],
    ["—Frontier models"],
    ["GPT-5.6 Sol (high)", 86.1, 61.5, 87.9, 4.1, 48.0, 9.3],
    ["DeepSeek-V4-Pro", 82.0, 53.5, 82.5, 5.2, 31.0, 13.4],
    ["DeepSeek-V4.1-Flash", 76.1, 57.8, 80.6, 4.8, 39.7, 21.5],
    ["Qwen3.8-Flash-Next", 75.3, 55.3, 78.2, 5.2, 22.1, 17.9],
  ],
};
window.RESULTS = RESULTS; // shared with charts.js
const LOWER_BETTER = [false, false, false, true, false, true];
const BAR_MAX = [100, 100, 100, 16, 100, 25];
const num = v => typeof v === "number" ? v : parseFloat(v);

function renderTable(key) {
  const rows = RESULTS[key];
  const data = rows.filter(r => r.length > 1);
  const best = LOWER_BETTER.map((lo, j) => {
    const vals = data.map(r => num(r[j + 1]));
    return lo ? Math.min(...vals) : Math.max(...vals);
  });
  document.querySelector("#res-table tbody").innerHTML = rows.map(r => {
    if (r.length === 1) return `<tr class="sep"><td colspan="7">${r[0].slice(1)}</td></tr>`;
    const ours = r[0].startsWith("PreciseCoder");
    const cells = r.slice(1).map((v, j) => {
      const n = num(v);
      const [m, s] = String(v).split("±");
      const w = Math.min(100, (n / BAR_MAX[j]) * 100);
      return `<td class="${n === best[j] ? "best" : ""}"><span class="cell"><span>${Number(m).toFixed(1)}${s ? `<span class="sd">±${s}</span>` : ""}</span><span class="bar"><i style="width:${w}%"></i></span></span></td>`;
    }).join("");
    return `<tr class="${ours ? "ours" : ""}"><td>${r[0]}</td>${cells}</tr>`;
  }).join("");
}
function initTable() {
  const tabs = document.getElementById("res-tabs");
  tabs.innerHTML = Object.keys(RESULTS).map((k, i) => `<button role="tab" aria-selected="${i === 0}" data-k="${k}">${k}</button>`).join("");
  tabs.querySelectorAll("button").forEach(b => b.addEventListener("click", () => {
    tabs.querySelectorAll("button").forEach(x => x.setAttribute("aria-selected", x === b));
    renderTable(b.dataset.k);
  }));
  renderTable(Object.keys(RESULTS)[0]);
}

/* ============ Weak-to-strong (Table 4) ============ */
const W2S = [
  { name: "Qwen3.5-9B", note: "own base, prefilled", pass: 17.1, prec: 14.5 },
  { name: "Qwen3.6-27B", note: "continues thinking", pass: 4.3, prec: 11.1 },
  { name: "Qwen3.8-Flash-Next", note: "continues thinking", pass: 0.6, prec: 5.6 },
  { name: "DeepSeek-V4.1-Flash", note: "continues thinking", pass: -1.5, prec: 5.5 },
  { name: "Qwen3.8-Max", note: "trace in user turn", pass: -0.7, prec: 12.4 },
  { name: "GPT-5.6 Sol (high)", note: "trace in user turn", pass: 1.2, prec: 4.6 },
  { name: "Qwen3.6-27B", note: "control: untrained 9B trace", pass: -7.4, prec: 2.6 },
];
function renderW2S() {
  const MIN = -9, MAX = 19, span = MAX - MIN;
  const pos = v => ((v - MIN) / span) * 100;
  const zero = pos(0);
  const bar = (v, cls) => {
    const left = v >= 0 ? zero : pos(v);
    const w = Math.abs(v) / span * 100;
    const lbl = (v > 0 ? "+" : v < 0 ? "−" : "") + Math.abs(v).toFixed(1);
    const vx = v >= 0 ? `left:calc(${zero + w}% + 5px)` : `right:calc(${100 - pos(v)}% + 5px)`;
    return `<div class="w2s-track" style="--zero:${zero}%"><span class="b ${cls}" data-w="${w}" style="left:${left}%;width:0"></span><span class="v" style="${vx}">${lbl}</span></div>`;
  };
  const el = document.getElementById("w2s-chart");
  el.innerHTML = `<div class="w2s-legend"><span><i style="background:var(--blue)"></i>Δ edit precision</span><span><i style="background:var(--ink-3)"></i>Δ pass rate</span><span style="color:var(--ink-3)">points vs. receiver's own reasoning</span></div>` +
    W2S.map(r => `<div class="w2s-row"><div class="name">${r.name}<small>${r.note}</small></div><div class="tracks">${bar(r.prec, "prec")}${bar(r.pass, "pass")}</div></div>`).join("");
}
function growW2S() {
  document.querySelectorAll("#w2s-chart .b").forEach(b => { b.style.width = b.dataset.w + "%"; });
}

/* ============ BibTeX ============ */
function renderBib() {
  const b = CONFIG.bibtex;
  const txt = `@article{${b.key},
  title   = {Rewards Beyond Test Passing: Towards Generalizable Fidelity in LLM Debugging},
  author  = {${b.author}},
  journal = {${b.journal}},
  year    = {${b.year}}
}`;
  document.getElementById("bib-text").textContent = txt;
  const btn = document.getElementById("copy-bib");
  btn.addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(txt); btn.textContent = "copied"; }
    catch { btn.textContent = "select & copy"; }
    setTimeout(() => (btn.textContent = "copy"), 1600);
  });
}

/* ============ Math ============ */
function renderMath() {
  if (!window.katex) return;
  document.querySelectorAll(".tex, .tex-block").forEach(el => {
    try { katex.render(el.textContent, el, { displayMode: el.classList.contains("tex-block"), throwOnError: false }); } catch {}
  });
}

/* ============ Scroll reveal ============ */
function initReveal() {
  const targets = document.querySelectorAll("main > section:not(.hero) .sec-head, .diff-stage, .fig, .steps li, .table-wrap, .callout, .w2s, .bigrams, .takeaway blockquote, .bib-box");
  if (!("IntersectionObserver" in window)) { growW2S(); return; }
  targets.forEach(t => t.classList.add("reveal"));
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add("in");
    if (e.target.classList.contains("w2s")) setTimeout(growW2S, 250);
    io.unobserve(e.target);
  }), { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
  targets.forEach(t => io.observe(t));
}

renderHeader();
initDemo();
initTable();
renderW2S();
renderBib();
renderMath();
initReveal();
