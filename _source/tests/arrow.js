/* Every arrow glyph must point toward the reading direction.

   This gate once passed vacuously. It checked /services/web-design.html, and
   when that service was removed the URL started 404ing — python's http.server
   returns its own error page, which has no arrows, so the gate happily printed
   "ok  0 arrows point the right way" and service pages silently lost arrow
   coverage. A gate that cannot fail is worse than no gate, so now it asserts
   the page actually loaded AND that it found arrows to check. */
const { chromium } = require('playwright');
const PNG=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==','base64');

// Each page, with the smallest number of arrows it must contain. If a redesign
// legitimately changes a count, lower the floor — do not delete it.
const PAGES=[['/index.html',6],['/work.html',2],['/services/logo-design.html',1],['/work/mountain-view-club.html',2]];

(async()=>{
 const b=await chromium.launch(require('./browser'));
 let fails=0; const note=(ok,m)=>{if(!ok)fails++;console.log((ok?'  ok   ':'  FAIL ')+m);};
 for(const lang of ['en','ar']){
  for(const [path,floor] of PAGES){
   const ctx=await b.newContext({viewport:{width:1400,height:900},locale:lang==='ar'?'ar-EG':'en-US'});
   const p=await ctx.newPage();
   await p.route('**://mir-s3-cdn-cf.behance.net/**',r=>r.fulfill({status:200,contentType:'image/png',body:PNG}));
   const resp=await p.goto('http://localhost:8099'+path,{waitUntil:'domcontentloaded'});
   if(!resp||resp.status()!==200){
     note(false,`${lang} ${path}: page returned ${resp?resp.status():'no response'} — the gate cannot check a page that is not there`);
     await ctx.close(); continue;
   }
   await p.waitForTimeout(400);
   const r=await p.evaluate(()=>{
    const rtl=document.documentElement.getAttribute('dir')==='rtl';
    const out={total:0,wrong:[]};
    document.querySelectorAll('svg.ar-x').forEach(s=>{
      if(!s.getBoundingClientRect().width) return;
      out.total++;
      const m=new DOMMatrix(getComputedStyle(s).transform);
      const flipped=m.a<0;
      // the glyph is drawn pointing right; in Arabic it must end up pointing left
      if(rtl!==flipped) out.wrong.push((s.closest('a,button')||s.parentElement).className||'?');
    });
    return out;});
   if(r.total<floor){
     note(false,`${lang} ${path}: found only ${r.total} visible arrows, expected at least ${floor} — coverage was lost, not earned`);
   } else {
     note(r.wrong.length===0, `${lang} ${path}: ${r.total} arrows point the right way`+(r.wrong.length?' :: '+[...new Set(r.wrong)].join(', '):''));
   }
   await ctx.close();
  }
 }
 await b.close(); console.log(fails?fails+' FAILURES':'every arrow points the right way'); process.exit(fails?1:0);
})();
