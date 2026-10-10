/* A tool, not a gate: does the PHONE layout still match a reference copy of
   the site? The owner wants the phone experience kept exactly as it is while
   the desktop is redesigned, so every desktop change is checked against it.

   Serve the reference on another port (e.g. a `git worktree` of main on
   8098) and the working copy on 8099, then:
       node mobcmp.js [refPort=8098] [newPort=8099]
   It captures each page full-length at 390px in both languages, with the
   Behance images stubbed and all motion settled, and reports the share of
   pixels that differ. Anything above the noise floor is printed with the
   y-range where the difference sits, and a diff image is written. */
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const zlib = require('zlib');
const PNG1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
const REF = process.argv[2] || '8098', NEW = process.argv[3] || '8099';
const PAGES = ['/index.html', '/work.html', '/work/mountain-view-club.html', '/services/social-media.html'];
const OUT = path.join(__dirname, 'shots', 'mobcmp');

async function shoot(browser, port, page_, lang) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1,
    isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
  const p = await ctx.newPage();
  await p.addInitScript(l => { try { localStorage.setItem('bw_lang', l); localStorage.setItem('bw_offer_seen', String(Date.now())); } catch (e) {} }, lang);
  await p.route('**://mir-s3-cdn-cf.behance.net/**', r => r.fulfill({ status: 200, contentType: 'image/png', body: PNG1 }));
  await p.goto(`http://localhost:${port}${page_}`, { waitUntil: 'load' });
  await p.evaluate(() => document.fonts.ready);
  await p.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}' });
  await p.evaluate(() => document.querySelectorAll('.up,.rv,.mega').forEach(e => e.classList.add('in')));
  // lazy images load only near the viewport, so one capture would have them
  // and the other not: load every one before comparing
  await p.evaluate(async () => { document.querySelectorAll('img[loading="lazy"]').forEach(i => { i.loading = 'eager'; });
    await Promise.all([...document.images].map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; }))); });
  await p.waitForTimeout(500);
  const buf = await p.screenshot({ fullPage: true });
  const size = await p.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.scrollHeight]);
  await ctx.close();
  return { buf, size };
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch(require('./browser'));
  const cmp = await browser.newPage();
  let worst = 0;
  for (const lang of ['ar', 'en']) {
    for (const pg of PAGES) {
      const a = await shoot(browser, REF, pg, lang), b = await shoot(browser, NEW, pg, lang);
      // compare in a canvas: share of pixels whose channels differ by > 24
      const r = await cmp.evaluate(async ([A, B]) => {
        const load = s => new Promise(res => { const i = new Image(); i.onload = () => res(i); i.src = 'data:image/png;base64,' + s; });
        const [ia, ib] = await Promise.all([load(A), load(B)]);
        const w = Math.min(ia.width, ib.width), h = Math.min(ia.height, ib.height);
        const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
        x.drawImage(ia, 0, 0); const da = x.getImageData(0, 0, w, h).data;
        x.clearRect(0, 0, w, h); x.drawImage(ib, 0, 0); const db = x.getImageData(0, 0, w, h).data;
        const out = x.createImageData(w, h); let n = 0, y0 = -1, y1 = -1;
        for (let i = 0; i < da.length; i += 4) {
          const d = Math.max(Math.abs(da[i] - db[i]), Math.abs(da[i + 1] - db[i + 1]), Math.abs(da[i + 2] - db[i + 2]));
          const y = Math.floor(i / 4 / w);
          if (d > 24) { n++; out.data[i] = 255; out.data[i + 3] = 255; if (y0 < 0) y0 = y; y1 = y; }
          else { out.data[i] = out.data[i + 1] = out.data[i + 2] = db[i] * .25; out.data[i + 3] = 255; }
        }
        x.putImageData(out, 0, 0);
        return { share: n / (w * h), y0, y1, hA: ia.height, hB: ib.height, png: n ? c.toDataURL('image/png').split(',')[1] : null };
      }, [a.buf.toString('base64'), b.buf.toString('base64')]);
      const tag = `${lang}${pg.replace(/[\/.]/g, '_')}`;
      const pct = (r.share * 100).toFixed(3);
      const sameH = r.hA === r.hB;
      worst = Math.max(worst, r.share + (sameH ? 0 : 1));
      if (r.png) fs.writeFileSync(path.join(OUT, tag + '.png'), Buffer.from(r.png, 'base64'));
      console.log(`  ${r.share < 0.0005 && sameH ? 'same ' : 'DIFF '} ${lang} ${pg.padEnd(32)} ${pct}% of pixels` +
        (sameH ? '' : `, height ${r.hA} -> ${r.hB}`) + (r.y0 >= 0 ? `, y ${r.y0}-${r.y1}` : ''));
    }
  }
  await browser.close();
  console.log(worst < 0.0005 ? '\nthe phone layout matches the reference' : '\nthe phone layout differs — see shots/mobcmp/');
  process.exit(0);
})();
