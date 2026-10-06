/* The new services list, the mobile header balance, and the offer switch. */
const { chromium } = require('playwright');
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==','base64');
const stub = p => p.route('**://mir-s3-cdn-cf.behance.net/**', r => r.fulfill({ status: 200, contentType: 'image/png', body: PNG }));

(async () => {
  const browser = await chromium.launch(require('./browser'));
  let fails = 0;
  const note = (ok, m) => { if (!ok) fails++; console.log((ok ? '  ok   ' : '  FAIL ') + m); };

  // ---------- services accordion ----------
  for (const lang of ['en', 'ar']) {
    for (const [vn, w, h] of [['desktop', 1512, 900], ['phone', 390, 844]]) {
      console.log(`\n=== services ${lang} / ${vn} ===`);
      const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, locale: lang === 'ar' ? 'ar-EG' : 'en-US' });
      const page = await ctx.newPage();
      await stub(page);
      const errs = [];
      page.on('pageerror', e => errs.push(String(e).slice(0, 140)));
      await page.goto('http://localhost:8099/index.html', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(700);
      await page.evaluate(() => document.getElementById('services').scrollIntoView());
      await page.waitForTimeout(600);

      const init = await page.evaluate(() => {
        const rows = [...document.querySelectorAll('.svl-r')];
        return rows.map(r => {
          const p = r.querySelector('.svl-p');
          const cs = getComputedStyle(p);
          return { on: r.classList.contains('on'), h: Math.round(p.getBoundingClientRect().height),
                   vis: cs.visibility, exp: r.querySelector('.svl-h').getAttribute('aria-expanded'),
                   items: p.querySelectorAll('.svl-inc li').length,
                   shots: p.querySelectorAll('.svl-ph a').length };
        });
      });
      // counted, not hard-coded: the list of services is his to change
      note(init.length >= 3, `every service is listed (${init.length})`);
      note(init[0].on && init[0].h > 160 && init[0].vis === 'visible',
           `first one opens on arrival (${init[0].h}px, ${init[0].items} deliverables, ${init[0].shots} work shots)`);
      note(init.slice(1).every(r => !r.on && r.h < 2 && r.vis === 'hidden'),
           'the rest are collapsed and out of the tab order');
      note(init.every(r => r.items === 6), 'every service lists its deliverables');
      note(init.every(r => r.shots >= 1), 'every service shows real work');

      // open the third, which should close the first
      await page.evaluate(() => document.querySelectorAll('.svl-h')[2].click());
      await page.waitForTimeout(750);
      const after = await page.evaluate(() => {
        const rows = [...document.querySelectorAll('.svl-r')];
        return rows.map(r => ({ on: r.classList.contains('on'),
                                h: Math.round(r.querySelector('.svl-p').getBoundingClientRect().height),
                                exp: r.querySelector('.svl-h').getAttribute('aria-expanded') }));
      });
      note(after[2].on && after[2].h > 160, `opening one expands it (${after[2].h}px)`);
      note(!after[0].on && after[0].h < 2, 'and closes the one that was open');
      note(after.filter(r => r.on).length === 1, 'only ever one open at a time');
      note(after.every(r => r.exp === String(r.on)), 'aria-expanded tracks the state');

      // close it again by tapping the same header
      await page.evaluate(() => document.querySelectorAll('.svl-h')[2].click());
      await page.waitForTimeout(750);
      const shut = await page.evaluate(() => Math.round(document.querySelectorAll('.svl-p')[2].getBoundingClientRect().height));
      note(shut < 2, `tapping again closes it (${shut}px)`);

      // nothing in the section may stick out of the viewport
      const over = await page.evaluate(() => {
        const de = document.documentElement;
        return [...document.querySelectorAll('#services *')].filter(el => {
          const b = el.getBoundingClientRect();
          return b.width > 0 && (b.right > de.clientWidth + 2 || b.left < -2);
        }).map(el => el.className).slice(0, 3);
      });
      note(over.length === 0, 'the section fits the viewport' + (over.length ? ' :: ' + over.join(', ') : ''));
      note(errs.length === 0, 'no script errors' + (errs.length ? ' :: ' + errs[0] : ''));

      // every control is a comfortable tap target on a phone
      if (vn === 'phone') {
        const small = await page.evaluate(() => [...document.querySelectorAll('.svl-h, .svl-a a')]
          .map(el => { const b = el.getBoundingClientRect(); return { c: el.className, h: Math.round(b.height) }; })
          .filter(x => x.h > 0 && x.h < 44));
        note(small.length === 0, 'tap targets are 44px or more' + (small.length ? ' :: ' + JSON.stringify(small) : ''));
      }
      await ctx.close();
    }
  }

  // ---------- mobile header balance ----------
  console.log('\n=== mobile header ===');
  for (const lang of ['en', 'ar']) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, locale: lang === 'ar' ? 'ar-EG' : 'en-US' });
    const page = await ctx.newPage();
    await stub(page);
    await page.goto('http://localhost:8099/index.html', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(450);
    const r = await page.evaluate(() => {
      const b = s => document.querySelector(s).getBoundingClientRect();
      const bu = b('#burger'), br = b('.brand'), lg = b('#lang');
      const rtl = document.documentElement.getAttribute('dir') === 'rtl';
      const start = rtl ? bu : bu, end = lg;
      return { rtl,
               burgerStart: rtl ? Math.round(innerWidth - bu.right) : Math.round(bu.left),
               langEnd: rtl ? Math.round(lg.left) : Math.round(innerWidth - lg.right),
               gapBefore: rtl ? Math.round(bu.left - br.right) : Math.round(br.left - bu.right),
               gapAfter: rtl ? Math.round(br.left - lg.right) : Math.round(lg.left - br.right),
               burgerH: Math.round(bu.height), brandW: Math.round(br.width),
               overlap: Math.round(Math.min(bu.right, br.right) - Math.max(bu.left, br.left)) };
    });
    note(r.overlap <= 0, `${lang}: the burger and the name do not touch (${r.overlap}px)`);
    note(Math.abs(r.gapBefore - r.gapAfter) < 26, `${lang}: the name sits centred (${r.gapBefore}px / ${r.gapAfter}px either side)`);
    note(r.burgerH >= 44, `${lang}: burger is a real tap target (${r.burgerH}px)`);
    console.log(`         burger ${r.burgerStart}px from the start edge, lang ${r.langEnd}px from the end`);
    await ctx.close();
  }

  // ---------- the offer switch ----------
  console.log('\n=== offer ===');
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    await stub(page);
    await page.goto('http://localhost:8099/index.html', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);
    note(await page.evaluate(() => document.getElementById('pop').classList.contains('on')), 'shows on a first visit');
    await page.evaluate(() => document.getElementById('popSkip').click());
    await page.waitForTimeout(500);

    await page.goto('http://localhost:8099/work.html', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);
    note(!await page.evaluate(() => document.getElementById('pop').classList.contains('on')), 'stays away once dismissed');

    await page.goto('http://localhost:8099/index.html?offer', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);
    note(await page.evaluate(() => document.getElementById('pop').classList.contains('on')), '?offer brings it back for a check');
    await ctx.close();
  }
  // shown once per visit, not on every page, even before it is dismissed
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    await stub(page);
    await page.goto('http://localhost:8099/index.html', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);
    await page.goto('http://localhost:8099/work.html', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);
    note(!await page.evaluate(() => document.getElementById('pop').classList.contains('on')),
         'not shown again on the next page of the same visit');
    await ctx.close();
  }

  await browser.close();
  console.log('\n' + (fails ? fails + ' FAILURES' : 'all good'));
  process.exit(fails ? 1 : 0);
})();
