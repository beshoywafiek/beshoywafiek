# The new site (in progress)

A separate project, built from scratch, beside the live site. The live site
at the repository root is not touched by anything in here.

- **Same content:** `build.py` reads `_source/content.py`, `_source/meta.py`
  and `js/projects.json`, so copy is still edited in one place.
- **Pages:** Home, About, Projects (all work), Archive (ten projects),
  Services and Contact, each its own page in the navigation, plus a page per
  project and per service.
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
TIGHT=6 node _next/tests/overlap.js 1440 ar              # no text touches other text
node _next/tests/notfound.js                             # the 404 page works at any deployment path
node _next/tests/images.js                               # project images: local, mapped, viewer fallback
```

`_next/` starts with an underscore, so GitHub Pages does not publish it.
When the owner approves the design, the plan is to make this the generator
for the root and port the 15 gates to it.

The 404 page carries its own stylesheet, script and logo, and its links find
the site's root at runtime, because GitHub Pages serves it for any missing
address at any depth. It works at `/beshoy-wafiek/`, `/beshoywafiek/` or a
domain root without a rebuild.

## Project images

Every project image the pages show is served from the site itself:
`_next/media/work/<slug>/` (normal size) and `.../sm/` (thumbnails), 893 WebP
files downloaded once from Behance and verified (sizes match Behance, each in
its own project's folder, thumbnails match their normal image). So the
portfolio does not go blank if Behance blocks hotlinking or a project is
re-uploaded there. Only the very large size in the image viewer still loads
from Behance, and falls back to the local normal size if Behance fails.
`og:image` stays on Behance until the final site URL is set, because it has to
be an absolute URL.

Adding a project to `js/projects.json`: the build stops and lists the images
it is missing; `python3 _next/fetch_images.py` downloads exactly those, then
build again. Do not use Git LFS for these: GitHub Pages does not serve LFS
files.
