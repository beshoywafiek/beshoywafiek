/* Find text that its own box is cutting off — in both languages, at four
   widths. Compares each text element's ink extent against its clip box.

   This used to only print its findings and always exit 0, so check.js counted
   it green no matter what it found. It is a gate now: any clipped text fails,
   and so does examining suspiciously few elements, which would mean the pages
   did not really load. */
const { chromium } = require('playwright');
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==','base64');
const VIEWS=[[1900,950],[1512,900],[820,1180],[390,844]];
const PAGES=['/index.html','/work.html','/work/mountain-view-club.html','/work/yalla-masyaf.html'];
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
  const found=[]; let examined=0;
  for(const lang of ['en','ar']){
    for(const [w,h] of VIEWS){
      const ctx=await b.newContext({viewport:{width:w,height:h},deviceScaleFactor:1});
      const p=await ctx.newPage();
      await p.route('**://mir-s3-cdn-cf.behance.net/**',r=>r.fulfill({status:200,contentType:'image/png',body:PNG}));
      await p.addInitScript(l=>{try{localStorage.setItem('bw_lang',l)}catch(e){}}, lang);
      for(const path of PAGES){
        await p.goto('http://localhost:8099'+path,{waitUntil:'domcontentloaded'});
        // settle every reveal first: a line still sliding up inside its mask
        // registers as overflow, which is the animation, not a clipped glyph
        await p.evaluate(()=>document.querySelectorAll('.mega,.rv,.up').forEach(e=>e.classList.add('in')));
        await p.waitForTimeout(1300);
        const bad=await p.evaluate(()=>{
          const out=[];
          const sel='h1,h2,h3,p,span,a,b,dd,dt,button,li';
          for(const el of document.querySelectorAll(sel)){
            if(!el.textContent.trim()) continue;
            const cs=getComputedStyle(el);
            if(cs.display==='none'||cs.visibility==='hidden') continue;
            const r=el.getBoundingClientRect();
            if(r.width<2||r.height<2) continue;
            // 1) the element's own box clips its content
            const clipsY = (cs.overflowY==='hidden'||cs.overflowY==='clip') && el.scrollHeight-el.clientHeight>1;
            const clipsX = (cs.overflowX==='hidden'||cs.overflowX==='clip') && el.scrollWidth-el.clientWidth>1;
            // 2) an ancestor with overflow hidden cuts the glyphs
            let cut=null;
            if(el.children.length===0){
              const range=document.createRange(); range.selectNodeContents(el);
              const ink=range.getBoundingClientRect(); range.detach&&range.detach();
              let a=el.parentElement;
              while(a&&a!==document.body){
                const acs=getComputedStyle(a);
                if(acs.overflow!=='visible'&&acs.overflowY!=='visible'){
                  const ar=a.getBoundingClientRect();
                  const over=Math.max(ink.bottom-ar.bottom, ar.top-ink.top);
                  if(over>1.5){cut={by:a.className||a.tagName,px:Math.round(over)};break;}
                }
                a=a.parentElement;
              }
            }
            if((clipsY||clipsX||cut) && !String(el.className).includes('wrow')){
              out.push({cls:(el.className||el.tagName).toString().slice(0,34),
                txt:el.textContent.trim().slice(0,26),
                y:clipsY?el.scrollHeight-el.clientHeight:0,
                x:clipsX?el.scrollWidth-el.clientWidth:0,
                cut:cut?cut.by.toString().slice(0,22)+' '+cut.px+'px':''});
            }
          }
          return out;
        });
        bad.forEach(x=>found.push({lang,w,path:path.split('/').pop(),...x}));
        examined += await p.evaluate(()=>document.querySelectorAll('h1,h2,h3,p,span,a,b,dd,dt,button,li').length);
      }
      await ctx.close();
    }
  }
  const seen=new Set();
  for(const f of found){
    const k=f.lang+f.cls+f.txt+f.cut+f.y+f.x;
    if(seen.has(k))continue; seen.add(k);
    console.log(`${f.lang} ${String(f.w).padEnd(5)} ${f.path.slice(0,18).padEnd(19)} ${f.cls.padEnd(34)} y+${f.y} x+${f.x} ${f.cut}  "${f.txt}"`);
  }
  console.log('\n'+found.length+' hits, '+seen.size+' distinct, '+examined+' text elements examined');
  await b.close();
  // A run that examined almost nothing proves nothing: 8 page loads of this
  // site are several thousand text elements.
  if(examined < 2000){ console.log('FAIL  only '+examined+' elements examined — the pages did not load properly'); process.exit(1); }
  if(seen.size){ console.log('FAIL  '+seen.size+' distinct clipped text findings (listed above)'); process.exit(1); }
  console.log('no clipped text');
})();
