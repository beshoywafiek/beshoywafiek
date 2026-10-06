/* A sweep of both, because "it looks fine" is not a measurement.

   Checks, on every page type, both languages, phone and desktop:
     - real text contrast, sampled against what is ACTUALLY painted behind
       each run of text (gradients and a canvas sit behind most of this page,
       so a CSS background-color lookup would be a lie)
     - tap targets under 44px
     - anything outside the viewport, and horizontal overflow
     - text boxes overlapping each other
     - images with no width/height, which shift the layout as they load
     - script errors
*/
const { chromium } = require('playwright');
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==','base64');

const PAGES = [
  ['home',    '/index.html'],
  ['work',    '/work.html'],
  ['service', '/services/brand-identity.html'],
  ['case',    '/work/mountain-view-club.html'],
];
const VIEWS = [
  ['desktop', 1512, 900, false],
  ['phone',   390,  844, true],
];

const lum = (r, g, b) => {
  const f = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  let fails = 0;
  const note = (ok, m) => { if (!ok) fails++; console.log((ok ? '  ok   ' : '  FAIL ') + m); };

  for (const [vn, w, h, mob] of VIEWS) {
    for (const lang of ['en', 'ar']) {
      console.log(`\n=== ${vn} / ${lang} ===`);
      const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1,
        isMobile: mob, hasTouch: mob, locale: lang === 'ar' ? 'ar-EG' : 'en-US' });
      const page = await ctx.newPage();
      await page.route('**://mir-s3-cdn-cf.behance.net/**', r => r.fulfill({ status: 200, contentType: 'image/png', body: PNG }));
      await page.addInitScript(() => { try { localStorage.setItem('bw_offer_seen', String(Date.now())); } catch (e) {} });

      for (const [label, path] of PAGES) {
        const errs = [];
        page.on('pageerror', e => errs.push(String(e).slice(0, 110)));
        await page.goto('http://localhost:8099' + path, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(1100);

        // --- geometry, in the page ---
        const geo = await page.evaluate(() => {
          const de = document.documentElement;
          const vis = el => {
            const cs = getComputedStyle(el);
            if (cs.display === 'none' || cs.visibility === 'hidden') return false;
            let o = 1, n = el;
            while (n && n !== document.body) { o *= parseFloat(getComputedStyle(n).opacity); n = n.parentElement; }
            return o > 0.15;
          };
          const out = { over: de.scrollWidth - de.clientWidth, outside: [], small: [], noDim: [], overlap: [] };

          document.querySelectorAll('body *').forEach(el => {
            if (!vis(el)) return;
            const b = el.getBoundingClientRect();
            if (b.width < 1 || b.height < 1) return;
            if (el.closest('.mq,.tick,.hero-fx,.hero-bgw,.hero-sheen,.lb')) return;   // strips overflow on purpose
            if (b.right > de.clientWidth + 2 || b.left < -2)
              out.outside.push((el.className || el.tagName) + ' ' + Math.round(b.left) + '→' + Math.round(b.right));
          });

          /* Interactive things must be comfortable to hit — but 44px is the
             guideline for a THUMB. On a mouse the floor is 24px (WCAG 2.2 AA).
             And something that cannot receive a pointer at all is not a target:
             the channel rows measured 39px while the button was shut, which is
             a closed menu, not a small button. */
          const touch = matchMedia('(pointer: coarse)').matches;
          const MIN = touch ? 44 : 24;
          document.querySelectorAll('a,button,input,select,textarea,[role="button"]').forEach(el => {
            if (!vis(el)) return;
            const b = el.getBoundingClientRect();
            if (b.width < 1 || b.height < 1) return;
            if (el.closest('.mq,.tick,.menu[hidden]')) return;
            if (getComputedStyle(el).pointerEvents === 'none') return;
            let n = el, dead = false;
            while (n && n !== document.body) {
              if (getComputedStyle(n).pointerEvents === 'none') { dead = true; break; }
              n = n.parentElement;
            }
            if (dead) return;
            if (b.height < MIN || b.width < 24)
              out.small.push((el.className || el.tagName).toString().slice(0, 26) + ' ' + Math.round(b.width) + 'x' + Math.round(b.height));
          });

          // an image with no intrinsic size shifts everything under it on load
          document.querySelectorAll('img').forEach(el => {
            if (!el.getAttribute('width') || !el.getAttribute('height'))
              out.noDim.push(el.className || el.src.split('/').pop());
          });

          /* Two runs of text sitting on top of each other — compared by INK,
             not by box. Several things here deliberately have a box larger
             than their text: the headline's reveal mask is padded by an em so
             it cannot clip a descender, and a collapsed panel keeps its
             position while showing nothing. Comparing boxes flagged all of
             those and none of them were real. */
          const inkOf = el => {
            // union of the TEXT NODES' line boxes. Selecting the element's
            // contents includes inline padding, and the headline's reveal
            // mask pads by a third of an em — enough to look like a collision
            // with the pill above it when there are 153px of clear air.
            const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
            let t = null, n;
            while ((n = w.nextNode())) {
              if (!n.nodeValue.trim()) continue;
              const r = document.createRange(); r.selectNodeContents(n);
              for (const q of r.getClientRects()) {
                if (q.width < 1 || q.height < 1) continue;
                t = t ? { top: Math.min(t.top, q.top), bottom: Math.max(t.bottom, q.bottom),
                          left: Math.min(t.left, q.left), right: Math.max(t.right, q.right) }
                      : { top: q.top, bottom: q.bottom, left: q.left, right: q.right };
              }
            }
            return t ? { ...t, width: t.right - t.left, height: t.bottom - t.top }
                     : { top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0 };
          };
          const texts = [...document.querySelectorAll('h1,h2,h3,p,li,span.wrow-t,.svl-t,.nav-p-x b')]
            .filter(el => vis(el) && el.textContent.trim() && el.getBoundingClientRect().width > 20)
            .map(el => ({ el, b: inkOf(el) }))
            .filter(t => t.b.width > 20 && t.b.height > 4);
          for (let i = 0; i < texts.length; i++)
            for (let j = i + 1; j < texts.length; j++) {
              const A = texts[i], B = texts[j];
              if (A.el.contains(B.el) || B.el.contains(A.el)) continue;
              const ox = Math.min(A.b.right, B.b.right) - Math.max(A.b.left, B.b.left);
              const oy = Math.min(A.b.bottom, B.b.bottom) - Math.max(A.b.top, B.b.top);
              if (ox > 8 && oy > 8)
                out.overlap.push((A.el.className || A.el.tagName) + ' x ' + (B.el.className || B.el.tagName));
            }
          return out;
        });

        note(geo.over <= 1, `${label}: no horizontal overflow (${geo.over}px)`);
        note(geo.outside.length === 0, `${label}: nothing hangs off the edge` + (geo.outside.length ? ' :: ' + geo.outside.slice(0, 3).join(', ') : ''));
        note(geo.small.length === 0, `${label}: every control is tappable` + (geo.small.length ? ` :: ${geo.small.length} too small: ` + geo.small.slice(0, 3).join(', ') : ''));
        note(geo.noDim.length === 0, `${label}: every image reserves its space` + (geo.noDim.length ? ` :: ${geo.noDim.length} without width/height` : ''));
        note(geo.overlap.length === 0, `${label}: no text sitting on other text` + (geo.overlap.length ? ' :: ' + [...new Set(geo.overlap)].slice(0, 3).join(', ') : ''));
        note(errs.length === 0, `${label}: no script errors` + (errs.length ? ' :: ' + errs[0] : ''));

        /* --- contrast, sampled from the real pixels ---
           Everything that drifts is paused first, and the lens is parked in a
           corner. Sampling a moving composition made this gate flaky: the same
           page passed alone and failed in a batch, because a screenshot could
           land with the lens rim behind a line of text. A flaky gate is worse
           than no gate — it trains you to re-run until it is green. */
        await page.addStyleTag({ content: '*,*::before,*::after{animation-play-state:paused !important;transition:none !important}' });
        await page.mouse.move(w - 12, 8);
        await page.waitForTimeout(700);

        /* One at a time: scrolling each element into view inside a single
           evaluate() left every earlier element's coordinates pointing at
           where it used to be, so the crops were sampled from whatever had
           scrolled into that spot. That is what produced a 1.4:1 reading for
           text that actually sits at 6:1. */
        const SEL = ['h1.mega', '.hero-sub', '.kick span', '.shead h2', '.note', '.svl-t', '.svl-d',
                     '.svl-inc li', '.wrow-t', '.me-copy p', '.end h2', '.tick-t', '.nav a', '.brand',
                     '.cs-lead', '.inc li', '.step p', '.ft a'];
        const low = [];
        for (const sel of SEL) {
          const s = await page.evaluate(q => {
            const el = document.querySelector(q);
            if (!el) return null;
            const b0 = el.getBoundingClientRect();
            if (b0.width < 8 || b0.height < 6) return null;
            el.scrollIntoView({ block: 'center' });
            const r = el.getBoundingClientRect();
            if (r.top < 4 || r.bottom > innerHeight - 4) return null;
            return { colour: getComputedStyle(el).color,
                     x: Math.round(r.left + Math.min(r.width / 2, 60)),
                     y: Math.round(r.top + r.height / 2) };
          }, sel);
          if (!s) continue;
          await page.waitForTimeout(90);
          const shot = await page.screenshot({ clip: { x: Math.max(0, s.x - 22), y: Math.max(0, s.y - 9), width: 44, height: 18 } });
          const bg = await page.evaluate(async b64 => {
            const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
            const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
            c.getContext('2d').drawImage(img, 0, 0);
            const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
            // the darkest decile is the background behind light text
            const px = []; for (let i = 0; i < d.length; i += 4) px.push([d[i], d[i + 1], d[i + 2]]);
            px.sort((a, b2) => (a[0] + a[1] + a[2]) - (b2[0] + b2[1] + b2[2]));
            const k = px[Math.floor(px.length * 0.12)];
            return { r: k[0], g: k[1], b: k[2] };
          }, shot.toString('base64'));
          const m = s.colour.match(/\d+/g).map(Number);
          const L1 = lum(m[0], m[1], m[2]), L2 = lum(bg.r, bg.g, bg.b);
          const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
          if (ratio < 4.5) low.push(`${sel} ${ratio.toFixed(1)}:1`);
        }
        note(low.length === 0, `${label}: text contrast clears 4.5:1` + (low.length ? ' :: ' + low.join(', ') : ''));

        page.removeAllListeners('pageerror');
      }
      await ctx.close();
    }
  }

  await browser.close();
  console.log('\n' + (fails ? fails + ' FAILURES' : 'desktop and phone both clean'));
  process.exit(fails ? 1 : 0);
})();
