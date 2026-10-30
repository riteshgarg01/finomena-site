"""Build a self-contained finance back-office map (one HTML file) from a finance-map.yaml.

The website renders finance-map.yaml live; this makes a single file for a client workshop, a meeting without
internet, or an email: the YAML, the renderer (finance-map.js) and js-yaml are all inlined.

    python3 tools/build_map.py "<path>/finance-map.yaml" "<path>/finance-map.html"

Edit the YAML, run this again, and the map follows. Needs only the Python standard library.
"""
import html
import re
import sys
from pathlib import Path

SITE = Path(__file__).resolve().parent.parent


def meta_of(yaml_text: str) -> dict:
    """title, org_context and open_questions from the meta block (no YAML library needed for these)."""
    out = {"open_questions": []}
    block = re.search(r"^meta:\n((?:[ \t]+.*\n|\n)+)", yaml_text, re.M)
    body = block.group(1) if block else ""
    for key in ("title", "org_context"):
        m = re.search(rf'^\s+{key}:\s*"?(.*?)"?\s*$', body, re.M)
        if m:
            out[key] = m.group(1)
    q = re.search(r"^\s+open_questions:\n((?:\s+- .*\n)+)", body, re.M)
    if q:
        out["open_questions"] = [re.sub(r'^\s+- "?|"?\s*$', "", line) for line in q.group(1).splitlines() if line.strip()]
    return out


def build(data_path: Path, out_path: Path):
    yaml_text = data_path.read_text(encoding="utf-8")
    meta = meta_of(yaml_text)
    js = (SITE / "finance-map.js").read_text(encoding="utf-8")
    lib = (SITE / "vendor" / "js-yaml.min.js").read_text(encoding="utf-8")
    title = meta.get("title", "Finance back-office map")
    questions = "".join(f"<li>{html.escape(q)}</li>" for q in meta["open_questions"])
    yaml_safe = yaml_text.replace("</script", "<\\/script")  # keep the data block from closing early
    page = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{html.escape(title)} · Finomena</title>
<style>
:root{{--teal:#0f7f82;--teal-deep:#0c4a50;--teal-wash:#e3f2f1;--amber:#c97f1a;--ink:#0d2326;--ink-2:#3e5559;--ink-3:#6b7f82;
  --line:#ece4e4;--sunk:#f7f1f1;--bg:#fffafa;--ok:#1f8a5b}}
*{{box-sizing:border-box}}
body{{margin:0;background:var(--bg);color:var(--ink);font:15px/1.5 "Source Sans 3","Segoe UI",system-ui,sans-serif}}
.wrap{{max-width:1320px;margin:0 auto;padding:28px clamp(16px,3vw,36px) 48px}}
.eyebrow{{font:600 .72rem ui-monospace,monospace;letter-spacing:.12em;text-transform:uppercase;color:var(--teal)}}
h1{{font-size:clamp(1.6rem,3vw,2.3rem);margin:6px 0 4px;letter-spacing:-.01em}}
.lede{{color:var(--ink-2);margin:0 0 22px;max-width:62ch}}
.qs{{margin-top:26px;border-top:1px solid var(--line);padding-top:14px;font-size:.88rem;color:var(--ink-2)}}
.qs b{{display:block;margin-bottom:4px;color:var(--ink)}}
footer{{margin-top:18px;font-size:.78rem;color:var(--ink-3)}}
</style>
</head>
<body>
<div class="wrap">
  <span class="eyebrow">Finomena · finance back-office map</span>
  <h1>{html.escape(title)}</h1>
  <p class="lede">{html.escape(meta.get("org_context", ""))}. Click a card for where agents can act; switch on <b>Where Finomena runs today</b> to see what is live. Dashed cards are still to be confirmed.</p>
  <div data-finance-map></div>
  {f'<div class="qs"><b>Open questions</b><ul>{questions}</ul></div>' if questions else ''}
  <footer>Built from {html.escape(data_path.name)}. Edit the YAML and rebuild to update this map.</footer>
</div>
<script type="text/yaml" id="finance-map-data">
{yaml_safe}
</script>
<script>{lib}</script>
<script>{js}</script>
</body>
</html>
"""
    out_path.write_text(page, encoding="utf-8")
    print(f"Wrote {out_path} ({len(page) // 1024} KB)")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    build(Path(sys.argv[1]), Path(sys.argv[2]))
