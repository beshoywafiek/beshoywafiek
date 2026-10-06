/* Frames actually delivered while the hero is on screen, and while scrolling —
   scrolling is when a background like this bites, not idling. */
const { chromium } = require('playwright');
(async()=>{
 const b=await chromium.launch(require('./browser'));
 for(const [name,w,h,cpu] of [['desktop',1400,860,1],['phone',390,844,4]]){
  const ctx=await b.newContext({viewport:{width:w,height:h},deviceScaleFactor:name==='phone'?2:1,isMobile:name==='phone',hasTouch:name==='phone'});
  const p=await ctx.newPage();
  await p.route('**://mir-s3-cdn-cf.behance.net/**',r=>r.fulfill({status:200,contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==','base64')}));
  const cdp=await ctx.newCDPSession(p);
  if(cpu>1) await cdp.send('Emulation.setCPUThrottlingRate',{rate:cpu});
  await p.goto('http://localhost:8099/index.html',{waitUntil:'domcontentloaded'});
  await p.waitForTimeout(2000);
  for(const [label,act] of [['idle',null],['scrolling',async()=>{for(let y=0;y<900;y+=28){await p.mouse.wheel(0,28);await p.waitForTimeout(16);}}]]){
    const r=await p.evaluate(()=>new Promise(res=>{
      let n=0; const t0=performance.now();
      (function tick(){ n++; if(performance.now()-t0<2500) requestAnimationFrame(tick); else res({fps:+(n/((performance.now()-t0)/1000)).toFixed(1)}); })();
    }));
    const pr = act ? (async()=>{const q=p.evaluate(()=>new Promise(res=>{let n=0;const t0=performance.now();(function tick(){n++;if(performance.now()-t0<2500)requestAnimationFrame(tick);else res({fps:+(n/((performance.now()-t0)/1000)).toFixed(1)});})();})); await act(); return q;})() : Promise.resolve(r);
    const got = await pr;
    console.log(`  ${name.padEnd(8)} cpu/${cpu}x  ${label.padEnd(10)} ${got.fps} fps`);
  }
  await ctx.close();
 }
 await b.close();
})();
