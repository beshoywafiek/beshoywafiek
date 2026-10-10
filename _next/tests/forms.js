/* A check: both forms post the agreed fields to the sheet endpoint, an earlier
   error clears on a good send, and a failed send shows a WhatsApp button (no
   popup, which a browser would block). The Google endpoint is intercepted and
   answered locally, so this never adds rows to the real sheet.
     node forms.js        (site served on :8090) */
const { chromium } = require('playwright');
const B = 'http://localhost:8090';
let bad = 0;
const ok = (c, m) => { if (!c) bad++; console.log((c ? '  ok   ' : '  FAIL ') + m); };
(async () => {
  const b = await chromium.launch(require('../../_source/tests/browser'));
  for (const [W, mobile] of [[1280, false], [390, true]]) {
    const ctx = await b.newContext({ viewport: { width: W, height: 860 }, isMobile: mobile, hasTouch: mobile });
    let mode = 'ok'; const posts = [];
    await ctx.route('**://script.google.com/**', r => {
      if (mode === 'fail') return r.abort('failed');
      posts.push(JSON.parse(r.request().postData())); r.fulfill({ status: 200, contentType: 'text/plain', body: 'ok' });
    });
    await ctx.route('**googletagmanager**', r => r.abort());
    await ctx.addInitScript(() => { localStorage.setItem('bw_lang', 'ar'); window.__opened = []; window.open = u => { window.__opened.push(u); return null; }; });
    const tag = mobile ? 'phone' : 'desktop';

    // contact form: refused empty, then a good send clears the error
    const p = await ctx.newPage();
    await p.addInitScript(() => localStorage.setItem('bw_offer_seen', String(Date.now())));
    await p.goto(B + '/contact.html?ask=1');
    await p.click('#lead button[type=submit]'); await p.waitForTimeout(150);
    ok(/bad/.test(await p.getAttribute('#lead .lead-msg', 'class')), `${tag} contact: empty form refused`);
    await p.fill('#lead input[name=name]', 'Form test'); await p.fill('#lead input[name=phone]', '01000000000');
    await p.click('#lead button[type=submit]'); await p.waitForTimeout(700);
    const c = posts.pop() || {};
    ok(c.name === 'Form test' && c.phone === '01000000000' && c.email === '' && c.needs === 'هوية بصرية متكاملة',
      `${tag} contact: posts name, phone, email and the answers ("${c.needs}")`);
    const m1 = await p.evaluate(() => ({ cls: document.querySelector('#lead .lead-msg').className, opened: window.__opened.length }));
    ok(/ok/.test(m1.cls) && !/bad/.test(m1.cls) && m1.opened === 0, `${tag} contact: the old error is gone, success shown, no popup`);

    // contact form: a failed send shows a WhatsApp button, once
    mode = 'fail';
    await p.goto(B + '/contact.html');
    await p.fill('#lead input[name=name]', 'Form test'); await p.fill('#lead input[name=phone]', '01000000000');
    await p.click('#lead button[type=submit]'); await p.waitForTimeout(700);
    await p.click('#lead button[type=submit]'); await p.waitForTimeout(700);
    const f1 = await p.evaluate(() => { const a = document.querySelectorAll('#lead .lead-wa');
      return { n: a.length, href: a[0] ? decodeURIComponent(a[0].href) : '', vis: a[0] ? a[0].getClientRects().length > 0 : false,
               cls: document.querySelector('#lead .lead-msg').className, opened: window.__opened.length }; });
    ok(/bad/.test(f1.cls) && f1.n === 1 && f1.vis && /wa\.me/.test(f1.href) && f1.href.includes('Form test') && f1.opened === 0,
      `${tag} contact: failed send → one WhatsApp button with the details, no popup`);
    mode = 'ok';

    // offer popup: posts with the offer as the message, then a failure shows the button
    const q = await ctx.newPage();
    await q.addInitScript(() => localStorage.removeItem('bw_offer_seen'));   // let the offer show on each visit
    await q.goto(B + '/about.html'); await q.waitForSelector('#offer.on', { timeout: 9000 });
    await q.fill('#offerF input[name=name]', 'Offer test'); await q.fill('#offerF input[name=phone]', '0111');
    await q.click('#offerF button[type=submit]'); await q.waitForTimeout(700);
    const o = posts.pop() || {};
    ok(o.name === 'Offer test' && o.phone === '0111' && o.needs === 'عرض أول تعامل — خصم ٣٠٪', `${tag} offer: posts name, phone and the offer as the message`);
    await q.waitForTimeout(2500);
    ok(await q.evaluate(() => document.getElementById('offer').hidden), `${tag} offer: closes itself after a lead`);
    mode = 'fail';
    await q.goto(B + '/services.html'); await q.waitForSelector('#offer.on', { timeout: 9000 });
    await q.fill('#offerF input[name=name]', 'Offer test'); await q.fill('#offerF input[name=phone]', '0111');
    await q.click('#offerF button[type=submit]'); await q.waitForTimeout(900);
    const f2 = await q.evaluate(() => { const a = document.querySelector('#offerF .lead-wa');
      return { a: !!a && a.getClientRects().length > 0, href: a ? decodeURIComponent(a.href) : '', open: !document.getElementById('offer').hidden, opened: window.__opened.length }; });
    ok(f2.a && f2.open && f2.href.includes('0111') && f2.opened === 0, `${tag} offer: failed send → WhatsApp button in the popup, popup stays open, no popup window`);
    mode = 'ok';
    await ctx.close();
  }
  await b.close();
  console.log(bad ? `${bad} FAILURES` : 'both forms behave: they send, clear old errors, and fall back to a WhatsApp button');
  process.exit(bad ? 1 : 0);
})();
