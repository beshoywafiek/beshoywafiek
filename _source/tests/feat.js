const { chromium } = require('playwright');
const PNG=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==','base64');
let fail=0; const ok=(c,m)=>{if(!c)fail++;console.log((c?'  ok   ':'  FAIL ')+m);};
(async()=>{
 const b=await chromium.launch(require('./browser'));
 for(const [w,h,tag] of [[390,844,'phone'],[1512,900,'desktop']]){
  const ctx=await b.newContext({viewport:{width:w,height:h},deviceScaleFactor:2,isMobile:w<700,hasTouch:w<700});
  const p=await ctx.newPage();
  await p.route('**://mir-s3-cdn-cf.behance.net/**',r=>r.fulfill({status:200,contentType:'image/png',body:PNG}));
  await p.goto('http://localhost:8099/index.html',{waitUntil:'domcontentloaded'});
  await p.waitForTimeout(600);
  console.log('\n=== '+tag+' ===');

  // --- social button
  let st=await p.evaluate(()=>{const l=document.querySelectorAll('.fab-i');
    return {n:l.length, vis:[...l].map(e=>+getComputedStyle(e).opacity)};});
  ok(st.n>=3,'channels in the button ('+st.n+')');
  ok(st.vis.every(v=>v===0),'channels hidden until tapped');
  await p.click('#fabB'); await p.waitForTimeout(500);
  st=await p.evaluate(()=>({vis:[...document.querySelectorAll('.fab-i')].map(e=>+getComputedStyle(e).opacity),
    exp:document.getElementById('fabB').getAttribute('aria-expanded'),
    hit:[...document.querySelectorAll('.fab-i .fab-dot')].map(e=>{const b=e.getBoundingClientRect();return Math.round(b.width)+'x'+Math.round(b.height)})}));
  ok(st.vis.every(v=>v>0.9),'channels appear on tap');
  ok(st.exp==='true','button reports its state to screen readers');
  ok(st.hit.every(s=>parseInt(s)>=44),'channel targets are tappable ('+st.hit[0]+')');
  await p.click('body',{position:{x:5,y:300}}); await p.waitForTimeout(400);
  ok(await p.evaluate(()=>!document.getElementById('fab').classList.contains('open')),'closes when you tap away');

  // --- offer popup
  await p.evaluate(()=>{try{localStorage.removeItem('bw_offer_seen')}catch(e){}});
  await p.reload({waitUntil:'domcontentloaded'});
  await p.waitForTimeout(10500);                 // the offer waits 9s by design
  let pop=await p.evaluate(()=>{const e=document.getElementById('pop');
    return {hidden:e.hidden,on:e.classList.contains('on'),go:document.getElementById('popGo').href,
            locked:document.body.classList.contains('locked')};});
  ok(!pop.hidden&&pop.on,'offer appears on its own');
  ok(/wa\.me/.test(pop.go)&&pop.go.length>40,'offer button carries the message');
  ok(pop.locked,'page behind the offer stops scrolling');
  await p.click('#popSkip'); await p.waitForTimeout(600);
  ok(await p.evaluate(()=>document.getElementById('pop').hidden),'offer closes');
  ok(await p.evaluate(()=>!document.body.classList.contains('locked')),'scrolling comes back');
  await p.reload({waitUntil:'domcontentloaded'}); await p.waitForTimeout(10500);
  ok(await p.evaluate(()=>document.getElementById('pop').hidden),'offer stays closed on the next visit');

  // --- lead form
  const lead=await p.evaluate(()=>{const f=document.getElementById('lead');
    // :not([tabindex="-1"]) skips the spam honeypot, which is an input a
    // person never sees and must not be counted as a field or a tap target
    const SEL = 'input:not([tabindex="-1"])';
    return {exists:!!f, fields:f?f.querySelectorAll(SEL).length:0,
      heights:f?[...f.querySelectorAll(SEL)].map(i=>Math.round(i.getBoundingClientRect().height)):[]};});
  ok(lead.exists&&lead.fields===3,'form has its fields ('+lead.fields+')');
  ok(lead.heights.every(x=>x>=44),'inputs are big enough to tap ('+lead.heights.join(',')+')');
  await p.evaluate(()=>document.getElementById('lead').scrollIntoView());
  await p.click('#leadBtn'); await p.waitForTimeout(300);
  let m=await p.evaluate(()=>document.getElementById('leadMsg').textContent);
  ok(m.length>3,'empty form is refused with a message: "'+m+'"');
  await p.fill('input[name=name]','تجربة'); await p.fill('input[name=phone]','01000000000');
  // The form posts to his Google Sheet. The gate must never add rows to it,
  // so the endpoint is intercepted here and answered locally.
  const posts=[];
  await p.route('**://script.google.com/**', r=>{ posts.push(r.request().postData()); r.fulfill({status:200,contentType:'text/plain',body:'ok'}); });
  const opened=[];
  await p.exposeFunction('__rec',u=>opened.push(u));
  await p.evaluate(()=>{window.open=function(u){window.__rec&&window.__rec(u);return null;};});
  await p.click('.ask .ask-q:nth-child(1) .chip:nth-child(1)');
  await p.click('#leadBtn'); await p.waitForTimeout(900);
  const sent = posts[0] ? JSON.parse(posts[0]) : {};
  ok(posts.length===1 && sent.name==='تجربة' && sent.phone==='01000000000' && !!sent.needs,
     'it sends the lead to the sheet endpoint (name, phone, answers: "'+(sent.needs||'')+'")');
  const after=await p.evaluate(()=>({cls:document.getElementById('leadMsg').className, txt:document.getElementById('leadMsg').textContent}));
  ok(/ok/.test(after.cls) && !/bad/.test(after.cls), 'the earlier error is gone and it says the lead arrived: "'+after.txt+'"');
  ok(opened.length===0, 'no WhatsApp window when the send works');
  // and when the send fails: no popup (a browser would block it), a WhatsApp button instead
  await p.unroute('**://script.google.com/**');
  await p.route('**://script.google.com/**', r=>r.abort('failed'));
  await p.evaluate(()=>{document.getElementById('lead').classList.remove('sent');});
  await p.click('#leadBtn'); await p.waitForTimeout(900);
  const fail=await p.evaluate(()=>{const a=document.querySelector('#lead .lead-wa');
    return {cls:document.getElementById('leadMsg').className, href:a?decodeURIComponent(a.href):'', shown:!!a&&a.getClientRects().length>0,
            buttons:document.querySelectorAll('#lead .lead-wa').length};});
  ok(/bad/.test(fail.cls) && fail.shown && /wa\.me/.test(fail.href) && /01000000000/.test(fail.href),
     'a failed send shows a WhatsApp button carrying the details: "'+fail.href.split('text=')[1]+'"');
  ok(opened.length===0, 'and opens no popup on its own');
  await p.click('#leadBtn'); await p.waitForTimeout(900);
  ok(await p.evaluate(()=>document.querySelectorAll('#lead .lead-wa').length)===1, 'a second failed try does not stack buttons');
  await ctx.close();
 }
 await b.close();
 console.log('\n'+(fail?fail+' FAILURES':'all good'));
 process.exit(fail?1:0);
})();
