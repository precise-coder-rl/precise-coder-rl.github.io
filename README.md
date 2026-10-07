# PreciseCoder project page

Static site: `index.html` plus `assets/` (`style.css`, `main.js`, `charts.js`, `figure-data.js`).

## Fill in placeholders
Edit the `CONFIG` object at the top of `assets/main.js`:
- `authors` / `affiliations`: author names, links and affiliations
- `links.paper`, `links.arxiv`, `links.code`, `links.huggingface`: empty links show as dimmed "soon" buttons
- `bibtex.author`, `bibtex.journal`, `bibtex.year`

## Figures
All figures are native SVG charts drawn by `assets/charts.js`. They pick up the page's
light/dark color tokens (`--c-*` in `style.css`) and re-render at their real width.
Data comes from Table 2 (`RESULTS` in `main.js`), numbers quoted in the paper, and
`assets/figure-data.js`, which is recovered from the PDF's vector paths:

    python3 tools/extract_figure_data.py path/to/main.pdf   # needs PyMuPDF; defaults to ./main.pdf

## Preview locally
    python3 -m http.server 8743

Deploys as-is to GitHub Pages or any static host.
