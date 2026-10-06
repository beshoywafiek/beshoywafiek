/* Does the lens actually follow the pointer? Measured, because "it moves"
   and "it follows my mouse" are different claims. */
const { chromium } = require('playwright');
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
 const ctx=await b.newContext({viewport:{width:1400,height:860},deviceScaleFactor:1});
 const p=await ctx.newPage();
 await p.route('**://mir-s3-cdn-cf.behance.net/**',r=>r.fulfill({status:200,contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==','base64')}));
 await p.addInitScript(()=>{try{localStorage.setItem('bw_offer_seen',String(Date.now()))}catch(e){}});
 await p.goto('http://localhost:8099/index.html',{waitUntil:'domcontentloaded'});
 await p.waitForTimeout(1600);

 // find the lens by looking for the brightest ring in a row of pixels
 /* Find the disc by DENSITY, not by brightness. The grid has scattered bright
    nodes all over it, and taking the centroid of the brightest pixels just
    returns the middle of the canvas. The lens is a large continuous area of
    lifted alpha, so downsampling into blocks and taking the heaviest block
    finds it reliably. */
 async function lensCentre(){
   return await p.evaluate(()=>{
     const cv=document.getElementById('heroBg');
     const c=cv.getContext('2d');
     const d=c.getImageData(0,0,cv.width,cv.height).data;
     const B=20, bw=Math.ceil(cv.width/B), bh=Math.ceil(cv.height/B);
     const sum=new Float64Array(bw*bh);
     for(let y=0;y<cv.height;y++){
       const by=(y/B)|0;
       // cap each pixel: the glint travelling round the rim is far brighter
       // than the disc, and uncapped it drags the centroid onto the glint
       for(let x=0;x<cv.width;x++){ const a=d[(y*cv.width+x)*4+3];
         sum[by*bw+((x/B)|0)] += a>55?55:a; }
     }
     let top=0; for(let i=0;i<sum.length;i++) if(sum[i]>sum[top]) top=i;
     const tx=top%bw, ty=(top/bw)|0;
     // centroid over the blocks near that one, weighted by their mass
     let sx=0, sy=0, m=0;
     for(let by=Math.max(0,ty-16);by<=Math.min(bh-1,ty+16);by++)
       for(let bx=Math.max(0,tx-16);bx<=Math.min(bw-1,tx+16);bx++){
         const w=sum[by*bw+bx]; sx+=(bx*B+B/2)*w; sy+=(by*B+B/2)*w; m+=w; }
     if(!m) return null;
     const r=cv.getBoundingClientRect();
     return {x:Math.round(r.left+(sx/m)/cv.width*r.width),
             y:Math.round(r.top +(sy/m)/cv.height*r.height)};
   });
 }
 let fails=0; const note=(ok,m)=>{if(!ok)fails++;console.log((ok?'  ok   ':'  FAIL ')+m);};

 for(const [tx,ty] of [[300,250],[1050,600],[400,700]]){
   await p.mouse.move(tx,ty);
   // jitter by a pixel so every move is a real event, and give it time to settle
   for(let i=0;i<16;i++){ await p.mouse.move(tx+(i%2),ty+((i+1)%2)); await p.waitForTimeout(80); }
   const c=await lensCentre();
   const dist = c? Math.round(Math.hypot(c.x-tx,c.y-ty)) : 9999;
   note(dist<120, `pointer at ${tx},${ty} -> lens settles at ${c&&c.x},${c&&c.y} (${dist}px away)`);
 }
 // and it should wander off on its own once the pointer stops
 const a=await lensCentre();
 await p.waitForTimeout(5200);
 const bb=await lensCentre();
 const moved=Math.round(Math.hypot(bb.x-a.x,bb.y-a.y));
 note(moved>40, `drifts on its own when left alone (${moved}px in 5s)`);
 await b.close();
 console.log(fails?fails+' FAILURES':'the lens follows the pointer');
 process.exit(fails?1:0);
})();
