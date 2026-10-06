/* Every internal link on every page, followed. A dead link on a portfolio is
   the cheapest possible way to look careless. */
const { chromium } = require('playwright');
const fs=require('fs'), path=require('path');
(async()=>{
 const b=await chromium.launch(require('./browser'));
 const p=await (await b.newContext()).newPage();
 /* Find the site, rather than assuming it is the working directory. This
    used to walk from '.', so running it from _source/tests/ found ZERO pages
    and still reported green — a gate that checks nothing is worse than no
    gate, because it reads as a pass. */
 const ROOT = [path.resolve('site'),
               path.resolve(__dirname, '../../site'),
               path.resolve(__dirname, '../..'),
               path.resolve('.')]
   .find(d => fs.existsSync(path.join(d, 'index.html')));
 if (!ROOT) { console.log('  FAIL could not find the site (no index.html)'); process.exit(1); }
 const pages=[];
 const walk=d=>fs.readdirSync(d,{withFileTypes:true}).forEach(e=>{
   const f=path.join(d,e.name);
   // dot-folders (.claude, .git) are never published, so their pages are not the site's
   if(e.isDirectory()&&!e.name.startsWith('.')&&!['shots','src','__pycache__','node_modules','_source'].includes(e.name)) walk(f);
   else if(e.name.endsWith('.html')) pages.push(path.relative(ROOT,f));});
 walk(ROOT);
 if (pages.length < 5) { console.log('  FAIL only found ' + pages.length + ' pages in ' + ROOT); process.exit(1); }
 let fails=0;
 const bad=[], ext=new Set();
 for(const f of pages){
  await p.goto('http://localhost:8099/'+f.replace(/\\/g,'/'),{waitUntil:'domcontentloaded'});
  const hrefs=await p.evaluate(()=>[...document.querySelectorAll('a[href]')].map(a=>a.getAttribute('href')));
  for(const h of new Set(hrefs)){
   if(!h||h.startsWith('#')||h.startsWith('mailto:')||h.startsWith('tel:')) continue;
   if(/^https?:/.test(h)){ ext.add(h.split('?')[0]); continue; }
   const abs=new URL(h, 'http://localhost:8099/'+f.replace(/\\/g,'/')).pathname.split('#')[0];
   const local=path.join(ROOT, decodeURIComponent(abs));
   if(!fs.existsSync(local)) bad.push(`${f}  ->  ${h}`);
  }
 }
 console.log(`=== ${pages.length} pages checked ===`);
 if (bad.length) { fails = bad.length;
   console.log('  FAIL ' + bad.length + ' broken internal links:\n' + bad.slice(0,8).map(x=>'   '+x).join('\n')); }
 else console.log('  ok   no broken internal links');
 console.log(`  ok   ${ext.size} external links (not followed)`);
 await b.close();
 console.log(fails ? fails + ' FAILURES' : 'every link resolves');
 process.exit(fails ? 1 : 0);
})();
