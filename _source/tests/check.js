/* One command that runs every gate, so nothing ships on a green half-check.
   Each of these exists because something actually broke:
     test.js   layout, lightbox, language toggle, mobile menu
     clip.js   text cut off by a reveal mask
     rtl.js    the moving strips going blank in Arabic
     arrow.js  arrows pointing the wrong way in Arabic
     svl.js    the services list, the mobile header, the offer
     nav.js    the services dropdown: hover, keyboard, Escape, touch
     menuf.js  the full-screen menu fitting, or scrolling, on a short phone
     lens.js   the hero glass actually following the pointer
     audit.js  desktop AND phone: contrast, tap targets, overflow, collisions
     links.js  every internal link on every page, actually followed
     hp.js     the spam honeypot: hidden, unclickable, and not widening the page
     bar.js    the phone address bar not resetting the hero orb
     offer.js  the offer's memory: a dismissal and a reply are not the same
     feat.js   the channel button, the offer, the lead form
     det.js    the build is deterministic: same sources -> identical pages
   Usage: node check.js      (the local server must be up on 8099) */
const { spawn } = require('child_process');

const GATES = ['test.js', 'clip.js', 'rtl.js', 'arrow.js', 'svl.js', 'nav.js', 'menuf.js', 'lens.js', 'audit.js', 'links.js', 'hp.js', 'bar.js', 'offer.js', 'feat.js', 'det.js'];

(async () => {
  const failed = [];
  for (const g of GATES) {
    process.stdout.write('\n──────── ' + g + ' ────────\n');
    const code = await new Promise(res => {
      const p = spawn('node', [g], { stdio: ['ignore', 'pipe', 'pipe'] });
      let tail = [];
      const keep = b => { tail = tail.concat(String(b).split('\n')).slice(-400); };
      p.stdout.on('data', keep); p.stderr.on('data', keep);
      p.on('close', c => {
        const bad = tail.filter(l => /FAIL|Error|error:/.test(l));
        console.log(bad.length ? bad.slice(0, 12).join('\n') : tail.filter(Boolean).slice(-1)[0] || '');
        res(c);
      });
    });
    if (code !== 0) failed.push(g);
  }
  console.log('\n════════════════════════════');
  console.log(failed.length ? 'FAILED: ' + failed.join(', ') : 'every gate passed');
  process.exit(failed.length ? 1 : 0);
})();
