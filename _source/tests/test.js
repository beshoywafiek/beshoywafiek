/* Layout and behaviour check in a real browser.
   The Behance CDN is unreachable from this container, so the images do not
   load here — but every <img> carries width/height, which gives the browser
   the aspect ratio up front. That means the geometry measured below is the
   geometry the visitor will get, and any layout shift would show up as a
   mismatch between the reserved box and the final one. */
const { chromium } = require('playwright');

const VIEWS = [
  { name: 'desktop', width: 1512, height: 900 },
  { name: 'laptop',  width: 1280, height: 800 },
  { name: 'tablet',  width: 820,  height: 1180 },
  { name: 'phone',   width: 390,  height: 844 },
];

const PAGES = [
  ['home',   '/index.html'],
  ['work',   '/work.html'],
  ['case',   '/work/mountain-view-club.html'],
  ['case2',  '/work/yalla-masyaf.html'],
  ['case3',  '/work/yalla-masyaf.html'],
];

// the Behance CDN is unreachable from this container, so stand in a real
// (tiny) PNG for every image request — the boxes are sized by CSS anyway,
// but this makes the measurements match what a visitor actually gets
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64');
const stub = (page) => page.route('**://mir-s3-cdn-cf.behance.net/**',
  r => r.fulfill({ status: 200, contentType: 'image/png', body: PNG }));

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  let fails = 0;
  const note = (ok, msg) => { if (!ok) fails++; console.log((ok ? '  ok   ' : '  FAIL ') + msg); };

  for (const v of VIEWS) {
    console.log('\n=== ' + v.name + '  ' + v.width + 'x' + v.height + ' ===');
    const ctx = await browser.newContext({ viewport: { width: v.width, height: v.height },
      deviceScaleFactor: 2, locale: 'en-US' });
    const page = await ctx.newPage();
    await stub(page);

    for (const [label, path] of PAGES) {
      const errs = [];
      page.on('pageerror', e => errs.push(String(e).slice(0, 120)));
      page.on('console', m => { if (m.type() === 'error' && !/Failed to load|ERR_/.test(m.text())) errs.push(m.text().slice(0, 120)); });
      await page.goto('http://localhost:8099' + path, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(450);

      const r = await page.evaluate(() => {
        const de = document.documentElement;
        const over = de.scrollWidth - de.clientWidth;
        // anything sticking out past the viewport
        const wide = [...document.querySelectorAll('body *')].filter(el => {
          const b = el.getBoundingClientRect();
          return b.width > 0 && (b.right > de.clientWidth + 2 || b.left < -2);
        }).slice(0, 4).map(el => el.className + '|' + Math.round(el.getBoundingClientRect().right));
        // an invisible layer swallowing taps was a real bug on this project
        const mid = document.elementFromPoint(de.clientWidth / 2, de.clientHeight / 2);
        const figs = document.querySelectorAll('.fig').length;
        const zero = [...document.querySelectorAll('.fig, .tile, .wrow')]
          .filter(el => el.getBoundingClientRect().height < 4).length;
        const menuHidden = (() => { const m = document.getElementById('menu');
          return !m || getComputedStyle(m).display === 'none'; })();
        return { over, wide, mid: mid ? (mid.className || mid.tagName) : 'none',
                 figs, zero, menuHidden, lang: de.getAttribute('lang'), dir: de.getAttribute('dir'),
                 h: document.body.scrollHeight };
      });

      note(r.over <= 1, `${label}: no horizontal overflow (${r.over}px)` + (r.wide.length ? ' :: ' + r.wide.join(', ') : ''));
      note(r.zero === 0, `${label}: no collapsed cards (${r.zero})`);
      note(r.menuHidden, `${label}: mobile menu not blocking (${r.mid})`);
      note(errs.length === 0, `${label}: no script errors` + (errs.length ? ' :: ' + errs[0] : ''));
      note(r.lang === 'en' && r.dir === 'ltr', `${label}: language detected (${r.lang}/${r.dir})`);
      console.log(`         height ${r.h}px, ${r.figs} figures`);
      page.removeAllListeners('pageerror'); page.removeAllListeners('console');
    }
    await ctx.close();
  }

  // --- behaviour checks on one desktop context ---
  console.log('\n=== behaviour ===');
  const ctx = await browser.newContext({ viewport: { width: 1512, height: 900 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await stub(page);

  await page.goto('http://localhost:8099/work/mountain-view-club.html', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(300);
  await page.click('.fig');
  await page.waitForTimeout(400);
  let lb = await page.evaluate(() => {
    const l = document.querySelector('.lb');
    return l ? { open: !l.hidden, cap: l.querySelector('.lb-c').textContent,
                 src: (l.querySelector('img').getAttribute('src') || '').split('/').slice(-2, -1)[0] } : null;
  });
  note(lb && lb.open, 'lightbox opens on click');
  note(lb && /3840|2800|fs|1400/.test(lb.src), 'lightbox loads the large variant (' + (lb && lb.src) + ')');
  await page.keyboard.press('ArrowRight'); await page.waitForTimeout(200);
  const cap2 = await page.evaluate(() => document.querySelector('.lb-c').textContent);
  note(cap2 === '2 / 24', 'lightbox arrow key advances (' + cap2 + ')');
  await page.keyboard.press('Escape'); await page.waitForTimeout(350);
  note(await page.evaluate(() => document.querySelector('.lb').hidden), 'lightbox closes on Escape');

  // reveal + progress after scrolling
  await page.evaluate(() => window.scrollTo(0, 2200));
  await page.waitForTimeout(500);
  const scrolled = await page.evaluate(() => ({
    revealed: document.querySelectorAll('.rv.in').length,
    total: document.querySelectorAll('.rv').length,
    prog: getComputedStyle(document.querySelector('.prog')).transform,
    stuck: document.querySelector('.top').classList.contains('stuck'),
  }));
  note(scrolled.revealed > 0, `reveals fire on scroll (${scrolled.revealed}/${scrolled.total})`);
  note(scrolled.prog !== 'none' && !/matrix\(0,/.test(scrolled.prog), 'progress bar advances');
  note(scrolled.stuck, 'header goes to its scrolled state');

  // language toggle
  await page.goto('http://localhost:8099/index.html', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(250);
  await page.click('#lang'); await page.waitForTimeout(200);
  const after = await page.evaluate(() => {
    const de = document.documentElement;
    const arVisible = [...document.querySelectorAll('.mega .ar')].some(el => getComputedStyle(el).display !== 'none');
    const enVisible = [...document.querySelectorAll('.mega .en')].some(el => getComputedStyle(el).display !== 'none');
    return { lang: de.getAttribute('lang'), dir: de.getAttribute('dir'), arVisible, enVisible,
             wa: document.getElementById('waBtn').href };
  });
  note(after.lang === 'ar' && after.dir === 'rtl', 'toggle switches to Arabic RTL');
  note(after.arVisible && !after.enVisible, 'only one language is visible at a time');
  note(/%D8/.test(after.wa), 'WhatsApp message is written in the active language');

  // the mobile menu actually opens and does not block the page when closed
  await ctx.close();
  const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 });
  const mp = await mctx.newPage();
  await stub(mp);
  await mp.goto('http://localhost:8099/index.html', { waitUntil: 'domcontentloaded' });
  await mp.waitForTimeout(250);
  const blocked = await mp.evaluate(() => {
    const el = document.elementFromPoint(195, 600);
    return el ? (el.className || el.tagName) : 'none';
  });
  note(!/menu/.test(String(blocked)), 'closed menu does not swallow taps (' + blocked + ')');
  await mp.click('#burger'); await mp.waitForTimeout(450);
  const open = await mp.evaluate(() => {
    const m = document.getElementById('menu');
    return { vis: !m.hidden && getComputedStyle(m).opacity === '1',
             links: m.querySelectorAll('a').length };
  });
  note(open.vis, 'burger opens the menu');
  note(open.links >= 4, 'menu has its links (' + open.links + ')');
  await mctx.close();

  await browser.close();
  console.log('\n' + (fails ? fails + ' FAILURES' : 'all checks passed'));
  process.exit(fails ? 1 : 0);
})();
