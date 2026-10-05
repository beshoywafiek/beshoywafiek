/* Does the moving strip actually have content inside the visible window?
   An RTL flex track with width:max-content is anchored to the RIGHT edge and
   overflows LEFT, so a negative translateX pushes it clean out of the box —
   which is why the band read as empty in Arabic. This measures it instead of
   guessing: for each strip, how many of its children overlap the strip's own
   box, sampled at several points through the animation. */
const { chromium } = require('playwright');
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==','base64');

const STRIPS = ['.mq-t', '.tick-t'];

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  let fails = 0;
  const note = (ok, m) => { if (!ok) fails++; console.log((ok ? '  ok   ' : '  FAIL ') + m); };

  for (const lang of ['en', 'ar']) {
    for (const [vn, w, h] of [['desktop', 1512, 900], ['phone', 390, 844]]) {
      console.log(`\n=== ${lang} / ${vn} ===`);
      const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, locale: lang === 'ar' ? 'ar-EG' : 'en-US' });
      const page = await ctx.newPage();
      await page.route('**://mir-s3-cdn-cf.behance.net/**', r => r.fulfill({ status: 200, contentType: 'image/png', body: PNG }));
      await page.goto('http://localhost:8099/index.html', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(600);

      const dir = await page.evaluate(() => document.documentElement.getAttribute('dir'));
      note(dir === (lang === 'ar' ? 'rtl' : 'ltr'), `document direction is ${dir}`);

      // sample the animation at a spread of progress points by freezing it
      for (const sel of STRIPS) {
        const res = [];
        for (const pct of [0, 12, 25, 50, 75, 99]) {
          const r = await page.evaluate(([sel, pct]) => {
            const t = document.querySelector(sel);
            if (!t) return null;
            const box = t.parentElement.getBoundingClientRect();
            // freeze the animation at this point in its timeline
            const an = t.getAnimations()[0];
            if (an) {
              an.pause();
              const d = an.effect.getComputedTiming().duration;
              an.currentTime = d * pct / 100;
            }
            const kids = [...t.children];
            const inside = kids.filter(k => {
              const b = k.getBoundingClientRect();
              return b.width > 0 && b.right > box.left + 1 && b.left < box.right - 1;
            }).length;
            // The strip has deliberate gaps between items, so total coverage
            // always falls short of 100%. What matters is that no single empty
            // run is wide enough to read as a hole: merge the children's
            // spans and take the largest gap left inside the box.
            const spans = kids.map(k => k.getBoundingClientRect())
              .map(b => [Math.max(b.left, box.left), Math.min(b.right, box.right)])
              .filter(([l, r]) => r > l).sort((a, b) => a[0] - b[0]);
            let cursor = box.left, void_ = 0, cov = 0;
            for (const [l, r] of spans) {
              if (l > cursor) void_ = Math.max(void_, l - cursor);
              if (r > cursor) { cov += r - Math.max(l, cursor); cursor = r; }
            }
            void_ = Math.max(void_, box.right - cursor);
            return { inside, kids: kids.length, cov: Math.round(cov / box.width * 100),
                     gap: Math.round(void_ ) };
          }, [sel, pct]);
          res.push([pct, r]);
        }
        const worst = res.reduce((a, b) => (b[1].gap > a[1].gap ? b : a));
        note(worst[1].gap <= 24, `${sel}: no hole in the strip through the loop (widest ${worst[1].gap}px at ${worst[0]}%, ${worst[1].inside}/${worst[1].kids} items in view)`);
        console.log('         ' + res.map(([p, r]) => `${p}%:${r.cov}%/${r.gap}px`).join('  '));
      }
      await ctx.close();
    }
  }
  await browser.close();
  console.log('\n' + (fails ? fails + ' FAILURES' : 'all strips stay filled'));
  process.exit(fails ? 1 : 0);
})();
