/* What does someone see with JavaScript off, or before it loads? Search
   engines render JS now, but a slow phone on a bad connection shows the
   no-JS state for real seconds. */
const { chromium } = require('playwright');
(async()=>{
 const b=await chromium.launch(require('./browser'));
 const ctx=await b.newContext({viewport:{width:1400,height:900},javaScriptEnabled:false});
 const p=await ctx.newPage();
 await p.route('**://mir-s3-cdn-cf.behance.net/**',r=>r.fulfill({status:200,contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==','base64')}));
 await p.goto('http://localhost:8099/index.html',{waitUntil:'domcontentloaded'});
 await p.waitForTimeout(800);
 const r=await p.evaluate(()=>{
  const vis=el=>{const c=getComputedStyle(el);return c.display!=='none'&&c.visibility!=='hidden'&&parseFloat(c.opacity)>0.05;};
  const txt=document.body.innerText.replace(/\s+/g,' ').trim();
  return {words:txt.split(' ').length,
          headline:(document.querySelector('.mega')||{}).innerText||'(none)',
          revealsHidden:[...document.querySelectorAll('.rv,.up')].filter(e=>!vis(e)).length,
          revealsTotal:document.querySelectorAll('.rv,.up').length,
          links:[...document.querySelectorAll('a')].filter(vis).length,
          lang:document.documentElement.lang};});
 console.log('=== من غير جافاسكريبت ===');
 console.log('  كلمات ظاهرة:', r.words);
 console.log('  العنوان:', (r.headline||'').replace(/\n/g,' ').slice(0,60));
 console.log('  عناصر مخفية بانتظار الجافاسكريبت:', r.revealsHidden, 'من', r.revealsTotal);
 console.log('  لينكات شغالة:', r.links);
 console.log('  اللغة:', r.lang);
 // shots/ is gitignored, so a fresh clone does not have it
 require('fs').mkdirSync(__dirname+'/shots',{recursive:true});
 await p.screenshot({path:__dirname+'/shots/nojs.png',clip:{x:0,y:0,width:1400,height:900}});
 await b.close();
})();
