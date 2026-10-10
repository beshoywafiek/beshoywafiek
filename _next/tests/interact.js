// A tool: drive the interactive parts and report any script error.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(require('../../_source/tests/browser'));
  const errs = [];
  async function open(w, pg, lang, mobile) {
    const ctx = await b.newContext({ viewport: { width: w, height: 900 }, isMobile: mobile, hasTouch: mobile });
    const p = await ctx.newPage();
    p.on('pageerror', e => errs.push(pg + ' ' + e));
    await p.addInitScript(l => { localStorage.setItem('bw_lang', l); }, lang);
    await p.route('**googletagmanager**', r => r.abort());
    await p.goto('http://localhost:8090' + pg, { waitUntil: 'load' });
    await p.waitForTimeout(1200);
    return p;
  }
  let p = await open(1440, '/index.html', 'en', false);
  for (let i = 0; i < 30; i++) await p.mouse.move(100 + i * 40, 300 + (i % 5) * 30);
  await p.waitForTimeout(300);
  const trailOn = await p.evaluate(() => [...document.querySelectorAll('.hero-trail img')].some(i => getComputedStyle(i).opacity > 0.1));
  const navCount = await p.evaluate(() => document.querySelectorAll('.hd-nav a').length);
  await p.waitForTimeout(3200);
  const offer = await p.evaluate(() => !document.getElementById('offer').hidden);
  const reel = await p.evaluate(async () => { const r = document.querySelector('.reel'); scrollTo(0, r.offsetTop + 1500); await new Promise(x => setTimeout(x, 300)); return document.getElementById('reelTr').style.transform; });
  console.log({ trailOn, navCount, offer, reel });
  // archive: the preview follows the row
  p = await open(1440, '/archive.html', 'en', false);
  await p.locator('.arc-r').nth(4).hover(); await p.waitForTimeout(300);
  const arc = await p.evaluate(() => [document.querySelectorAll('.arc-r').length, document.querySelector('.arc-s.on').dataset.i, document.querySelector('.arc-r.on').dataset.i]);
  // projects: filter
  p = await open(1440, '/work.html', 'en', false);
  await p.locator('.ix-f .chip[data-f="logo"]').click();
  const logos = await p.evaluate(() => [...document.querySelectorAll('.wk')].filter(r => r.offsetParent).length);
  // contact: three questions -> message, language switch, ?ask preselect
  p = await open(1440, '/contact.html?ask=2', 'en', false);
  const pre = await p.locator('#askMsg').textContent();
  await p.locator('#ask .ask-q').nth(1).locator('.chip').first().click();
  const msg = await p.locator('#askMsg').textContent();
  await p.evaluate(() => document.getElementById('lang').click()); await p.waitForTimeout(300);
  const msgAr = await p.locator('#askMsg').textContent();
  console.log({ archiveRows: arc[0], previewFollows: arc[1] === '4' && arc[2] === '4', logos, pre, msg, msgAr });
  // phone menu
  p = await open(390, '/index.html', 'ar', true);
  await p.click('#burger'); await p.waitForTimeout(500);
  const menuOpen = await p.evaluate(() => !document.getElementById('menu').hidden);
  await p.keyboard.press('Escape');
  const menuClosed = await p.evaluate(() => document.getElementById('menu').hidden);
  console.log({ menuOpen, menuClosed });
  // lightbox
  p = await open(1440, '/work/kin.html', 'en', false);
  await p.locator('.gi').first().click(); await p.waitForTimeout(300);
  const lb = await p.evaluate(() => !document.getElementById('lb').hidden && !!document.querySelector('#lb img').src);
  await p.keyboard.press('Escape');
  console.log({ lightbox: lb });
  console.log(errs.length ? 'ERRORS\n' + errs.join('\n') : 'no script errors');
  await b.close();
})();
