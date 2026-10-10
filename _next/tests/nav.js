/* A check: every navigation item, from every main page, on the desktop bar
   and in the phone menu, opens its own page — at the top, not scrolled to a
   section — and fast. Fails on a wrong page, a scrolled landing, a page that
   never arrives, or a click that takes longer than BUDGET ms to land. */
const { chromium } = require('playwright');
const BUDGET = 700;
const PAGES = ['index', 'about', 'work', 'archive', 'services', 'contact', 'work/kin', 'services/logo-design'];
(async () => {
  const b = await chromium.launch(require('../../_source/tests/browser'));
  let bad = 0, worst = 0;
  for (const mode of ['desktop', 'phone']) {
    const mobile = mode === 'phone';
    const ctx = await b.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 }, isMobile: mobile, hasTouch: mobile });
    // the real lag: from the click event to the new document starting
    await ctx.addInitScript(() => {
      window.__docStart = Date.now();
      document.addEventListener('click', () => { try { sessionStorage.setItem('clickAt', String(Date.now())); } catch (e) {} }, true);
    });
    await ctx.addInitScript(() => { try { localStorage.setItem('bw_offer_seen', String(Date.now())); localStorage.setItem('bw_lang', 'ar'); } catch (e) {} });
    await ctx.route('**googletagmanager**', r => r.abort());
    await ctx.route('**://mir-s3-cdn-cf.behance.net/**', r => r.abort());
    const p = await ctx.newPage();
    const errs = []; p.on('pageerror', e => errs.push(String(e)));
    for (const from of PAGES) {
      await p.goto(`http://localhost:${process.env.PORT || 8090}/${from}.html`, { waitUntil: 'load' });
      await p.waitForTimeout(250);
      const targets = await p.evaluate(m => [...document.querySelectorAll(m ? '.menu-l a' : '.hd-nav a')].map(a => a.getAttribute('href')), mobile);
      for (let i = 0; i < targets.length; i++) {
        await p.goto(`http://localhost:${process.env.PORT || 8090}/${from}.html`, { waitUntil: 'load' });
        await p.evaluate(() => scrollTo(0, 400));       // the header must work mid-page too
        await p.waitForTimeout(150);
        const want = new URL(targets[i], `http://localhost:${process.env.PORT || 8090}/${from}.html`).pathname;
        if (mobile) { await p.evaluate(() => scrollTo(0, 0)); await p.click('#burger'); await p.waitForTimeout(150); }
        else await p.evaluate(() => scrollTo(0, 0));
        const link = p.locator(mobile ? '.menu-l a' : '.hd-nav a').nth(i);
        await p.evaluate(() => sessionStorage.removeItem('clickAt'));
        const nav = p.waitForURL(u => new URL(u).pathname === want, { timeout: 5000, waitUntil: 'commit' }).then(() => true, () => false);
        await link.click();
        const arrived = await nav;
        await p.waitForLoadState('load'); await p.waitForTimeout(120);
        const ms = arrived ? await p.evaluate(() => window.__docStart - +sessionStorage.getItem('clickAt')) : -1;
        const y = await p.evaluate(() => scrollY);
        const ok = ms >= 0 && ms <= BUDGET && y === 0;
        worst = Math.max(worst, ms);
        if (!ok) { bad++; console.log(`  FAIL ${mode} ${from} -> ${want}: ${ms < 0 ? 'never arrived' : ms + 'ms'}, scrollY ${y}`); }
      }
    }
    if (errs.length) { bad++; console.log('  script errors:', errs.slice(0, 3).join(' | ')); }
    await ctx.close();
  }
  console.log(bad ? `${bad} navigation problems` : `every nav item lands on its own page, at the top; slowest click ${worst}ms`);
  await b.close();
  process.exit(bad ? 1 : 0);
})();
