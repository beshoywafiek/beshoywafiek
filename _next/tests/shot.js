/* A tool: screenshots of the new site for review, plus the basics that
   must never regress — console errors and sideways scroll.
     node shot.js [page=/index.html] [lang=en] [w=1440] [h=900] [stops=0,1,2…|full] [out=dir]
   Behance images are served from IMG_DIR when it is set (a folder of
   <name>.webp), so the shots work without the CDN. */
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const [pg = '/index.html', lang = 'en', W = '1440', H = '900', stops = '0', out = path.join(__dirname, 'shots')] = process.argv.slice(2);
const IMG = process.env.IMG_DIR;
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch(require('../../_source/tests/browser'));
  const mobile = +W < 861;
  const ctx = await b.newContext({ viewport: { width: +W, height: +H }, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.addInitScript(l => { try { localStorage.setItem('bw_lang', l); localStorage.setItem('bw_offer_seen', String(Date.now())); } catch (e) {} }, lang);
  if (IMG) await p.route('**://mir-s3-cdn-cf.behance.net/**', r => {
    const f = path.join(IMG, path.basename(new URL(r.request().url()).pathname).replace(/\.[a-z]+$/, '.webp'));
    fs.existsSync(f) ? r.fulfill({ path: f, contentType: 'image/webp' }) : r.fulfill({ status: 404 });
  });
  await p.route('**googletagmanager**', r => r.abort());
  await p.goto('http://localhost:8090' + pg, { waitUntil: 'load' });
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(1600);
  const tag = `${pg.replace(/[\/.]/g, '_')}_${lang}_${W}`;
  const sw = await p.evaluate(() => [document.documentElement.scrollWidth, innerWidth, document.documentElement.scrollHeight]);
  if (stops === 'full') {
    await p.evaluate(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += 400) { scrollTo(0, y); await new Promise(r => setTimeout(r, 60)); } scrollTo(0, 0); });
    await p.evaluate(() => document.querySelectorAll('.rv').forEach(e => e.classList.add('in')));
    await p.waitForTimeout(800);
    await p.screenshot({ path: path.join(out, tag + '_full.jpg'), fullPage: true, type: 'jpeg', quality: 60 });
  } else {
    for (const s of stops.split(',')) {
      const y = s.includes('px') ? parseFloat(s) : parseFloat(s) * +H;
      await p.evaluate(y => scrollTo(0, y), y);
      await p.waitForTimeout(1300);
      await p.screenshot({ path: path.join(out, `${tag}_${s}.jpg`), type: 'jpeg', quality: 70 });
    }
  }
  console.log(tag, 'scrollWidth', sw[0], 'vw', sw[1], 'height', sw[2], errs.length ? 'ERRORS ' + errs.join(' | ') : 'no errors');
  await b.close();
})();
