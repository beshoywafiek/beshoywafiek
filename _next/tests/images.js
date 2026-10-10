/* A check (node images.js, with the site served on :8090): project images. Projects,
   Archive, every case page and the viewer — desktop and phone, with
   Behance reachable and with Behance BLOCKED. Every image must come from its
   own project's folder in media/, load, and the viewer must fall back to the
   local copy when Behance fails. */
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const SITE = path.join(__dirname, '..', 'site');
const cases = fs.readdirSync(SITE + '/work').map(f => '/work/' + f);
const results = []; const ok = (n, c, i = '') => { results.push(c); console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${i ? '  — ' + i : ''}`); };
(async () => {
  const b = await chromium.launch(require('../../_source/tests/browser'));
  for (const behance of ['reachable', 'BLOCKED']) for (const [W, mobile] of [[1440, false], [390, true]]) {
    const ctx = await b.newContext({ viewport: { width: W, height: 860 }, isMobile: mobile, hasTouch: mobile });
    await ctx.addInitScript(() => { localStorage.setItem('bw_offer_seen', String(Date.now())); localStorage.setItem('bw_lang', 'ar'); });
    await ctx.route('**googletagmanager**', r => r.abort());
    if (behance === 'BLOCKED') await ctx.route('**/*.behance.net/**', r => r.abort('blockedbyclient'));
    const tag = `[${mobile ? 'phone' : 'desktop'}, Behance ${behance}]`;
    const p = await ctx.newPage(); const beReq = []; p.on('request', r => { if (r.url().includes('behance.net')) beReq.push(r.url()); });
    const loadAll = async () => { await p.evaluate(async () => { document.querySelectorAll('img[loading=lazy]').forEach(i => i.loading = 'eager');
      await Promise.all([...document.images].map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; }))); }); };
    // Projects
    await p.goto('http://localhost:8090/work.html'); await loadAll();
    let r = await p.evaluate(() => [...document.querySelectorAll('.wk a')].map(a => { const i = a.querySelector('img'); const s = a.getAttribute('href').match(/work\/(.+)\.html/)[1];
      return { s, okSlug: (i.currentSrc || i.src).includes('/media/work/' + s + '/'), loaded: i.naturalWidth > 0 }; }));
    ok(`projects ${tag}: 25 cards, each image from its own project folder, all loaded`, r.length === 25 && r.every(x => x.okSlug && x.loaded), `${r.filter(x => x.okSlug).length}/25 mapped, ${r.filter(x => x.loaded).length}/25 loaded`);
    // Archive
    await p.goto('http://localhost:8090/archive.html'); await loadAll();
    r = await p.evaluate(() => { const rows = [...document.querySelectorAll('.arc-r')]; return rows.map(a => { const s = a.getAttribute('href').match(/work\/(.+)\.html/)[1];
      const th = a.querySelector('.arc-th img'), pv = document.querySelector(`.arc-s[data-i="${a.dataset.i}"] img`);
      return { s, th: (th.currentSrc || th.src).includes('/media/work/' + s + '/') && th.naturalWidth > 0, pv: (pv.currentSrc || pv.src).includes('/media/work/' + s + '/') && pv.naturalWidth > 0 }; }); });
    ok(`archive ${tag}: 10 rows; thumbnail and preview from the row's own project, loaded`, r.length === 10 && r.every(x => x.th && x.pv), `${r.filter(x => x.th && x.pv).length}/10`);
    if (!mobile) { await p.locator('.arc-r').nth(7).hover(); await p.waitForTimeout(200);
      ok(`archive ${tag}: hover shows the right preview`, await p.evaluate(() => { const on = document.querySelector('.arc-s.on'); return on.dataset.i === '7' && on.querySelector('img').naturalWidth > 0; })); }
    // every case page
    let bad = [];
    for (const c of cases) {
      await p.goto('http://localhost:8090' + c); await loadAll();
      const s = c.match(/work\/(.+)\.html/)[1];
      const q = await p.evaluate(s => { const g = [...document.querySelectorAll('.cs-cover img, .gi img')];
        const nx = document.querySelector('.nx'); const ns = nx.getAttribute('href').replace('.html', ''); const ni = nx.querySelector('img');
        return { n: g.length, wrong: g.filter(i => !(i.currentSrc || i.src).includes('/media/work/' + s + '/')).length, broken: g.filter(i => !i.naturalWidth).length,
          next: (ni.currentSrc || ni.src).includes('/media/work/' + ns + '/') && ni.naturalWidth > 0 }; }, s);
      if (q.wrong || q.broken || !q.next) bad.push(`${s}: ${q.wrong} wrong, ${q.broken} broken, next ${q.next}`);
    }
    ok(`case pages ${tag}: all 25 — every image from its own project, none broken, next-project image right`, !bad.length, bad.slice(0, 3).join(' | '));
    ok(`pages ${tag}: no page or thumbnail image requested from Behance`, beReq.length === 0, beReq.length + ' requests');
    // viewer
    await p.goto('http://localhost:8090/work/kin.html'); await p.waitForTimeout(300);
    for (const i of [0, 5]) {
      await p.locator('.gi').nth(i).scrollIntoViewIfNeeded(); await p.locator('.gi').nth(i).click();
      await p.waitForFunction(() => { const im = document.querySelector('#lb img'); return im.complete && im.naturalWidth > 0; }, null, { timeout: 15000 }).catch(() => {});
      const v = await p.evaluate(() => { const im = document.querySelector('#lb img'); return { src: im.currentSrc || im.src, w: im.naturalWidth }; });
      const want = behance === 'BLOCKED' ? v.src.includes('/media/work/kin/') : v.src.includes('behance.net');
      ok(`viewer ${tag}: image ${i + 1} shows${behance === 'BLOCKED' ? ' the local fallback' : ' the large Behance version'}`, v.w > 0 && want, `${v.w}px from ${v.src.includes('behance') ? 'Behance' : 'local'}`);
      await p.keyboard.press('ArrowLeft'); await p.waitForTimeout(150);
      await p.waitForFunction(() => { const im = document.querySelector('#lb img'); return im.complete && im.naturalWidth > 0; }, null, { timeout: 15000 }).catch(() => {});
      ok(`viewer ${tag}: next image also loads`, await p.evaluate(() => document.querySelector('#lb img').naturalWidth > 0));
      await p.keyboard.press('Escape'); await p.waitForTimeout(150);
    }
    await ctx.close();
  }
  await b.close();
  console.log(`\n${results.filter(Boolean).length} passed, ${results.filter(x => !x).length} failed`);
})();
