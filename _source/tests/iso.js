/* Turn each hero layer off in turn and see which one the frames come back for. */
const { chromium } = require('playwright');
const PNG=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==','base64');
const CASES = {
 'everything on'      : '',
 'no vignette'        : '.hero-fx::after{display:none !important}',
 'no orbs'            : '.orb{display:none !important}',
 'no sheen'           : '.hero-sheen{display:none !important}',
 'no veil'            : '.hero-veil{display:none !important}',
 'no canvas'          : '.hero-bgw{display:none !important}',
 'no hero at all'     : '.hero-fx,.hero-bgw,.hero-sheen,.hero-veil{display:none !important}',
};
(async()=>{
 const b=await chromium.launch(require('./browser'));
 for(const [name,css] of Object.entries(CASES)){
  const ctx=await b.newContext({viewport:{width:1400,height:860},deviceScaleFactor:1});
  const p=await ctx.newPage();
  await p.route('**://mir-s3-cdn-cf.behance.net/**',r=>r.fulfill({status:200,contentType:'image/png',body:PNG}));
  await p.addInitScript(()=>{try{localStorage.setItem('bw_offer_seen',String(Date.now()))}catch(e){}});
  await p.goto('http://localhost:8099/index.html',{waitUntil:'domcontentloaded'});
  if(css) await p.addStyleTag({content:css});
  await p.waitForTimeout(1400);
  const fps=await p.evaluate(()=>new Promise(res=>{let n=0;const t0=performance.now();
    (function tick(){n++;if(performance.now()-t0<2600)requestAnimationFrame(tick);
     else res(+(n/((performance.now()-t0)/1000)).toFixed(1));})();}));
  console.log('  '+name.padEnd(18)+fps+' fps');
  await ctx.close();
 }
 await b.close();
})();
