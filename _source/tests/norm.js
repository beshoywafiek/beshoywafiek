/* Normalise a batch of stock SVGs onto one 40x40 grid.
   Each one arrives with its own viewBox, its own units, and its own idea of
   how much of the box the artwork should fill. This measures the real ink of
   each, scales it to the same optical size, centres it, forces currentColor so
   it takes the site's palette, and — for the stroked ones — rewrites
   stroke-width so that after scaling it lands on the same 1.6 as everything
   else. What it cannot fix is construction: a filled icon and a stroked icon
   are different objects and will always read differently side by side. */
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');

const TARGET = 0.48;        // share of the 40x40 box the artwork should cover
const STROKE = 1.6;

(async () => {
  const files = fs.readdirSync('/tmp/ic').filter(f => f.endsWith('.svg')).sort();
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const p = await (await b.newContext()).newPage();
  await p.goto('about:blank');
  const out = {};

  for (const f of files) {
    const raw = fs.readFileSync('/tmp/ic/' + f, 'utf8');
    const r = await p.evaluate(src => {
      document.body.innerHTML = '<div id="h" style="position:absolute;left:-9999px;top:0;width:400px;height:400px">' + src + '</div>';
      const svg = document.querySelector('#h svg');
      svg.setAttribute('width', '400'); svg.setAttribute('height', '400');
      const vb = (svg.getAttribute('viewBox') || '0 0 100 100').split(/[\s,]+/).map(Number);
      /* getBBox works in the element's own user units, so there is no screen
         conversion to get wrong — and it still answers for an svg that was
         authored with no width/height, which is where the rect-based version
         returned Infinity. */
      let ink;
      try {
        const g = svg.getBBox();
        ink = (isFinite(g.width) && g.width > 0)
          ? { x: g.x, y: g.y, w: g.width, h: g.height }
          : { x: vb[0], y: vb[1], w: vb[2], h: vb[3] };
      } catch (e) { ink = { x: vb[0], y: vb[1], w: vb[2], h: vb[3] }; }
      const strokeW = (() => { const m = src.match(/stroke-width:?\s*["']?([\d.]+)/); return m ? parseFloat(m[1]) : 0; })();
      const stroked = /stroke:#|stroke="(?!none)/.test(src);
      // getBBox ignores the stroke, so a stroked icon is half a stroke bigger
      if (stroked && strokeW) { ink = { x: ink.x - strokeW / 2, y: ink.y - strokeW / 2,
                                        w: ink.w + strokeW, h: ink.h + strokeW }; }
      return { vb, ink, inner: svg.innerHTML, strokeW, stroked };
    }, raw);

    // scale so the artwork covers TARGET of the box by area, then centre it
    const area = Math.sqrt((40 * 40 * TARGET) / (r.ink.w * r.ink.h));
    const k = Math.min(area, 36 / Math.max(r.ink.w, r.ink.h));
    const cx = r.ink.x + r.ink.w / 2, cy = r.ink.y + r.ink.h / 2;
    const tx = 20 - cx * k, ty = 20 - cy * k;

    let inner = r.inner
      .replace(/\sid="[^"]*"/g, '')
      .replace(/stroke:#[0-9a-fA-F]{3,6}/g, 'stroke:currentColor')
      .replace(/fill:#[0-9a-fA-F]{3,6}/g, 'fill:currentColor')
      .replace(/fill="rgb\([^)]*\)"/g, 'fill="currentColor"')
      .replace(/fill="#[0-9a-fA-F]{3,6}"/g, 'fill="currentColor"')
      .replace(/stroke="#[0-9a-fA-F]{3,6}"/g, 'stroke="currentColor"')
      .replace(/\s*<\/?g[^>]*>\s*/g, m => m.trim())       // keep groups, drop padding
      .replace(/\n\s*/g, '');
    if (r.stroked && r.strokeW) {
      // after scaling by k, a native width of strokeW renders as strokeW*k
      const want = (STROKE / k).toFixed(3);
      inner = inner.replace(/stroke-width:[\d.]+/g, 'stroke-width:' + want)
                   .replace(/stroke-width="[\d.]+"/g, 'stroke-width="' + want + '"');
    }
    const body = `<g transform="translate(${tx.toFixed(3)} ${ty.toFixed(3)}) scale(${k.toFixed(5)})"${r.stroked ? '' : ' fill="currentColor" stroke="none"'}>${inner}</g>`;
    const name = f.replace(/^[0-9a-f]{8}-/, '').replace(/_\d+\.svg$/, '');
    out[name] = { body, stroked: r.stroked, ink: [Math.round(r.ink.w), Math.round(r.ink.h)] };
    console.log(`  ${name.padEnd(22)} ${r.stroked ? 'outline' : 'solid  '}  ink ${Math.round(r.ink.w)}x${Math.round(r.ink.h)}  scale ${k.toFixed(3)}`);
  }
  fs.writeFileSync('/tmp/ic/normalised.json', JSON.stringify(out, null, 1));
  await b.close();
})();
