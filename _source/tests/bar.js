/* Reproduce what a phone actually does: scrolling collapses the address bar,
   the viewport gets ~60px taller, and a resize fires with the SAME width.
   The orb must not move because of it. */
const { chromium } = require('playwright');
const PNG=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==','base64');
const where = p => p.evaluate(()=>{
  const cv=document.getElementById('heroBg'); const c=cv.getContext('2d');
  const d=c.getImageData(0,0,cv.width,cv.height).data;
  const B=20,bw=Math.ceil(cv.width/B),bh=Math.ceil(cv.height/B);
  const sum=new Float64Array(bw*bh);
  for(let y=0;y<cv.height;y++){const by=(y/B)|0;
    for(let x=0;x<cv.width;x++){const a=d[(y*cv.width+x)*4+3];sum[by*bw+((x/B)|0)]+=a>55?55:a;}}
  let top=0;for(let i=0;i<sum.length;i++) if(sum[i]>sum[top]) top=i;
  const tx=top%bw,ty=(top/bw)|0;let sx=0,sy=0,m=0;
  for(let by=Math.max(0,ty-16);by<=Math.min(bh-1,ty+16);by++)
    for(let bx=Math.max(0,tx-16);bx<=Math.min(bw-1,tx+16);bx++){
      const w=sum[by*bw+bx];sx+=(bx*B+B/2)*w;sy+=(by*B+B/2)*w;m+=w;}
  const r=cv.getBoundingClientRect();
  return m?{x:Math.round(r.left+(sx/m)/cv.width*r.width), y:Math.round(r.top+(sy/m)/cv.height*r.height)}:null;});

(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
 let fails=0; const note=(ok,m)=>{if(!ok)fails++;console.log((ok?'  ok   ':'  FAIL ')+m);};
 const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
 const p=await ctx.newPage();
 await p.route('**://mir-s3-cdn-cf.behance.net/**',r=>r.fulfill({status:200,contentType:'image/png',body:PNG}));
 await p.addInitScript(()=>{try{localStorage.setItem('bw_offer_seen',String(Date.now()))}catch(e){}});
 await p.goto('http://localhost:8099/index.html',{waitUntil:'domcontentloaded'});
 await p.waitForTimeout(1600);

 // how far does it move on its own over the same interval? that is the baseline
 let a=await where(p); await p.waitForTimeout(700); let n=await where(p);
 const natural=Math.hypot(n.x-a.x,n.y-a.y);

 // now the address bar: same width, taller viewport
 a=await where(p);
 await p.setViewportSize({width:390,height:904});
 await p.waitForTimeout(700);
 let after=await where(p);
 const jump=Math.hypot(after.x-a.x,after.y-a.y);
 note(jump < natural*3+30, `شريط العنوان ما بيحركش الكورة (${Math.round(jump)}px مقابل ${Math.round(natural)}px عوم طبيعي)`);

 // a genuine width change SHOULD rebuild
 a=await where(p);
 await p.setViewportSize({width:700,height:904});
 await p.waitForTimeout(900);
 const w=await p.evaluate(()=>({cw:document.getElementById('heroBg').width, vw:innerWidth}));
 note(w.cw > 700, `تغيير العرض الحقيقي بيعيد البناء (الكانفس ${w.cw}px لعرض ${w.vw}px)`);
 await b.close();
 console.log(fails?fails+' FAILURES':'الكورة بتعوم من غير ما اللمس يأثر عليها'};
 process.exit(fails?1:0);
})();
