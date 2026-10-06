/* "The work, counted" — every figure on it must be the true count.
   A number on a portfolio that does not match the work is worse than no
   number, so this recounts everything from js/projects.json (the same data
   build.py reads) and holds the page to it: the values written in the HTML,
   the value each counter LANDS on after animating, and the length of every
   bar against its neighbours. Both scripts, desktop and phone. */
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==','base64');

const P = JSON.parse(fs.readFileSync(path.join(__dirname, '../../js/projects.json'), 'utf8'));
const pieces = P.reduce((n, p) => n + p.mods.length, 0);
const disc = {}, years = {}, fmt = { l: 0, s: 0, p: 0 };
for (const p of P) {
  disc[p.cat] = (disc[p.cat] || 0) + p.mods.length;
  years[p.year] = (years[p.year] || 0) + 1;
  for (const m of p.mods) fmt[m.r < .9 ? 'p' : m.r > 1.1 ? 'l' : 's']++;
}
const discWant = Object.values(disc).sort((a, b) => b - a);
const yearWant = Object.keys(years).sort().map(y => years[y]);
const fmtWant = [fmt.l, fmt.s, fmt.p].filter(Boolean);

(async () => {
  const browser = await chromium.launch(require('./browser'));
  let fails = 0;
  const note = (ok, m) => { if (!ok) fails++; console.log((ok ? '  ok   ' : '  FAIL ') + m); };
  const same = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);

  for (const lang of ['en', 'ar']) {
    for (const [vn, w, h] of [['desktop', 1440, 900], ['phone', 390, 844]]) {
      console.log(`\n=== ${lang} / ${vn} ===`);
      const ctx = await browser.newContext({ viewport: { width: w, height: h }, isMobile: w < 700, hasTouch: w < 700,
        locale: lang === 'ar' ? 'ar-EG' : 'en-US' });
      const page = await ctx.newPage();
      const errs = [];
      page.on('pageerror', e => errs.push(String(e).slice(0, 120)));
      await page.route('**://mir-s3-cdn-cf.behance.net/**', r => r.fulfill({ status: 200, contentType: 'image/png', body: PNG }));
      await page.addInitScript(() => { try { localStorage.setItem('bw_offer_seen', String(Date.now())); } catch (e) {} });
      await page.goto('http://localhost:8099/index.html', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);

      // what the HTML says, before any animation touches it
      const html = await page.evaluate(() => {
        const nums = s => [...document.querySelectorAll(s)].map(e => +e.getAttribute('data-count'));
        return { big: +document.querySelector('.nb-big').getAttribute('data-count'),
                 across: document.querySelector('.nb-s').innerText,
                 disc: nums('.nb-bars .nb-v'), years: nums('.nb-col .nb-v'), fmt: nums('.nb-f .nb-v'),
                 startsAtZero: document.querySelector('.nb-big').textContent.trim() === '0' };
      });
      note(html.big === pieces, `headline figure is the real piece count (${html.big} of ${pieces})`);
      note(html.across.includes(String(P.length)), `and names the real project count (${P.length})`);
      note(same(html.disc, discWant), `disciplines match the work (${html.disc.join(', ')})`);
      note(same(html.years, yearWant), `years match the work (${html.years.join(', ')})`);
      note(same(html.fmt, fmtWant), `formats match the work (${html.fmt.join(', ')})`);
      note(html.startsAtZero, 'counters below the fold wait at zero');

      // scroll it in, let everything finish, and read where it landed
      await page.evaluate(() => document.getElementById('numbers').scrollIntoView({ block: 'start' }));
      await page.waitForTimeout(300);
      await page.evaluate(() => document.querySelector('.nb-c--f').scrollIntoView({ block: 'center' }));
      await page.waitForTimeout(3200);
      const end = await page.evaluate(() => {
        const txt = s => [...document.querySelectorAll(s)].map(e => +e.textContent.trim());
        const bar = s => [...document.querySelectorAll(s)].map(e => e.getBoundingClientRect());
        const de = document.documentElement;
        const sec = document.getElementById('numbers');
        const out = [...sec.querySelectorAll('*')].filter(el => {
          const b = el.getBoundingClientRect();
          return b.width > 0 && (b.right > de.clientWidth + 1 || b.left < -1);
        }).map(el => el.className).slice(0, 3);
        return { big: +document.querySelector('.nb-big').textContent.trim(),
                 vals: txt('.nb-bars .nb-v').concat(txt('.nb-col .nb-v'), txt('.nb-f .nb-v')),
                 bars: bar('.nb-bars .nb-tr i').map(b => b.width),
                 cols: bar('.nb-col .nb-tr i').map(b => b.height),
                 rtlBars: bar('.nb-bars .nb-tr i').map((b, i) => [b, document.querySelectorAll('.nb-bars .nb-tr')[i].getBoundingClientRect()]),
                 out, over: de.scrollWidth - de.clientWidth };
      });
      note(end.big === pieces, `the headline counter lands on ${end.big}`);
      note(same(end.vals, discWant.concat(yearWant, fmtWant)), 'every counter lands on its true value');
      // bar length must be proportional to the value: compare each to the longest
      const ratio = (xs, want) => xs.every((x, i) => Math.abs(x / xs[0] - want[i] / want[0]) < 0.02);
      note(end.bars.length && ratio(end.bars, discWant), `bars are drawn in proportion (${end.bars.map(Math.round).join(', ')}px)`);
      const ymax = Math.max(...yearWant), cmax = Math.max(...end.cols);
      note(end.cols.length && end.cols.every((c, i) => Math.abs(c / cmax - yearWant[i] / ymax) < 0.02),
           `columns are drawn in proportion (${end.cols.map(Math.round).join(', ')}px)`);
      // a bar starts from the side the script reads from
      const anchored = end.rtlBars.every(([b, tr]) => lang === 'ar' ? Math.abs(b.right - tr.right) < 1.5 : Math.abs(b.left - tr.left) < 1.5);
      note(anchored, `bars grow from the ${lang === 'ar' ? 'right' : 'left'}`);
      note(end.out.length === 0 && end.over <= 1, 'the section fits the screen' + (end.out.length ? ' :: ' + end.out.join(', ') : ''));
      note(errs.length === 0, 'no script errors' + (errs.length ? ' :: ' + errs[0] : ''));
      await ctx.close();
    }
  }

  // under reduced motion nothing waits at zero — the real numbers just show
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    await page.route('**://mir-s3-cdn-cf.behance.net/**', r => r.fulfill({ status: 200, contentType: 'image/png', body: PNG }));
    await page.goto('http://localhost:8099/index.html', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(400);
    const big = await page.evaluate(() => document.querySelector('.nb-big').textContent.trim());
    console.log('\n=== reduced motion ===');
    note(+big === pieces, `figures show at once (${big})`);
    await ctx.close();
  }

  await browser.close();
  console.log('\n' + (fails ? fails + ' FAILURES' : 'every figure is the true count'));
  process.exit(fails ? 1 : 0);
})();
