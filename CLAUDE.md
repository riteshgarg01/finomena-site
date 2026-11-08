# finomenahq.com

Public website for Finomena, served by GitHub Pages from `main` (CNAME finomenahq.com). This repo is public:
nothing private goes in it.

## Before changing anything
Read the private brief at `~/Projects/Finomena-marketing/website-brief.md`. It holds the product facts we may
claim, naming, navigation decisions, voice and the list of things never to say. Update it when a decision changes.

## How the site is built
- One file, `index.html`: CSS in `<head>`, pages as `<div data-page="...">`. Every page has a real URL
  (`/auto-gst/`, `/insights/<article>/`, `/industries/<id>/`); old `#route` links still work and move to the real URL.
  The router is in the main `<script>`; in-site links are written `#route` and turned into real URLs at runtime.
- **After every change to index.html run `python3 tools/build_pages.py`** and commit what it writes. It copies
  index.html to `<route>/index.html` for every entry in the `pageMeta` block (title + description per page),
  and writes `sitemap.xml`, `robots.txt` and `404.html`. Never edit the generated copies.
- A new page needs a `pageMeta` entry (title, description) or it gets no URL of its own.
- Catalogues in the script drive the menus, cards, footer and form options:
  `SOLUTIONS` (products, `status:'live'|'soon'`), `INDUSTRIES` (industry pages).
  Insights articles are `<article class="post" data-article="...">` blocks inside the insights page.
- `finance-landscape.js` draws the finance back-office map (mounted on About us at `#finance-map`).
- Colours and fonts are tokens on `:root`; reuse existing classes (`.sol`, `.steps`, `.feat-grid`, `.myth`,
  `.cta`, `.board`) before adding new ones.
- Campaign links: `?c=`, `?for=`, `utm_*` go into the lead form's hidden fields. `VISIT_LOG` stays false until
  the lead-form Apps Script handles `type=visit`.

## Checking a change
`python3 tools/build_pages.py`, then `python3 -m http.server 8765` and open http://localhost:8765/. Check every route you touched on desktop and at
phone width (headless Chrome won't go below ~500px; use a 390px iframe), and that the console shows no errors.

## Publishing
Pushing `main` makes it live. Preview first and push only when the user says "push the site".
Never commit target-account lists, contact codes or anything from `~/Projects/Finomena-marketing`.
Older drafts in `archive/` are local only (excluded in `.git/info/exclude`).
