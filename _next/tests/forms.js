// A check: with a sheet connected, both forms post the right fields; with
// none, they fall back to WhatsApp. The endpoint is faked and intercepted.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(require('../../_source/tests/browser'));
  const posts = [];
  const ctx = await b.newContext({ viewport: { width: 1280, height: 860 } });
  await ctx.route('**/fake-sheet/exec', async r => { posts.push(JSON.parse(r.request().postData())); r.fulfill({ status: 200, body: 'ok' }); });
  await ctx.route('**googletagmanager**', r => r.abort());
  await ctx.route('http://localhost:8090/**/*.html*', async r => {
    const res = await r.fetch(); let t = await res.text();
    t = t.replace(/data-endpoint=""/g, 'data-endpoint="https://script.google.com/fake-sheet/exec"');
    r.fulfill({ response: res, body: t });
  });
  const p = await ctx.newPage();
  await p.addInitScript(() => localStorage.setItem('bw_lang', 'ar'));
  await p.goto('http://localhost:8090/contact.html?ask=1');
  await p.fill('#lead input[name=name]', 'تجربة'); await p.fill('#lead input[name=phone]', '01000000000');
  await p.click('#lead button[type=submit]'); await p.waitForTimeout(800);
  const contactMsg = await p.locator('#lead .lead-msg').textContent();
  // the offer, on another page
  await p.goto('http://localhost:8090/about.html');
  await p.waitForSelector('#offer.on', { timeout: 9000 });
  await p.fill('#offerF input[name=name]', 'Offer test'); await p.fill('#offerF input[name=phone]', '0111');
  await p.click('#offerF button[type=submit]'); await p.waitForTimeout(800);
  const offerMsg = await p.locator('#offerF .lead-msg').textContent();
  await p.waitForTimeout(2600);
  const closed = await p.evaluate(() => document.getElementById('offer').hidden && localStorage.getItem('bw_offer_acted'));
  console.log(JSON.stringify(posts.map(x => ({ name: x.name, phone: x.phone, needs: x.needs, page: x.page, lang: x.lang })), null, 1));
  console.log({ contactMsg, offerMsg, offerClosedAndRemembered: closed });
  await b.close();
})();
