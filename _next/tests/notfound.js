/* A check: the 404 page works wherever the site is deployed. GitHub Pages
   answers any missing address with 404.html at that depth, so this mounts the
   built site at a project path, at the current path and at a domain root,
   requests deep missing addresses, and checks the page is styled, its logo
   loads, every link points at a real page, and its button lands on Projects.
     node notfound.js */
// Simulates GitHub Pages: the built site mounted at a prefix on a real-looking
// host; any missing address answers with 404.html and status 404.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const SITE = path.join(__dirname, '..', 'site');
const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.json': 'application/json' };
const SCEN = [
  ['new repo (project site)', 'https://beshoywafiek.github.io', '/beshoy-wafiek/', ['/beshoy-wafiek/nope', '/beshoy-wafiek/work/old/deep/link.html', '/beshoy-wafiek/services/x/']],
  ['current repo path', 'https://beshoywafiek.github.io', '/beshoywafiek/', ['/beshoywafiek/missing', '/beshoywafiek/a/b/c']],
  ['custom domain (root)', 'https://www.beshoywafiek.com', '/', ['/nope', '/work/missing.html', '/services/a/b/c/']],
  ['user site (root on github.io)', 'https://beshoywafiek.github.io', '/', ['/old-page', '/work/gone/']],
];
(async () => {
  const b = await chromium.launch(require('../../_source/tests/browser'));
  let bad = 0;
  for (const [name, origin, prefix, urls] of SCEN) {
    for (const [W, mobile] of [[1440, false], [390, true]]) {
      const ctx = await b.newContext({ viewport: { width: W, height: 860 }, isMobile: mobile, hasTouch: mobile });
      await ctx.addInitScript(() => { try { localStorage.setItem('bw_offer_seen', String(Date.now())); } catch (e) {} });
      await ctx.route('**googletagmanager**', r => r.abort());
      await ctx.route('**://mir-s3-cdn-cf.behance.net/**', r => r.fulfill({ status: 200, contentType: 'image/png', body: fs.readFileSync(path.join(__dirname, '..', '..', 'images', 'favicon.png')) }));
      await ctx.route(origin + '/**', r => {
        const u = new URL(r.request().url());
        let rel = u.pathname.startsWith(prefix) ? u.pathname.slice(prefix.length) : null;
        if (rel === '') rel = 'index.html';
        const f = rel !== null ? path.join(SITE, rel) : null;
        if (f && fs.existsSync(f) && fs.statSync(f).isFile()) return r.fulfill({ status: 200, contentType: MIME[path.extname(f)] || 'application/octet-stream', body: fs.readFileSync(f) });
        return r.fulfill({ status: 404, contentType: 'text/html', body: fs.readFileSync(path.join(SITE, '404.html')) });
      });
      for (const url of urls) {
        const p = await ctx.newPage(); const failed = [], errs = [];
        p.on('response', x => { if (x.request().method() === 'HEAD') return; if (x.status() >= 400 && x.url() !== origin + url && !/googletag/.test(x.url())) failed.push(x.status() + ' ' + x.url().replace(origin, '')); });
        p.on('pageerror', e => errs.push(String(e)));
        const res = await p.goto(origin + url, { waitUntil: 'load' });
        await p.waitForTimeout(700);
        const r = await p.evaluate(() => ({
          bg: getComputedStyle(document.body).backgroundColor,
          styled: getComputedStyle(document.querySelector('.hd')).position === 'fixed',
          logo: document.querySelector('.mk').naturalWidth > 0,
          sw: document.documentElement.scrollWidth, vw: innerWidth,
          links: [...document.querySelectorAll('a[data-rel]')].map(a => a.getAttribute('href')),
          favicon: !!document.querySelector('link[rel=icon]').href.startsWith('data:'),
        }));
        // every internal link must point at an existing page under this deployment's root
        const dead = [];
        for (const h of [...new Set(r.links)]) { const rel = h.startsWith(prefix) ? h.slice(prefix.length) : null; if (rel === null || !fs.existsSync(path.join(SITE, rel))) dead.push(h); }
        // follow the main button and confirm it lands on a real, styled page
        await p.click('.nf .btn-o'); await p.waitForLoadState('load'); await p.waitForTimeout(200);
        const landed = p.url().replace(origin, ''), landedOk = landed === prefix + 'work.html' && await p.evaluate(() => getComputedStyle(document.querySelector('.hd')).position === 'fixed');
        const ok = res.status() === 404 && r.styled && r.bg === 'rgb(239, 236, 230)' && r.logo && r.favicon && r.sw <= r.vw && !dead.length && !failed.length && !errs.length && landedOk;
        if (!ok) bad++;
        console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${name} [${W}] ${url} → status ${res.status()}, styled ${r.styled}, logo ${r.logo}, ${r.links.length} links${dead.length ? ' DEAD: ' + dead.join(',') : ' all live'}, button → ${landed}${failed.length ? ' | failed: ' + failed.join(', ') : ''}${errs.length ? ' | errors: ' + errs.join(' ') : ''}${r.sw > r.vw ? ' | SIDEWAYS ' + r.sw : ''}`);
        await p.close();
      }
      await ctx.close();
    }
  }
  await b.close();
  console.log(bad ? `${bad} failures` : 'the 404 page works in every deployment');
  process.exit(bad ? 1 : 0);
})();
