# beshoywafiek.github.io — project instructions

> **بالعربي:** الملف ده مش ليك — ده للـ AI اللي هيشتغل على الموقع بعد كده.
> Claude Code بيقراه لوحده أول ما يفتح المشروع، علشان ميرجعش يعمل غلطات
> اتصلحت قبل كده. سيبه مكانه ولو عدّلت حاجة كبيرة في الموقع، قوله يحدّثه.

A bilingual (AR/EN) static portfolio for Beshoy Wafiek, a Cairo brand designer.
Hosted on GitHub Pages. No framework, no bundler, no build step at runtime — a
Python script generates static HTML at author time.

## Commands

Run from the repository root. Python 3 is required; `npm install` is only for
Playwright, which only the tests need.

```bash
npm run build                    # regenerate every page from _source/
npm run serve                    # serve on :8099 — the gates need this running
npm test                         # all 16 gates — MUST be green before shipping
```

Those are `python3 _source/build.py`, `python3 -m http.server 8099` and
`node _source/tests/check.js`. `npm test` works from any directory — `check.js`
runs each gate from its own folder. Every gate gets Chromium from
`_source/tests/browser.js`: `CHROME_PATH` if set, else the Claude sandbox's
build, else Playwright's own (on your own computer, install it once with
`npx playwright install chromium`).

## Layout

**The published site lives at the REPOSITORY ROOT**, because that is where
GitHub Pages serves it from. Do not move it into a subfolder — the live URLs
break.

```
index.html  work.html  404.html   GENERATED
css/  js/                         GENERATED (copied from _source/src/)
work/  services/                  GENERATED (25 case studies + 3 service pages)
sitemap.xml  robots.txt           GENERATED
images/                           AUTHORED — build.py never touches it.
                                  Logo, favicon, profile photo, og.jpg.
_source/build.py      the generator (~1100 lines)
_source/content.py    ALL site copy and settings — the file the owner edits
_source/meta.py       project names, order, categories, and the per-project STORY
_source/icons.py      the icon set, normalised to one grid
_source/icons-drawn.py the previous hand-drawn set — history, nothing imports it
_source/src/style.css authored stylesheet  → copied to css/
_source/src/site.js   authored JS          → copied to js/
_source/tests/*.js    the 16 gates (the list is in check.js), plus tools that
                      are NOT gates: fps.js, iso.js (performance), nojs.js
                      (the page with JavaScript off), norm.js (icon normaliser)
_config.yml           keeps _source/ and the docs off the live site
```

`_source/` is not published: GitHub Pages' default Jekyll build skips any
directory whose name starts with an underscore, and `_config.yml` lists it
explicitly too. Do not rename `_source/` without the underscore, and do not add
a `.nojekyll` file — either one puts the generator, the tests and the owner's
guide on the public website.

Everything marked GENERATED is overwritten by `npm run build`. Edit `_source/`
only — a hand-edit to a root page, to `css/style.css` or to `js/site.js` is
silently lost on the next build. That is the single easiest way to waste an
hour on this project: the root files look authored, and they are not.

`build.py` works out where to write by looking for `js/` beside itself or in
its parent, so it is safe to run from this layout or from a flat dev folder.

## Design skills

