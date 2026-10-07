# PreciseCoder — Project Page

Source for **https://precise-coder-rl.github.io**, the project page for
*Rewards Beyond Test Passing: Towards Generalizable Fidelity in LLM Debugging*.

Code: [precise-coder-rl/PreciseCoder](https://github.com/precise-coder-rl/PreciseCoder)

## Structure

```
index.html                    page content
assets/style.css              layout, typography, color tokens
assets/main.js                CONFIG (authors, links, BibTeX), results table, demo
assets/charts.js              SVG charts for every figure
assets/figure-data.js         plotted data recovered from the paper PDF (generated)
tools/extract_figure_data.py  regenerates figure-data.js
```

No build step: the site is plain HTML, CSS and JavaScript, served as-is by GitHub Pages
from the `main` branch.

## Preview locally

```bash
python3 -m http.server 8743
```

Then open http://localhost:8743. Open the page through a server rather than by
double-clicking `index.html`, so the scripts load correctly.

## Editing

**Authors, links and citation** live in the `CONFIG` object at the top of `assets/main.js`:

- `authors` / `affiliations`: names, homepage links and affiliation numbers
- `links.arxiv`, `links.code`, `links.huggingface`: an empty link shows as a dimmed "soon" button
- `bibtex`: key, authors, venue and year

**Text** is in `index.html`. After changing a CSS or JS file, bump the `?v=` number on its
`<link>` / `<script>` tag so browsers don't serve a cached copy.

## Figures

Every figure is drawn natively as SVG by `assets/charts.js`, using the page's fonts and
color tokens (`--c-*` in `style.css`), and re-rendered at its actual width so text stays
legible on phones. Data comes from three places:

- the main results table (`RESULTS` in `assets/main.js`)
- numbers quoted in the paper text
- `assets/figure-data.js`, recovered from the vector paths of the paper's figures

To regenerate `figure-data.js` after the paper's figures change (requires
[PyMuPDF](https://pymupdf.readthedocs.io)):

```bash
python3 tools/extract_figure_data.py path/to/main.pdf
```

The paper PDF itself is not committed (`.gitignore`).
