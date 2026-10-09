# The new site (in progress)

A separate project, built from scratch, beside the live site. The live site
at the repository root is not touched by anything in here.

- **Same content:** `build.py` reads `_source/content.py`, `_source/meta.py`
  and `js/projects.json`, so copy is still edited in one place.
- **New design:** light paper and ink with the brand orange, giant type
  (Archivo Expanded for English, Alexandria for Arabic), a horizontal work
  reel, a hover index of every project, stacking service cards, an image
  trail in the hero, a custom cursor and page transitions. Arabic and
  English, RTL throughout, its own phone layout.

```bash
python3 _next/build.py                    # -> _next/site/
cd _next/site && python3 -m http.server 8090
node _next/tests/shot.js /index.html en 1440 900 0,1,2   # screenshots
node _next/tests/wide.js /index.html ar                  # sideways scroll
node _next/tests/interact.js                             # the interactive parts
```

`_next/` starts with an underscore, so GitHub Pages does not publish it.
When the owner approves the design, the plan is to make this the generator
for the root and port the 15 gates to it.