`.claude/skills/` holds design skills the owner chose (impeccable, ui-ux-pro-max,
taste-skill and its presets, Emil Kowalski's motion skills); sources, licences
and what was left out are in `.claude/skills/README.md`. Use them for taste,
direction and critique. **Where a skill's defaults clash with this file, this
file wins** — every rule below is a measurement on this page. In particular:
no framework, bundler or Tailwind (the site is static HTML from `build.py`);
no blur, backdrop-filter, blend modes or masks on full-viewport layers; never
split Arabic text into letters; both languages and RTL for everything; and no
invented testimonials, metrics or client claims, however a skill frames them.
Skills that write `PRODUCT.md`, `DESIGN.md` or `design-system/` at the root are
fine — `_config.yml` keeps those off the live site.

---

# Rules that were learned the hard way

Each line below cost real debugging. They are not style preferences — every one
is a measurement, and several describe bugs that were introduced twice.

## Performance: what this page cannot afford

Measured on this page, not in general:

- **No `filter: blur()`, no `backdrop-filter`, no `mix-blend-mode`, no
  `mask-image`** on any hero or full-viewport layer. Two full-screen mask
  layers took the page from **61fps to 18**. The one surviving
  `backdrop-filter` is on `.top.stuck`, a small static bar — that one is fine.
- **The number of stacked full-viewport composited layers is itself the cost.**
  With every hero layer on: 49.6fps. Switching off *any single one* of them:
  60fps. The fix was merging two layers, not optimising one. If you add a
  full-screen layer to the hero, re-measure with `node iso.js`.
- **A gradient "pool" is rasterised small and scaled up by the compositor.**
  Growing `.orb` from 340px to 560px dropped the desktop from 59fps to 46.
  Keep the element small and raise `scale()` in the keyframes instead.
- Budget to hold: **≥55fps desktop, ≥55fps on a 4×-CPU-throttled phone**, idle
  and while scrolling. `node fps.js` measures it.

## RTL — this site is Arabic-first

- **A `width: max-content` flex track anchors to the side the script starts
  from.** In Arabic that is the RIGHT, and it overflows LEFT. A negative
  `translateX` therefore carries it clean off-screen: the marquee and the stats
  ticker rendered as **empty black bands** in Arabic for a whole release.
  Arabic needs its own keyframe moving the other way (`slide-r`), never
  `animation-direction: reverse`.
- **`left: -9999px` widens the page in RTL** — a negative offset overflows the
  way the page already scrolls. It made the document **9,940px wide**. Use the
  clip pattern (`clip-path: inset(50%)` + 1×1 + `overflow:hidden`).
- **Every arrow is one glyph with the class `.ar-x`,** mirrored by a single
  `html[dir="rtl"] .ar-x` rule. Do not add a per-component mirror rule — that
  is how new components ended up pointing the wrong way.
- Logical properties (`inset-inline-*`, `padding-inline-*`) everywhere. The
  burger sits at the inline start: left in English, right in Arabic.
- Latin runs inside Arabic text need `direction: ltr; unicode-bidi: isolate`,
  or `$180+` renders as `+$180`.

## CSS traps specific to this file

- **`overflow-x: clip` belongs on `body`, NEVER on `html`** — on `html` it
  kills every `position: sticky` descendant.
- **Appending a rule at the end of the stylesheet beats the media queries above
  it.** An unscoped `padding-block` added at the bottom silently shrank the
  phone tap targets from 44px back to 31. Desktop-only rules go inside
  `@media (min-width: 861px)`.
- **Scope descendant selectors.** `.nav a { text-align: center }` also matched
  every row inside the services dropdown and centred all of it. Use `.nav > a`.
- **`justify-content: center` on an overflowing column puts the first item
  above the scroll origin,** where no scrolling reaches it — measured at
  −87px in the mobile menu. Use `margin-block: auto` on the inner list.
- An **IntersectionObserver must never observe an element that `clip-path` has
  collapsed to zero** — it reports ratio 0 forever and nothing ever reveals.
  Put the reveal clip on the `img`, not on the observed box.
- `.r-bleed` needs `width: auto`. `width: 100%` plus negative margins shifts
  an element without widening it.

## JS traps

- **Never call `getBoundingClientRect` inside a scroll or pointermove
  handler.** Cache the rects; refresh them on scroll/resize via rAF.
- **A mobile browser fires `resize` when its address bar hides, with the SAME
  width.** Rebuilding on that reset the hero orb to the centre every time the
  page was touched — it read as broken. A rebuild requires `innerWidth` to have
  actually changed; `orientationchange` is handled separately.
- **Canvas: pre-render glyphs/sprites once to an atlas.** Per-frame `fillText`
  was the single most expensive thing on the page.
- **Never accumulate a translucent fill over a canvas to fade it.** It drags
  the hero off its own background colour and leaves permanent ghosts (8-bit
  alpha never rounds to zero). Keep the still frame offscreen and repair from
  it.
- The hero canvas must map the pointer through the **canvas** rect, not the
  hero's — the canvas is inset −7%, and using the wrong one put the lens up to
  300px from the cursor.
- Everything animated stops on `IntersectionObserver` exit and on
  `visibilitychange`, is frame-rate capped, and renders one still frame under
  `prefers-reduced-motion`.

## The build must be deterministic

- **Never use `hash()` on a string in `build.py`.** Python randomises `str`
  hashing per process, so `seed = hash(num) % 29` gave the three service pages
  a *different* project strip on every single build. A rebuild that changed
  nothing produced a 126-line diff on three files, which makes a real edit
  indistinguishable from noise. Use `int(num)` or another stable value.
- Same for anything else that varies per run: dict/set iteration order you did
  not sort, `random`, or a timestamp finer than the date. `node det.js` builds
  twice and compares every generated file.

## The gates must measure what the visitor sees

- **A text range's box is the font's full height, not the glyphs'.** Cairo's
  is 1.87em; the headline is set at .94, so its boxes reach far past its
  letters. `clip.js` and `audit.js` compared those boxes and failed on empty
  font padding — but only where Google Fonts actually loaded. A sandbox that
  could not reach the fonts fell back to a shorter font and stayed green. Both
  gates now trim each box to the real ink (canvas `measureText`). Never "fix"
  a gate by blocking the web fonts: it would then test a font nobody sees.
- **When you change a gate, break the page on purpose and watch it fail.**
  The ink fix was checked that way: removing the headline mask's padding
  still fails `clip.js` (the tail of the p in "speaks"), and pushing the lead
  into the title still fails `audit.js`. A gate that cannot fail checks nothing.
- **`fps.js` numbers from the Claude sandbox are noise.** It has no GPU; the
  same code measured 40 to 53fps on the desktop run across three tries. Judge
  the performance budget on a real machine.

## Icons: judge them rendered, at 34px

- **The icon row looked mixed because of line weight, not solid vs outline.**
  The docs blamed the two outline icons for being outlines; rendering the set
  showed `IDENTITY` and `D_PALETTE` at a 2.13 line (they filled in at 34px) and
  three filled icons at about 0.85. `norm.js` had ignored a transform nested
  inside the exported SVG. Fixed in `norm.js`, and all seven now sit at 1.6 —
  the numbers and why are at the top of `icons.py`.

## Motion and the infographic

- **"The work, counted" (`numbers()` in `build.py`) is counted from `P` at
  build time — never type one of its figures.** `nb.js` recounts from
  `js/projects.json` and fails on any mismatch, including where a counter
  lands after animating. Counters start from zero only when JS runs, motion
  is allowed and the block is below the fold; the real number is in the HTML.
- **The 1px-gap grids (`.inc`, `.steps`, `.dv`, `.nb-g`) draw their hairlines
  on the cards (a 1px solid shadow), not as the grid's background.** As a
  background, every row the cards did not fill — 6 deliverables in 4 columns
  on a service page — showed as a solid grey slab, and so did any card fading
  in. Cards in these grids stay put; their children rise.
- **The crossing bands (`.kb`) follow the strip rules:** Arabic has its own
  keyframes (`slide-r`, `slide-r-back`), they only run while on screen
  (`.run`), and `rtl.js` checks both stay filled. Arabic gets a fill, not
  `-webkit-text-stroke` — an outline draws every join inside connected letters.
- **Split text into whole words, never letters** (`words()`): splitting Arabic
  into letters breaks the joins between them.
- Magnetic buttons use the separate `translate` property so they add to the
  hover lift in `transform`, and read the rect on `pointerenter`, never in
  `pointermove`.

## Content rules — do not break these

- **Never invent a client testimonial.** `content.py → PROOF` is empty on
  purpose. A quote attributed to a named client that the owner did not say is a
  fabricated endorsement, and the people deceived are his prospective clients.
  It stays empty until he supplies real ones.
- **Never invent project outcomes or metrics.** `meta.py → STORY` uses
  *The challenge / The approach / Delivered*. "Delivered" is deliberate:
  what shipped is a fact (piece counts, formats) that can be stated truthfully.
  A result needs numbers from the client.
- **Never type a count that can be derived.** The description said "27
  published projects" for weeks after two were removed. Counts come from the
  real list via `seo()` in `build.py`.
- Both languages, always. Copy lives as `(ar, en)` tuples in `content.py` and
  renders through `bi()`. Arabic is Egyptian colloquial, matching his voice.

## Things that are correct and look like bugs

- 25 images carry `alt=""` — they are decorative row artwork inside
  `aria-hidden="true"`, plus the logo beside the text name. Correct.
- No `hreflang` — both languages live on one URL, toggled client-side.
- The services dropdown trigger is a `<button>`, not a link, deliberately:
  `aria-expanded` on a link confuses screen reader users, and a control that
  both navigates and discloses is a tap trap. The panel's "All services" row
  is the link.
- Process steps have no icons. The numbers are the visual; this was a
  judgement, not an omission.

---

# Known open items (need the owner, not code)

1. **`FORM_ENDPOINT` in `content.py` is empty** — the lead form falls back to
   WhatsApp and nothing is recorded. Setup steps are in `HOW-TO-EDIT.md`.
   It must be deployed under *his* Google account.
2. **No custom domain yet.** `SITE` in `content.py` is the one line to change.
3. **71 of 73 homepage images are hotlinked from Behance's CDN.** If Behance
   ever blocks hotlinking, the portfolio goes blank. The fix is downloading the
   images into `images/`; he has to do it, the CDN is not reachable from a
   sandbox.
4. **The hero headline is spaced wider than its CSS says.** `.mega .ln` pads
   each line and hands the space back with negative margins, but the margins of
   neighbouring lines collapse into one, so only part of it comes back. Measured
   line pitch: 1.28em in English (CSS says .94) and 1.58em in Arabic (CSS says
   1.12) — 52px and 72px extra per line on a desktop. The comment in
   `style.css` claims "nothing moves"; it does. Fixing it (e.g. making `.mega`
   a flex column, where margins do not collapse) visibly tightens the
   headline, so it is his design call, not a silent fix.

---

# Before you ship anything

```bash
npm run build && npm test     # with `npm run serve` up in another shell
```

All 16 gates must print green. They exist because each one caught a real bug:
layout, clipped text, the RTL strips, arrow direction, the services list, the
dropdown's keyboard behaviour, the phone menu fitting, the hero lens tracking,
a desktop + phone audit (contrast, tap targets, overflow, collisions), every
internal link actually followed, the spam honeypot, the address-bar resize, the
offer's memory, the contact features, the build being deterministic, and
the infographic's figures being the true counts.

If you change something a gate covers, update the gate — do not delete it.
