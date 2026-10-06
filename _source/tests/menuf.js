/* The full-screen menu has to fit four sections, the four services and the
   channels, on the shortest phone anyone still carries — and when it does not
   fit, it has to SCROLL rather than hide its first item above the fold. */
const { chromium } = require('playwright');
const PNG=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==','base64');
(async()=>{
 let fails=0;
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
 for(const [name,w,h] of [['iphone-se',375,667],['iphone',390,844],['tall',414,915]]){
  for(const lang of ['ar','en']){
   const ctx=await b.newContext({viewport:{width:w,height:h},isMobile:true,hasTouch:true,locale:lang==='ar'?'ar-EG':'en-US'});
   const p=await ctx.newPage();
   await p.route('**://mir-s3-cdn-cf.behance.net/**',r=>r.fulfill({status:200,contentType:'image/png',body:PNG}));
   await p.goto('http://localhost:8099/index.html',{waitUntil:'domcontentloaded'});
   await p.waitForTimeout(400); await p.click('#burger'); await p.waitForTimeout(500);
   const r=await p.evaluate(()=>{
     const m=document.getElementById('menu');
     const nav=m.querySelector('nav');
     const first=nav.querySelector('a'), last=m.querySelector('.menu-foot a:last-child');
     const hdr=document.querySelector('.top').getBoundingClientRect();
     return {scrollH:m.scrollHeight, clientH:m.clientHeight,
             firstTop:Math.round(first.getBoundingClientRect().top),
             headerBottom:Math.round(hdr.bottom),
             lastBottom:last?Math.round(last.getBoundingClientRect().bottom):null,
             scrollTop:m.scrollTop};});
   const clipped = r.firstTop < r.headerBottom - 2;
   const cutOff  = r.lastBottom !== null && r.lastBottom > r.clientH + 2 && r.scrollH <= r.clientH + 2;
   if (clipped || cutOff) fails++;
   console.log(`  ${(clipped||cutOff)?'FAIL ':'ok   '} ${name.padEnd(10)} ${lang}  content ${r.scrollH}px in ${r.clientH}px, first item at ${r.firstTop} (header ends ${r.headerBottom})${clipped?' :: FIRST ITEM UNREACHABLE':''}${cutOff?' :: TAIL CUT OFF':''}`);
   await ctx.close();
  }
 }
 await b.close();
 console.log(fails?fails+' FAILURES':'the menu fits or scrolls on every phone');
 process.exit(fails?1:0);
})();
