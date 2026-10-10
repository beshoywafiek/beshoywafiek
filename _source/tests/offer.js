/* The offer's memory: "not now" and "I messaged you" must not mean the same. */
const { chromium } = require('playwright');
const PNG=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==','base64');
const DAY = 864e5;
(async()=>{
 const b=await chromium.launch(require('./browser'));
 let fails=0; const note=(ok,m)=>{if(!ok)fails++;console.log((ok?'  ok   ':'  FAIL ')+m);};
 const open = async p => { await p.waitForTimeout(4200);
   return p.evaluate(()=>document.getElementById('pop').classList.contains('on')); };
 const fresh = async () => { const c=await b.newContext({viewport:{width:1280,height:800}});
   const p=await c.newPage();
   await p.route('**://mir-s3-cdn-cf.behance.net/**',r=>r.fulfill({status:200,contentType:'image/png',body:PNG}));
   return {c,p}; };

 // 1. first visit
 let {c,p}=await fresh();
 await p.goto('http://localhost:8099/index.html',{waitUntil:'domcontentloaded'});
 note(await open(p), 'بيظهر في أول زيارة');

 // 2. dismiss, then come back after 4 days -> should return (setting is 3)
 await p.evaluate(()=>document.getElementById('popSkip').click());
 await p.waitForTimeout(400);
 await p.evaluate(d=>{const k='bw_offer_seen';localStorage.setItem(k,String(Date.now()-d));
                      sessionStorage.clear();}, 4*DAY);
 await p.goto('http://localhost:8099/index.html',{waitUntil:'domcontentloaded'});
 note(await open(p), 'بعد ما قال "مش دلوقتي" بـ ٤ أيام — بيرجع');

 // 3. dismiss, come back after 1 day -> should stay away
 await p.evaluate(()=>document.getElementById('popSkip').click());
 await p.waitForTimeout(400);
 await p.evaluate(d=>{localStorage.setItem('bw_offer_seen',String(Date.now()-d));sessionStorage.clear();}, 1*DAY);
 await p.goto('http://localhost:8099/index.html',{waitUntil:'domcontentloaded'});
 note(!(await open(p)), 'بعد يوم واحد — مش بيزن');
 await c.close();

 // 4. act on it (click through to WhatsApp), come back after 10 days -> silent
 ({c,p}=await fresh());
 await p.goto('http://localhost:8099/index.html',{waitUntil:'domcontentloaded'});
 await open(p);
 await p.evaluate(()=>{const g=document.getElementById('popGo');
   g.removeAttribute('target'); g.setAttribute('href','#'); g.click();});
 await p.waitForTimeout(400);
 const acted = await p.evaluate(()=>localStorage.getItem('bw_offer_seen_acted'));
 note(acted==='1','الضغط على الزرار بيتسجل إنه اتواصل');
 await p.evaluate(d=>{localStorage.setItem('bw_offer_seen',String(Date.now()-d));sessionStorage.clear();}, 10*DAY);
 await p.goto('http://localhost:8099/index.html',{waitUntil:'domcontentloaded'});
 note(!(await open(p)), 'بعد ما كلمه بـ ١٠ أيام — مش بيظهر تاني');

 // 5. the owner can always see it
 await p.goto('http://localhost:8099/index.html?offer',{waitUntil:'domcontentloaded'});
 note(await open(p), '‎?offer بيوريهولك في أي وقت');
 await c.close();
 await b.close();
 console.log(fails?fails+' FAILURES':'ذاكرة العرض شغالة صح');
 process.exit(fails?1:0);
})();
