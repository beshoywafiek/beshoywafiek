/* A check: does any text touch other text? Every visible text line is
   trimmed to its real ink (canvas measureText, so Arabic dots and tall
   letters count), then every pair of lines is compared. Also flags lines
   whose ink sits closer than GAP px to a neighbouring line.
     node overlap.js [width=1440] [lang=ar] [pages…]
   Exit 1 when anything overlaps. */
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const W = +(process.argv[2] || 1440), LANG = process.argv[3] || 'ar';
const PAGES = process.argv.slice(4).length ? process.argv.slice(4) :
  ['/index.html', '/about.html', '/work.html', '/archive.html', '/services.html', '/contact.html',
   '/work/kin.html', '/work/nabae-alaser.html', '/services/social-media.html'];
const IMG = process.env.IMG_DIR, TIGHT = +(process.env.TIGHT || 0);
(async () => {
  const b = await chromium.launch(require('../../_source/tests/browser'));
  const mobile = W < 861;
  let bad = 0;
  for (const pg of PAGES) {
    const ctx = await b.newContext({ viewport: { width: W, height: 900 }, isMobile: mobile, hasTouch: mobile, reducedMotion: 'reduce' });
    const p = await ctx.newPage();
    await p.addInitScript(l => { try { localStorage.setItem('bw_lang', l); localStorage.setItem('bw_offer_seen', String(Date.now())); } catch (e) {} }, LANG);
    if (IMG) await p.route('**://mir-s3-cdn-cf.behance.net/**', r => {
      const f = path.join(IMG, path.basename(new URL(r.request().url()).pathname).replace(/\.[a-z]+$/, '.webp'));
      fs.existsSync(f) ? r.fulfill({ path: f, contentType: 'image/webp' }) : r.fulfill({ status: 404 });
    });
    await p.route('**googletagmanager**', r => r.abort());
    const res = await p.goto('http://localhost:8090' + pg, { waitUntil: 'load' }).catch(() => null);
    if (!res || res.status() !== 200) { console.log('  skip', pg); await ctx.close(); continue; }
    await p.evaluate(() => document.fonts.ready);
    await p.waitForTimeout(900);
    const found = await p.evaluate((TIGHT) => {
      const cv = document.createElement('canvas').getContext('2d');
      const lines = [];
      const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = tw.nextNode())) {
        let t = n.textContent.trim();
        if (!t) continue;
        const el = n.parentElement;
        if (el.closest('details:not([open])') && !el.closest('summary')) continue;
        if (el.closest('[hidden], .menu, .offer, .lb, .cur, .mq, script, style, .sr, .skip, .hp, .hero-trail')) continue;
        const cs = getComputedStyle(el);
        if (cs.visibility === 'hidden' || +cs.opacity === 0 || cs.color === 'rgba(0, 0, 0, 0)') continue;
        if (cs.textTransform === 'uppercase') t = t.toUpperCase();
        cv.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
        const m = cv.measureText(t);
        const fa = m.fontBoundingBoxAscent, fd = m.fontBoundingBoxDescent;
        const r = document.createRange(); r.selectNodeContents(n);
        for (const q of r.getClientRects()) {
          if (q.width < 2 || q.height < 2) continue;
          // the inline box is the font's content area; keep only the ink
          const scale = q.height / (fa + fd);
          const top = q.top + (fa - m.actualBoundingBoxAscent) * scale;
          const bot = q.bottom - (fd - m.actualBoundingBoxDescent) * scale;
          let clipped = false;
          for (let a = el; a && a !== document.body; a = a.parentElement) {
            const s = getComputedStyle(a);
            if (s.overflow !== 'visible') { const ar = a.getBoundingClientRect(); if (q.right < ar.left || q.left > ar.right || q.bottom < ar.top || q.top > ar.bottom) clipped = true; break; }
          }
          if (clipped) continue;
          lines.push({ el, t: t.slice(0, 40), l: q.left, r: q.right, top, bot, y: q.top + scrollY });
        }
      }
      const out = [];
      for (let i = 0; i < lines.length; i++) for (let j = i + 1; j < lines.length; j++) {
        const a = lines[i], c = lines[j];
        const ox = Math.min(a.r, c.r) - Math.max(a.l, c.l);
        const oy = Math.min(a.bot, c.bot) - Math.max(a.top, c.top);
        if (ox > 2 && oy > 1.5) out.push(`overlap ${oy.toFixed(1)}px at y=${Math.round(a.y)}: "${a.t}"  ×  "${c.t}"`);
        // different blocks whose ink nearly touches read as one: flag them too
        else if (TIGHT && ox > 2 && a.el !== c.el && !a.el.contains(c.el) && !c.el.contains(a.el) && oy > -TIGHT)
          out.push(`tight ${(-oy).toFixed(1)}px at y=${Math.round(a.y)}: "${a.t}"  ×  "${c.t}"`);
      }
      return out.slice(0, 12);
    }, TIGHT);
    if (found.length) { bad += found.length; console.log(`  FAIL ${pg} [${W} ${LANG}]`); found.forEach(f => console.log('     ', f)); }
    else console.log(`  ok   ${pg} [${W} ${LANG}]`);
    await ctx.close();
  }
  await b.close();
  process.exit(bad ? 1 : 0);
})();
