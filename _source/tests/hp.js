/* The honeypot has to be invisible to a person, present for a bot, and must
   not widen the page in either script. */
const { chromium } = require('playwright');
(async()=>{
 const b=await chromium.launch(require('./browser'));
 let fails=0; const note=(ok,m)=>{if(!ok)fails++;console.log((ok?'  ok   ':'  FAIL ')+m);};
 for(const lang of ['en','ar']){
  const ctx=await b.newContext({viewport:{width:1400,height:900},locale:lang==='ar'?'ar-EG':'en-US'});
  const p=await ctx.newPage();
  // the form posts to his real Google Sheet: count what reaches it, answer locally
  const sheet=[]; await p.route('**://script.google.com/**',r=>{sheet.push(1);r.fulfill({status:200,body:'ok'});});
  await p.route('**://mir-s3-cdn-cf.behance.net/**',r=>r.fulfill({status:200,contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==','base64')}));
  await p.addInitScript(()=>{try{localStorage.setItem('bw_offer_seen',String(Date.now()))}catch(e){}});
  await p.goto('http://localhost:8099/index.html',{waitUntil:'domcontentloaded'});
  await p.waitForTimeout(700);
  const r=await p.evaluate(()=>{
    const de=document.documentElement, f=document.querySelector('.hp input');
    const wrap=f.closest('.hp');
    // the WRAPPER is what clips it; the input keeps its own layout size and
    // is simply never painted, so measuring the input alone says nothing
    const b=wrap.getBoundingClientRect();
    // and the definitive check: what does the browser say is at its position?
    const at=document.elementFromPoint(Math.max(1,b.left+1), Math.max(1,b.top+1));
    return {over:de.scrollWidth-de.clientWidth, w:Math.round(b.width), h:Math.round(b.height),
            inDom:!!f, display:getComputedStyle(f).display,
            hitsIt: at===f || (at && at.closest && !!at.closest('.hp')),
            focusable: f.tabIndex >= 0};});
  note(r.over<=1, `${lang}: the honeypot adds no page width (${r.over}px)`);
  note(r.inDom && r.display!=='none', `${lang}: still in the DOM for a bot to find (display:${r.display})`);
  note(r.w<=2 && r.h<=2, `${lang}: clipped to nothing (${r.w}x${r.h})`);
  note(!r.hitsIt, `${lang}: cannot be clicked`);
  note(!r.focusable, `${lang}: cannot be tabbed to`);
  // a bot filling it must be dropped, not shown an error it can learn from
  await p.evaluate(()=>{ const f=document.querySelector('.hp input'); f.value='http://spam.example';
    document.querySelector('input[name=name]').value='bot';
    document.querySelector('input[name=phone]').value='0100';
    document.getElementById('lead').dispatchEvent(new Event('submit',{cancelable:true,bubbles:true})); });
  await p.waitForTimeout(400);
  const after=await p.evaluate(()=>({cls:document.getElementById('leadMsg').className,
                                     txt:document.getElementById('leadMsg').textContent.slice(0,40)}));
  note(!/bad/.test(after.cls), `${lang}: a filled honeypot is dropped quietly (${after.cls})`);
  note(sheet.length===0, `${lang}: and nothing is sent to the sheet (${sheet.length} requests)`);
  await ctx.close();
 }
 await b.close();
 console.log(fails?fails+' FAILURES':'the honeypot behaves');
 process.exit(fails?1:0);
})();
