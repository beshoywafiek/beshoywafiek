/* A check: the site inside a sandboxed frame, the way the preview viewer
   shows it — scripts allowed, but no same-origin, so localStorage and
   sessionStorage throw. Clicks every nav item, from every main page, AFTER
   waiting past the offer's delay, and reports whether it navigated. */
const { chromium } = require('playwright');
const http = require('http');
const PAGES = ['index', 'about', 'work', 'archive', 'services', 'contact'];
const shell = (src) => `<!doctype html><body style="margin:0"><iframe id="f" sandbox="allow-scripts allow-forms allow-popups"
  style="border:0;width:100vw;height:100vh" src="${src}"></iframe></body>`;
(async () => {
  const srv = http.createServer((q, r) => { r.setHeader('content-type', 'text/html'); r.end(shell('http://localhost:8090' + decodeURIComponent(q.url.slice(1)))); }).listen(8093);
  const b = await chromium.launch(require('../../_source/tests/browser'));
  let bad = 0, n = 0;
  for (const mode of ['desktop', 'phone']) {
    const mobile = mode === 'phone';
    const ctx = await b.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 }, isMobile: mobile, hasTouch: mobile });
    await ctx.route('**googletagmanager**', r => r.abort());
    await ctx.route('**://mir-s3-cdn-cf.behance.net/**', r => r.abort());
    const p = await ctx.newPage();
    const errs = []; p.on('pageerror', e => errs.push(String(e)));
    // one visit, like a real one: start on the home page and move through
    // the site inside the same frame, waiting past the offer each time
    await p.goto(`http://localhost:8093/${encodeURIComponent('/index.html')}`);
    let offers = 0;
    const order = ['archive', 'work', 'about', 'services', 'contact', 'index', 'archive'];
    const frame = () => p.frames().find(f => f.url().includes('localhost:8090'));
    const box = async (sel, i) => {                     // where the element is on screen
      const fb = await p.locator('#f').boundingBox();
      const r = await frame().evaluate(([s, i]) => { const e = document.querySelectorAll(s)[i]; const b = e.getBoundingClientRect(); return [b.x + b.width / 2, b.y + b.height / 2]; }, [sel, i]);
      return [fb.x + r[0], fb.y + r[1]];
    };
    for (const to of order) {
      await p.waitForTimeout(6000);                      // past the offer's 5s
      if (await frame().evaluate(() => !document.getElementById('offer').hidden)) offers++;
      const sel = mobile ? '.menu-l a' : '.hd-nav a';
      if (mobile) { const [x, y] = await box('#burger', 0); await p.mouse.click(x, y); await p.waitForTimeout(500);
        if (await frame().evaluate(() => document.getElementById('menu').hidden)) { const [x2, y2] = await box('#burger', 0); await p.mouse.click(x2, y2); await p.waitForTimeout(500); } }
      // the desktop bar has no "Home" item: the name in the corner is home
      const use = (!mobile && to === 'index') ? '.hd-id' : sel;
      const i = use === '.hd-id' ? 0 : await frame().evaluate(([s, t]) => [...document.querySelectorAll(s)].findIndex(a => a.getAttribute('href') === t + '.html'), [use, to]);
      const from = frame().url().replace('http://localhost:8090', '');
      const [x, y] = await box(use, i);
      await p.mouse.click(x, y);
      await p.waitForTimeout(1500);
      const now = frame().url();
      const ok = now.endsWith('/' + to + '.html');
      n++; if (!ok) bad++;
      console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${mode} ${from} -> ${to}.html: now at ${now.replace('http://localhost:8090', '')}`);
    }
    console.log(`  the offer appeared ${offers} time(s) in this ${mode} visit`);
    if (offers > 1) bad++;
    if (errs.length) console.log('  script errors:', errs.slice(0, 3).join(' | '));
    await ctx.close();
  }
  console.log(bad ? `${bad} of ${n} clicks did not navigate` : `all ${n} clicks navigated inside the sandboxed frame`);
  await b.close(); srv.close();
  process.exit(bad ? 1 : 0);
})();
