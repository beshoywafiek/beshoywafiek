// A tool: list elements wider than the viewport (the cause of sideways scroll).
const { chromium } = require('playwright');
const [pg = '/index.html', lang = 'en', W = '390'] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch(require('../../_source/tests/browser'));
  const ctx = await b.newContext({ viewport: { width: +W, height: 844 }, isMobile: true, hasTouch: true });
  const p = await ctx.newPage();
  await p.addInitScript(l => { localStorage.setItem('bw_lang', l); localStorage.setItem('bw_offer_seen', String(Date.now())); }, lang);
  await p.route('**googletagmanager**', r => r.abort());
  await p.goto('http://localhost:8090' + pg, { waitUntil: 'load' });
  await p.waitForTimeout(1500);
  const r = await p.evaluate((W) => {
    const out = [];
    document.querySelectorAll('body *').forEach(el => {
      const b = el.getBoundingClientRect();
      if (b.right > W + 1 || b.left < -1) {
        let clipped = false;
        for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
          const o = getComputedStyle(a); if (o.overflowX !== 'visible') { clipped = true; break; }
        }
        if (!clipped) out.push(el.tagName + '.' + el.className + ' ' + Math.round(b.left) + '..' + Math.round(b.right));
      }
    });
    return [document.documentElement.scrollWidth, out.slice(0, 15)];
  }, +W);
  console.log(r[0]); r[1].forEach(x => console.log(' ', x));
  await b.close();
})();
