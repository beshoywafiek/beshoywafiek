/* The services dropdown, against the behaviour the APG disclosure-navigation
   pattern asks for, plus the things that actually break on real sites:
   premature closing, a trigger that is a tap trap, focus stranded on Escape. */
const { chromium } = require('playwright');
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==','base64');
const stub = p => p.route('**://mir-s3-cdn-cf.behance.net/**', r => r.fulfill({ status: 200, contentType: 'image/png', body: PNG }));

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  let fails = 0;
  const note = (ok, m) => { if (!ok) fails++; console.log((ok ? '  ok   ' : '  FAIL ') + m); };

  for (const lang of ['en', 'ar']) {
    for (const path of ['/index.html', '/work/mountain-view-club.html']) {
      console.log(`\n=== ${lang} ${path} ===`);
      const ctx = await browser.newContext({ viewport: { width: 1400, height: 880 }, locale: lang === 'ar' ? 'ar-EG' : 'en-US' });
      const page = await ctx.newPage();
      await stub(page);
      const errs = [];
      page.on('pageerror', e => errs.push(String(e).slice(0, 120)));
      await page.goto('http://localhost:8099' + path, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);

      const shape = await page.evaluate(() => {
        const t = document.querySelector('.nav-dt'), p = document.querySelector('.nav-p');
        if (!t || !p) return null;
        return { tag: t.tagName, exp: t.getAttribute('aria-expanded'),
                 controls: t.getAttribute('aria-controls'), panelId: p.id,
                 role: p.getAttribute('role'),
                 rows: p.querySelectorAll('a').length,
                 href: t.getAttribute('href') };
      });
      note(shape && shape.tag === 'BUTTON', `trigger is a button, not a link (${shape && shape.tag})`);
      note(shape && !shape.href, 'trigger does not also navigate');
      note(shape && shape.exp === 'false', 'starts closed and says so');
      note(shape && shape.controls === shape.panelId, `aria-controls points at the panel (${shape && shape.controls})`);
      note(shape && !shape.role, 'panel carries no menu role (links stay links)');
      // the panel must carry one row per service, plus the three extra links
      const want = await page.evaluate(() => document.querySelectorAll('.nav-p-r').length + 3);
      note(shape && shape.rows === want && want >= 6,
           `panel offers every service plus the extras (${shape && shape.rows} links)`);

      // --- hover opens it, and it survives the trip down to a row ---
      await page.hover('.nav-dt');
      await page.waitForTimeout(260);
      let st = await page.evaluate(() => ({
        open: document.querySelector('.nav-d').classList.contains('open'),
        exp: document.querySelector('.nav-dt').getAttribute('aria-expanded'),
        h: Math.round(document.querySelector('.nav-p').getBoundingClientRect().height),
        gap: (() => { const b = document.querySelector('.top').getBoundingClientRect();
                      const p = document.querySelector('.nav-p').getBoundingClientRect();
                      return Math.round(p.top - b.bottom); })(),
      }));
      note(st.open && st.exp === 'true', 'hover opens it');
      note(st.h > 120, `the panel has real height (${st.h}px)`);
      note(st.gap <= 2, `no dead gap under the bar for the pointer to fall through (${st.gap}px)`);

      // move the pointer down onto a row inside the panel — the classic
      // premature-close failure
      const row = await page.$('.nav-p-r');
      const box = await row.boundingBox();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.waitForTimeout(320);
      st = await page.evaluate(() => document.querySelector('.nav-d').classList.contains('open'));
      note(st, 'stays open when the pointer moves onto a row');

      // --- leaving closes it ---
      await page.mouse.move(700, 700);
      await page.waitForTimeout(420);
      st = await page.evaluate(() => document.querySelector('.nav-d').classList.contains('open'));
      note(!st, 'closes when the pointer leaves');

      // --- keyboard: open, tab in, Escape returns focus ---
      await page.evaluate(() => document.querySelector('.nav-dt').focus());
      await page.keyboard.press('Enter');
      await page.waitForTimeout(200);
      note(await page.evaluate(() => document.querySelector('.nav-d').classList.contains('open')), 'Enter opens it');
      await page.keyboard.press('Tab');
      await page.waitForTimeout(120);
      const inside = await page.evaluate(() => {
        const a = document.activeElement;
        return { inPanel: !!(a && a.closest('.nav-p')), txt: (a && a.textContent || '').trim().slice(0, 28) };
      });
      note(inside.inPanel, `Tab moves into the panel (${inside.txt})`);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);
      const esc = await page.evaluate(() => ({
        open: document.querySelector('.nav-d').classList.contains('open'),
        onTrigger: document.activeElement === document.querySelector('.nav-dt'),
      }));
      note(!esc.open, 'Escape closes it');
      note(esc.onTrigger, 'Escape puts focus back on the trigger');

      // --- the panel must not hang off the edge in either script ---
      await page.evaluate(() => document.querySelector('.nav-dt').click());
      await page.waitForTimeout(220);
      const fit = await page.evaluate(() => {
        const p = document.querySelector('.nav-p').getBoundingClientRect();
        return { left: Math.round(p.left), right: Math.round(p.right), vw: innerWidth,
                 over: Math.round(document.documentElement.scrollWidth - document.documentElement.clientWidth) };
      });
      note(fit.left >= -1 && fit.right <= fit.vw + 1, `panel sits inside the viewport (${fit.left}-${fit.right} of ${fit.vw})`);
      note(fit.over <= 1, `no horizontal overflow while open (${fit.over}px)`);
      note(errs.length === 0, 'no script errors' + (errs.length ? ' :: ' + errs[0] : ''));
      await ctx.close();
    }
  }

  // --- on a phone there is no hover; the services sit inside the full menu ---
  console.log('\n=== phone ===');
  for (const lang of ['en', 'ar']) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: lang === 'ar' ? 'ar-EG' : 'en-US' });
    const page = await ctx.newPage();
    await stub(page);
    await page.goto('http://localhost:8099/index.html', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(400);
    const hidden = await page.evaluate(() => {
      const p = document.querySelector('.nav-p');
      return !p || getComputedStyle(p).display === 'none' || p.getBoundingClientRect().height < 2;
    });
    note(hidden, `${lang}: the hover panel is not in the way on a phone`);
    await page.click('#burger');
    await page.waitForTimeout(450);
    const sub = await page.evaluate(() => {
      const s = document.querySelector('.menu-sub');
      if (!s) return null;
      const links = [...s.querySelectorAll('a')];
      const small = links.filter(a => a.getBoundingClientRect().height < 44).length;
      const de = document.documentElement;
      const out = links.filter(a => { const b = a.getBoundingClientRect();
        return b.right > de.clientWidth + 2 || b.left < -2; }).length;
      return { n: links.length, small, out, h: Math.round(s.getBoundingClientRect().height) };
    });
    const svc = await page.evaluate(() => document.querySelectorAll('.svl-r').length);
    note(sub && sub.n === svc, `${lang}: every service is listed in the menu (${sub && sub.n} of ${svc})`);
    note(sub && sub.small === 0, `${lang}: those rows are tappable` + (sub && sub.small ? ` (${sub.small} under 44px)` : ''));
    note(sub && sub.out === 0, `${lang}: and none of them hang off the edge`);
    await ctx.close();
  }

  await browser.close();
  console.log('\n' + (fails ? fails + ' FAILURES' : 'the services menu behaves'));
  process.exit(fails ? 1 : 0);
})();
