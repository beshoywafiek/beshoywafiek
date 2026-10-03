/* Beshoy Wafiek — v4
   Every scroll handler here is rAF-throttled and reads only cached offsets.
   Nothing calls getBoundingClientRect inside a frame. That was the cause of
   the 7fps problem earlier in this project and it is not coming back. */
(function () {
  'use strict';
  var root = document.documentElement;
  root.classList.remove('no-js');
  root.classList.add('js');

  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ---------------- language ---------------- */
  function setLang(l) {
    root.setAttribute('lang', l);
    root.setAttribute('dir', l === 'ar' ? 'rtl' : 'ltr');
    var b = document.getElementById('lang');
    if (b) b.textContent = l === 'ar' ? 'EN' : 'ع';
    document.title = root.getAttribute('data-t-' + l) || document.title;
  }
  var saved = null;
  try { saved = localStorage.getItem('bw_lang'); } catch (e) {}
  if (saved === 'ar' || saved === 'en') setLang(saved);
  else {
    var n = (navigator.languages && navigator.languages[0]) || navigator.language || 'en';
    setLang(n.toLowerCase().indexOf('ar') === 0 ? 'ar' : 'en');
  }
  var langBtn = document.getElementById('lang');
  if (langBtn) langBtn.addEventListener('click', function () {
    var next = root.getAttribute('lang') === 'ar' ? 'en' : 'ar';
    setLang(next);
    try { localStorage.setItem('bw_lang', next); } catch (e) {}
    compose();
  });

  /* ---------------- header ---------------- */
  var top = document.querySelector('.top');
  if (top) {
    var stuck = false, tick1 = false;
    function hdr() {
      tick1 = false;
      var s = window.pageYOffset > 18;
      if (s !== stuck) { stuck = s; top.classList.toggle('stuck', s); }
    }
    addEventListener('scroll', function () {
      if (!tick1) { tick1 = true; requestAnimationFrame(hdr); }
    }, { passive: true });
    hdr();
  }

  /* ---------------- reveals ----------------
     The observer watches the container, never an element that clip-path has
     collapsed to zero height — a clipped element reports ratio 0 forever and
     the card stays blank. That bug cost an afternoon; see .rv in the CSS. */
  var targets = document.querySelectorAll('.up, .rv, .mega');
  if ('IntersectionObserver' in window && targets.length) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.04, rootMargin: '0px 0px -6% 0px' });
    Array.prototype.forEach.call(targets, function (el) { io.observe(el); });
    /* a safety net: if anything never fires, show it rather than hide the work */
    setTimeout(function () {
      Array.prototype.forEach.call(targets, function (el) { el.classList.add('in'); });
    }, 7000);
  } else {
    Array.prototype.forEach.call(targets, function (el) { el.classList.add('in'); });
  }

  /* ---------------- counting numbers ---------------- */
  var nums = document.querySelectorAll('[data-n]');
  var tickEl = document.querySelector('.tick');
  if (nums.length && tickEl && 'IntersectionObserver' in window && !reduce) {
    var done = false;
    var io2 = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting || done) return;
        done = true; io2.disconnect();
        Array.prototype.forEach.call(nums, function (el) {
          var target = parseInt(el.getAttribute('data-n'), 10);
          var pre = el.getAttribute('data-pre') || '';
          var t0 = null;
          requestAnimationFrame(function step(ts) {
            if (t0 === null) t0 = ts;
            var k = Math.min((ts - t0) / 1300, 1);
            var e3 = 1 - Math.pow(1 - k, 3);
            el.textContent = pre + Math.round(e3 * target).toLocaleString('en-US');
            if (k < 1) requestAnimationFrame(step);
          });
        });
      });
    }, { threshold: 0.3 });
    io2.observe(tickEl);
  }

  /* ---------------- mobile menu ---------------- */
  var burger = document.getElementById('burger');
  var menu = document.getElementById('menu');
  if (burger && menu) {
    function setMenu(open) {
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      document.body.classList.toggle('locked', open);
      if (open) {
        menu.hidden = false;
        requestAnimationFrame(function () { menu.classList.add('open'); });
      } else {
        menu.classList.remove('open');
        setTimeout(function () { menu.hidden = true; }, 320);
      }
    }
    burger.addEventListener('click', function () {
      setMenu(burger.getAttribute('aria-expanded') !== 'true');
    });
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
    addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });
  }

  /* ---------------- the guided questions ----------------
     Three questions, each a row of chips. The WhatsApp message writes
     itself from the answers and is shown in full before it is sent, so
     nobody has to compose anything or wonder what gets passed on. */
  var waBtn = document.getElementById('waBtn');
  var askBox = document.querySelector('.ask');
  var askPrev = document.getElementById('askPrev');
  var answers = [];

  function compose() {
    if (!waBtn) return;
    var en = root.getAttribute('lang') === 'en';
    var suffix = en ? 'en' : 'ar';
    var text;

    if (!askBox) {                       // pages without the question block
      text = en ? 'Hi Beshoy, I saw your work and would like to talk.'
                : 'أهلاً بيشوي، شفت شغلك وحابب نتكلم.';
    } else {
      var total = askBox.querySelectorAll('.ask-q').length;
      var given = 0;
      for (var k = 0; k < total; k++) if (answers[k]) given++;
      if (!given) {
        text = askBox.getAttribute('data-empty-' + suffix) || '';
      } else {
        var any = askBox.getAttribute('data-any-' + suffix) || '';
        text = askBox.getAttribute('data-msg-' + suffix) || '';
        for (var q = 0; q < total; q++) {
          var a = answers[q] ? answers[q][suffix] : any;
          text = text.split('{' + (q + 1) + '}').join(a);
        }
      }
    }

    waBtn.href = 'https://wa.me/201273874839?text=' + encodeURIComponent(text);
    if (askPrev) {
      // show the answers picked out, so the sentence is easy to scan
      var shown = text;
      for (var z = 0; z < answers.length; z++) {
        if (!answers[z]) continue;
        var v = answers[z][suffix];
        if (v) shown = shown.split(v).join('<b>' + v + '</b>');
      }
      askPrev.innerHTML = shown;
    }
  }

  Array.prototype.forEach.call(document.querySelectorAll('.chips .chip'), function (chip) {
    chip.addEventListener('click', function () {
      var q = parseInt(chip.getAttribute('data-q') || '0', 10);
      var was = chip.classList.contains('on');
      var group = chip.parentNode.querySelectorAll('.chip');
      Array.prototype.forEach.call(group, function (c) { c.classList.remove('on'); });
      if (was) {
        answers[q] = null;
      } else {
        chip.classList.add('on');
        answers[q] = { ar: chip.getAttribute('data-ar'), en: chip.getAttribute('data-en') };
      }
      compose();
    });
  });
  compose();

  /* ---------------- year ---------------- */
  var yr = document.getElementById('yr');
  if (yr) yr.textContent = String(new Date().getFullYear());

  /* ---------------- cursor ----------------
     The loop only runs while the pointer is actually moving, then parks
     itself. A permanently running rAF for a decorative dot is not worth
     the battery. */
  if (fine && !reduce) {
    var cur = document.createElement('div');
    cur.className = 'cur';
    cur.innerHTML = '<i></i>';
    document.body.appendChild(cur);
    var label = cur.firstChild;
    var tx = innerWidth / 2, ty = innerHeight / 2, cx = tx, cy = ty, running = false;
    function loop() {
      cx += (tx - cx) * 0.2; cy += (ty - cy) * 0.2;
      cur.style.transform = 'translate3d(' + (cx - 4.5) + 'px,' + (cy - 4.5) + 'px,0)';
      if (Math.abs(tx - cx) > 0.4 || Math.abs(ty - cy) > 0.4) requestAnimationFrame(loop);
      else running = false;
    }
    addEventListener('mousemove', function (e) {
      tx = e.clientX; ty = e.clientY;
      if (!running) { running = true; requestAnimationFrame(loop); }
    }, { passive: true });
    document.addEventListener('mouseover', function (e) {
      var hot = e.target.closest('[data-cur]');
      if (hot) { cur.classList.add('big'); label.textContent = hot.getAttribute('data-cur'); }
      else cur.classList.remove('big');
    });
    addEventListener('mouseout', function (e) { if (!e.relatedTarget) cur.style.opacity = '0'; });
    addEventListener('mouseover', function () { cur.style.opacity = '1'; });
  }

  /* ---------------- work filters ---------------- */
  var fbar = document.querySelector('.filters');
  if (fbar) {
    var tiles = document.querySelectorAll('.tile');
    fbar.addEventListener('click', function (e) {
      var b = e.target.closest('.f');
      if (!b) return;
      Array.prototype.forEach.call(fbar.querySelectorAll('.f'), function (x) { x.classList.remove('on'); });
      b.classList.add('on');
      var c = b.getAttribute('data-c');
      Array.prototype.forEach.call(tiles, function (t) {
        t.hidden = !(c === 'all' || t.getAttribute('data-c') === c);
      });
      try {
        history.replaceState(null, '', c === 'all' ? location.pathname : location.pathname + '?c=' + c);
      } catch (err) {}
    });
    var q = new URLSearchParams(location.search).get('c');
    if (q) { var b0 = fbar.querySelector('.f[data-c="' + q + '"]'); if (b0) b0.click(); }
  }

  /* ---------------- reading progress ----------------
     Offsets are cached and only recomputed on resize. */
  var prog = document.querySelector('.prog');
  if (prog) {
    var span = 1, tick2 = false;
    function measure() { span = Math.max(1, document.body.scrollHeight - innerHeight); }
    function frame() {
      tick2 = false;
      prog.style.transform = 'scaleX(' + Math.min(1, window.pageYOffset / span).toFixed(4) + ')';
    }
    measure(); frame();
    addEventListener('scroll', function () {
      if (!tick2) { tick2 = true; requestAnimationFrame(frame); }
    }, { passive: true });
    addEventListener('resize', function () { measure(); frame(); }, { passive: true });
    addEventListener('load', measure);
  }

  /* ---------------- lightbox ---------------- */
  var figs = document.querySelectorAll('.fig');
  if (figs.length) {
    var lb = null, lbImg = null, lbCap = null, at = 0;
    function build() {
      lb = document.createElement('div');
      lb.className = 'lb'; lb.hidden = true;
      lb.innerHTML =
        '<img alt="">' +
        '<button class="lb-x" type="button" aria-label="Close"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 5l14 14M19 5L5 19"/></svg></button>' +
        '<button class="lb-p" type="button" aria-label="Previous"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 5l-7 7 7 7"/></svg></button>' +
        '<button class="lb-nx" type="button" aria-label="Next"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 5l7 7-7 7"/></svg></button>' +
        '<span class="lb-c"></span>';
      document.body.appendChild(lb);
      lbImg = lb.querySelector('img');
      lbCap = lb.querySelector('.lb-c');
      lb.querySelector('.lb-x').addEventListener('click', close);
      lb.querySelector('.lb-p').addEventListener('click', function (e) { e.stopPropagation(); go(-1); });
      lb.querySelector('.lb-nx').addEventListener('click', function (e) { e.stopPropagation(); go(1); });
      lb.addEventListener('click', function (e) { if (e.target === lb || e.target === lbImg) close(); });
    }
    function show(i) {
      at = (i + figs.length) % figs.length;
      var f = figs[at];
      lbImg.src = f.getAttribute('data-hi') || f.querySelector('img').src;
      lbImg.alt = f.querySelector('img').alt || '';
      lbCap.textContent = (at + 1) + ' / ' + figs.length;
    }
    function open(i) {
      if (!lb) build();
      show(i);
      lb.hidden = false;
      document.body.classList.add('locked');
      requestAnimationFrame(function () { lb.classList.add('on'); });
    }
    function close() {
      if (!lb) return;
      lb.classList.remove('on');
      document.body.classList.remove('locked');
      setTimeout(function () { lb.hidden = true; lbImg.removeAttribute('src'); }, 260);
    }
    function go(d) { show(at + d); }
    Array.prototype.forEach.call(figs, function (f, i) {
      f.addEventListener('click', function (e) { e.preventDefault(); open(i); });
    });
    addEventListener('keydown', function (e) {
      if (!lb || lb.hidden) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowRight') go(root.getAttribute('dir') === 'rtl' ? -1 : 1);
      else if (e.key === 'ArrowLeft') go(root.getAttribute('dir') === 'rtl' ? 1 : -1);
    });
  }

  /* ---------------- cross-document page transitions ----------------
     Native, no library. The browser fades the pages on its own; this only
     names the one image that should morph across, so a project cover grows
     into the case-study hero. Silently skipped where unsupported. */
  if ('onpageswap' in window) {
    addEventListener('pageswap', function (e) {
      if (!e.viewTransition || !e.activation || !e.activation.entry) return;
      var url = e.activation.entry.url;
      var link = null;
      Array.prototype.some.call(document.querySelectorAll('a[href]'), function (a) {
        if (a.href === url) { link = a; return true; }
        return false;
      });
      var img = link && link.querySelector('img');
      if (img) img.style.viewTransitionName = 'hero';
      var heroNow = document.querySelector('[data-hero]');
      if (heroNow && !img) heroNow.style.viewTransitionName = 'hero';
    });
    addEventListener('pagereveal', function (e) {
      if (!e.viewTransition) return;
      var hero = document.querySelector('[data-hero]');
      if (hero) {
        hero.style.viewTransitionName = 'hero';
        e.viewTransition.finished.then(function () { hero.style.viewTransitionName = ''; });
      }
    });
  }
})();

/* ===== the hero background =====
   A field of monospace glyphs with light moving across it, and a lens of
   glass travelling over the whole thing.

   Three things here are deliberate, and each replaced something worse:

   1. THE GLYPHS DO NOT FALL. They sit in a fixed grid and light up as a band
      of light passes over them. Falling glyphs are the cheap version of this
      effect; illumination moving across a still field is what the original
      actually did, and it also costs far less — integer coordinates, no
      re-shaping of text, and only the lit band is redrawn each frame.

   2. EVERY GLYPH IS A SPRITE, NOT TEXT. The set is drawn once into a small
      atlas and blitted from there. Calling fillText per cell per frame was
      the single most expensive thing on this page.

   3. NOTHING ACCUMULATES. The old approach of painting a translucent black
      over the canvas each frame drags the hero off its own background colour
      and leaves permanent ghosts, because 8-bit alpha never rounds to zero.
      The still field lives on an offscreen canvas and the visible one is
      repaired from it, so the colour is exact and there is no residue.

   What this still deliberately does NOT use: filter:blur(), backdrop-filter,
   mix-blend-mode or an SVG displacement filter. All four were measured on
   this page and a surface this size cannot afford any of them. See the note
   in the stylesheet.

   Everything halts when the hero scrolls away or the tab is hidden, the frame
   rate is capped, and anyone who asked for reduced motion gets a single
   still frame. */
(function () {
  var cv = document.getElementById('heroBg');
  if (!cv || !cv.getContext) return;
  var ctx = cv.getContext('2d', { alpha: true });
  if (!ctx) return;

  /* Digits, operators and box-drawing, no letters and no katakana: letters
     pull the eye into trying to read them, and katakana reads as homage. */
  var GLYPHS = '01{}<>/\;:=+*#[]()$%&|_01┌┐└┘├┤─│'.split('');
  var CELL = 26, FONT = 13;
  var INK = '244,242,239', HOT = '232,80,2';

  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var coarse = matchMedia('(pointer: coarse)').matches;
  var thin = (navigator.hardwareConcurrency || 8) <= 4 ||
             (navigator.connection && navigator.connection.saveData);

  var off = document.createElement('canvas');
  var octx = off.getContext('2d', { alpha: true });
  if (!octx) return;

  var W = 0, H = 0, cols = 0, rows = 0, dpr = 1, cells = null;
  var atlas = null, atlasHot = null;
  var running = false, raf = 0, last = 0;
  var FRAME = 1000 / (thin ? 24 : 30);     // a slow field does not need 60

  function pick() { return (Math.random() * GLYPHS.length) | 0; }

  /* The vertical fade used to be a CSS mask over the whole layer, which cost
     more frames than everything else on the page put together. The alpha is
     already per cell, so the ramp is free here. */
  function ramp(r) {
    var t = (r + 0.5) / rows;
    if (t < 0.10) return t / 0.10;
    if (t > 0.70) return Math.max(0, 1 - (t - 0.70) / 0.30);
    return 1;
  }

  /* One atlas per colour, built once. Blitting a sprite and setting
     globalAlpha is a fraction of the cost of shaping a glyph. */
  function buildAtlas(rgb) {
    var a = document.createElement('canvas');
    a.width = Math.round(GLYPHS.length * CELL * dpr);
    a.height = Math.round(CELL * dpr);
    var c = a.getContext('2d');
    if (!c) return null;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.font = '700 ' + FONT + 'px "Space Mono", ui-monospace, SFMono-Regular, monospace';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillStyle = 'rgb(' + rgb + ')';
    for (var i = 0; i < GLYPHS.length; i++) c.fillText(GLYPHS[i], i * CELL + CELL / 2, CELL / 2);
    return a;
  }

  // draw one cell onto a context, in device pixels
  function blit(c2, gi, hot, alpha, cx, ry) {
    var src = hot ? atlasHot : atlas;
    if (!src || alpha < 0.005) return;
    var s = CELL * dpr;
    c2.globalAlpha = alpha > 1 ? 1 : alpha;
    c2.drawImage(src, Math.round(gi * s), 0, Math.round(s), Math.round(s),
                 Math.round(cx * CELL * dpr), Math.round(ry * CELL * dpr),
                 Math.round(s), Math.round(s));
  }

  function build() {
    var box = cv.getBoundingClientRect();
    if (box.width < 2 || box.height < 2) return false;
    // the field reads the same at 1.5x as at 3x, for a third of the pixels
    dpr = Math.min(window.devicePixelRatio || 1, thin ? 1.25 : 1.6);
    W = box.width; H = box.height;
    cv.width = off.width = Math.round(W * dpr);
    cv.height = off.height = Math.round(H * dpr);
    ctx.setTransform(1, 0, 0, 1, 0, 0);          // the blits work in device px
    octx.setTransform(1, 0, 0, 1, 0, 0);

    atlas = buildAtlas(INK);
    atlasHot = buildAtlas(HOT);
    if (!atlas) return false;

    cols = Math.ceil(W / CELL);
    rows = Math.ceil(H / CELL);
    BAND = Math.max(130, Math.min(W * 0.26, 280));   // how wide the light is
    cells = new Array(cols * rows);
    /* Sparse on purpose. A full grid reads as a screensaver; about a fifth of
       the cells lit reads as a surface with something going on under it. */
    for (var i = 0; i < cells.length; i++) {
      cells[i] = Math.random() < 0.36
        ? { g: pick(), a: 0.075 + Math.random() * 0.125, hot: Math.random() < 0.055 }
        : null;
    }
    repaintField();
    return true;
  }

  function repaintField() {
    octx.clearRect(0, 0, off.width, off.height);
    octx.globalAlpha = 1;
    for (var r = 0; r < rows; r++) {
      var k = ramp(r);
      if (k <= 0) continue;
      for (var c = 0; c < cols; c++) {
        var v = cells[r * cols + c];
        if (v) blit(octx, v.g, v.hot, v.a * k, c, r);
      }
    }
    octx.globalAlpha = 1;
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.globalAlpha = 1;
    ctx.drawImage(off, 0, 0);
  }

  // copy a rectangle of the still field back onto the visible canvas
  function repair(x, y, w, h) {
    var sx = Math.max(0, Math.floor(x * dpr) - 2), sy = Math.max(0, Math.floor(y * dpr) - 2);
    var sw = Math.min(cv.width - sx, Math.ceil(w * dpr) + 4);
    var sh = Math.min(cv.height - sy, Math.ceil(h * dpr) + 4);
    if (sw <= 0 || sh <= 0) return;
    ctx.globalAlpha = 1;
    ctx.clearRect(sx, sy, sw, sh);
    ctx.drawImage(off, sx, sy, sw, sh, sx, sy, sw, sh);
  }

  /* ---- the light ----
     A soft vertical band crossing the field. Cells inside it are redrawn
     brighter, so the code lights up as the light reaches it rather than the
     light simply sitting on top of it. The band is the only part of the
     canvas redrawn per frame. */
  var BAND = 0, bandPrev = null;
  function bandAt(t) {
    var span = W + BAND * 2;
    return ((t / 1000 * (W / 15)) % span) - BAND;     // one crossing per ~15s
  }

  function drawBand(bx) {
    var c0 = Math.max(0, Math.floor((bx - BAND) / CELL));
    var c1 = Math.min(cols - 1, Math.ceil((bx + BAND) / CELL));
    ctx.globalAlpha = 1;
    for (var c = c0; c <= c1; c++) {
      var d = Math.abs((c * CELL + CELL / 2) - bx) / BAND;
      if (d >= 1) continue;
      var lift = (1 - d * d) * (1 - d * d);           // smooth, no hard edge
      for (var r = 0; r < rows; r++) {
        var v = cells[r * cols + c];
        if (!v) continue;
        var k = ramp(r);
        if (k <= 0) continue;
        blit(ctx, v.g, v.hot, (v.a + lift * (v.hot ? 0.80 : 0.52)) * k, c, r);
      }
    }
    ctx.globalAlpha = 1;
  }

  /* ---- retyping ----
     Rewriting a short RUN of cells reads as a line being retyped. Scattering
     single cells at random reads as television static. */
  var reNext = 0;
  function retype(ms) {
    if (ms < reNext) return;
    reNext = ms + 150;
    for (var n = 0; n < 3; n++) {
      var len = 3 + ((Math.random() * 6) | 0);
      var c0 = (Math.random() * Math.max(1, cols - len)) | 0;
      var r = (Math.random() * rows) | 0;
      var warm = Math.random() < 0.16;
      for (var k = 0; k < len; k++) {
        cells[r * cols + c0 + k] = Math.random() < 0.78
          ? { g: pick(),
              a: (warm ? 0.21 : 0.075) + Math.random() * (warm ? 0.20 : 0.125),
              hot: warm && Math.random() < 0.55 }
          : null;
      }
      // rewrite those cells on the still field, then show them
      var x = c0 * CELL, y = r * CELL, w = len * CELL;
      octx.globalAlpha = 1;
      octx.clearRect(Math.round(x * dpr), Math.round(y * dpr),
                     Math.round(w * dpr), Math.round(CELL * dpr));
      var kr = ramp(r);
      for (var j = 0; j < len; j++) {
        var v = cells[r * cols + c0 + j];
        if (v && kr > 0) blit(octx, v.g, v.hot, v.a * kr, c0 + j, r);
      }
      octx.globalAlpha = 1;
      repair(x, y, w, CELL);
    }
  }

  /* ---- the lens ----
     Travels on two sine waves of different periods so the path never repeats
     visibly, and leans toward the pointer when there is one.

     What makes this read as glass is not blur — it is that what is behind it
     is BENT. The centre is magnified and left clean; the rim is where the
     distortion and the light collect. That is the shape of a real lens, and
     it is the one part of the look a gradient cannot fake. */
  var px = 0.5, py = 0.45, t0 = 0, lensPrev = null;
  var MAG = 1.30;

  function lensAt(t) {
    t /= 1000;
    var bx = 0.5 + 0.30 * Math.sin(t / 11.3) + 0.08 * Math.sin(t / 3.7);
    var by = 0.42 + 0.20 * Math.sin(t / 8.1 + 1.1) + 0.05 * Math.sin(t / 2.9);
    // the pointer nudges it rather than owning it, so it never feels like a cursor
    return [(bx * 0.78 + px * 0.22) * W, (by * 0.78 + py * 0.22) * H];
  }

  function drawLens(lx, ly, R, t) {
    var d = dpr, cx = lx * d, cy = ly * d, rr = R * d;

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, rr, 0, 6.2832);
    ctx.clip();

    /* The same pixels, drawn bigger about the lens centre: real magnification.
       Only the lens's own box is handed to drawImage — passing the whole
       canvas and letting clip() throw the rest away looks identical and
       measured 17fps slower, because the clip does not stop the scale from
       being computed. */
    var k = R / MAG;
    ctx.globalAlpha = 1;
    ctx.drawImage(off,
      (lx - k) * d, (ly - k) * d, 2 * k * d, 2 * k * d,
      (lx - R) * d, (ly - R) * d, 2 * R * d, 2 * R * d);

    /* A second copy, a little larger and barely there. Two offset copies of
       the same pixels give the doubled, smeared quality of thick glass —
       which is what a blend mode would have been used for, at a cost this
       page cannot pay. */
    ctx.globalAlpha = 0.22;
    var k2 = R / (MAG * 1.14);
    ctx.drawImage(off,
      (lx - k2) * d, (ly - k2) * d, 2 * k2 * d, 2 * k2 * d,
      (lx - R) * d, (ly - R) * d, 2 * R * d, 2 * R * d);
    ctx.globalAlpha = 1;

    // the body: a faint lift in the middle, the light collecting at the rim
    var g = ctx.createRadialGradient(cx, cy, rr * 0.10, cx, cy, rr);
    g.addColorStop(0.00, 'rgba(' + INK + ',.045)');
    g.addColorStop(0.62, 'rgba(' + INK + ',.038)');
    g.addColorStop(0.88, 'rgba(' + INK + ',.105)');
    g.addColorStop(0.97, 'rgba(255,255,255,.165)');
    g.addColorStop(1.00, 'rgba(' + HOT + ',.125)');   // the warm edge of the split
    ctx.fillStyle = g;
    ctx.fillRect(cx - rr, cy - rr, rr * 2, rr * 2);
    ctx.restore();

    /* The rim, and a glint travelling round it. The glint is the thing the
       eye reads as "this is alive" — more than the refraction is. */
    ctx.save();
    ctx.lineWidth = Math.max(1, 1.1 * d);
    ctx.beginPath();
    ctx.arc(cx, cy, rr, 0, 6.2832);
    ctx.strokeStyle = 'rgba(' + INK + ',.10)';
    ctx.stroke();

    var a0 = (t / 2600) % 6.2832;
    ctx.beginPath();
    ctx.arc(cx, cy, rr, a0, a0 + 1.05);
    ctx.strokeStyle = 'rgba(255,255,255,.34)';
    ctx.lineWidth = Math.max(1, 1.6 * d);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, rr, a0 + 3.14, a0 + 3.60);
    ctx.strokeStyle = 'rgba(' + HOT + ',.26)';
    ctx.stroke();
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function frame(ms) {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    if (ms - last < FRAME) return;              // capped, not free-running
    last = ms;
    if (!t0) t0 = ms;
    var t = ms - t0;

    // repair what the band and the lens have left behind
    var bx = bandAt(t);
    if (bandPrev !== null) {
      var lo = Math.min(bandPrev, bx) - BAND, hi = Math.max(bandPrev, bx) + BAND;
      repair(lo, 0, hi - lo, H);
    }
    var p = lensAt(t);
    var lx = p[0], ly = p[1];
    var R = Math.max(96, Math.min(W, H) * (coarse ? 0.23 : 0.19));
    if (lensPrev) {
      var x0 = Math.min(lensPrev[0], lx) - R, y0 = Math.min(lensPrev[1], ly) - R;
      repair(x0, y0, Math.abs(lx - lensPrev[0]) + R * 2, Math.abs(ly - lensPrev[1]) + R * 2);
    }

    retype(ms);
    drawBand(bx);
    drawLens(lx, ly, R, t);

    bandPrev = bx;
    lensPrev = [lx, ly];
  }

  function start() {
    if (running || !cells) return;
    running = true;
    if (reduce) { repaintField(); return; }     // one still frame, and stop
    last = 0;
    raf = requestAnimationFrame(frame);
  }
  function stop() {
    running = false;
    cancelAnimationFrame(raf);
  }

  if (!build()) addEventListener('load', function () { if (build()) start(); });

  /* The atlas bakes whatever font was available when it was built, so it has
     to be built again once the real one has loaded — otherwise the whole
     field is stuck in the fallback face. */
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () {
      atlas = buildAtlas(INK); atlasHot = buildAtlas(HOT);
      if (cells) { repaintField(); bandPrev = null; lensPrev = null; }
    });
  }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) {
      es[0].isIntersecting ? start() : stop();
    }, { threshold: 0 }).observe(cv);
  } else { start(); }

  document.addEventListener('visibilitychange', function () {
    document.hidden ? stop() : start();
  });

  /* The pointer feeds the lens and the parallax on the CSS layers. One
     listener, one rAF, two custom properties — the layers do the rest on the
     compositor, so moving the mouse never touches layout. */
  if (!coarse && !reduce) {
    var hero = document.querySelector('.hero'), pend = 0;
    if (hero) {
      addEventListener('pointermove', function (e) {
        var b = hero.getBoundingClientRect();
        if (e.clientY > b.bottom) return;
        px = Math.min(1, Math.max(0, (e.clientX - b.left) / b.width));
        py = Math.min(1, Math.max(0, (e.clientY - b.top) / b.height));
        if (pend) return;
        pend = requestAnimationFrame(function () {
          pend = 0;
          hero.style.setProperty('--mx', (px - 0.5).toFixed(3));
          hero.style.setProperty('--my', (py - 0.5).toFixed(3));
        });
      }, { passive: true });
    }
  }

  var rt = 0;
  addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(function () {
      stop(); bandPrev = null; lensPrev = null;
      if (build()) start();
    }, 220);
  }, { passive: true });
})();

/* ===== the floating contact button =====
   Opens the channels instead of jumping straight to WhatsApp, so someone
   who prefers Instagram or email is not pushed somewhere they don't want
   to be. Closes on outside click, Escape, or picking a channel. */
(function () {
  var fab = document.getElementById('fab');
  var btn = document.getElementById('fabB');
  if (!fab || !btn) return;
  function set(open) {
    fab.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  btn.addEventListener('click', function (e) {
    e.stopPropagation();
    set(!fab.classList.contains('open'));
  });
  document.addEventListener('click', function (e) {
    if (!fab.contains(e.target)) set(false);
  });
  addEventListener('keydown', function (e) { if (e.key === 'Escape') set(false); });
  fab.addEventListener('click', function (e) { if (e.target.closest('.fab-i')) set(false); });
})();

/* ===== the offer =====
   Shown once, after a delay, and remembered for a while if dismissed —
   nobody should meet the same popup on every visit. */
(function () {
  var pop = document.getElementById('pop');
  if (!pop) return;
  var KEY = 'bw_offer_seen';
  var SKEY = 'bw_offer_shown';          // this browsing session only
  var days = parseInt(pop.getAttribute('data-days') || '14', 10);
  var delay = parseInt(pop.getAttribute('data-delay') || '9', 10) * 1000;

  /* ?offer in the address bar always shows it and clears the memory, so the
     offer can be checked at any time — otherwise, once it has been dismissed,
     there is no way to see it again for days and it looks broken. */
  var force = /[?&]offer\b/.test(location.search);
  if (force) { try { localStorage.removeItem(KEY); sessionStorage.removeItem(SKEY); } catch (e) {} }

  if (!force) {
    try {
      var seen = parseInt(localStorage.getItem(KEY) || '0', 10);
      if (seen && Date.now() - seen < days * 864e5) return;
      // it has already had its turn this visit; don't meet it on every page
      if (sessionStorage.getItem(SKEY)) return;
    } catch (e) {}
  }

  function remember() {
    try { localStorage.setItem(KEY, String(Date.now())); } catch (e) {}
  }
  function close() {
    pop.classList.remove('on');
    document.body.classList.remove('locked');
    remember();
    setTimeout(function () { pop.hidden = true; }, 340);
  }
  function open() {
    var go = document.getElementById('popGo');
    if (go) {
      var ar = document.documentElement.getAttribute('lang') !== 'en';
      var msg = pop.getAttribute('data-msg-' + (ar ? 'ar' : 'en')) || '';
      go.href = 'https://wa.me/201273874839?text=' + encodeURIComponent(msg);
    }
    pop.hidden = false;
    document.body.classList.add('locked');
    try { sessionStorage.setItem(SKEY, '1'); } catch (e) {}
    requestAnimationFrame(function () { pop.classList.add('on'); });
  }

  var fired = false;
  function fire() { if (!fired) { fired = true; open(); } }
  var t = setTimeout(fire, delay);

  // someone heading for the tab bar is about to leave; say it now
  document.addEventListener('mouseout', function (e) {
    if (!e.relatedTarget && e.clientY <= 0) { clearTimeout(t); fire(); }
  });

  var x = document.getElementById('popX'), skip = document.getElementById('popSkip');
  if (x) x.addEventListener('click', close);
  if (skip) skip.addEventListener('click', close);
  pop.addEventListener('click', function (e) { if (e.target === pop) close(); });
  addEventListener('keydown', function (e) { if (e.key === 'Escape' && !pop.hidden) close(); });
  var go2 = document.getElementById('popGo');
  if (go2) go2.addEventListener('click', remember);
})();

/* ===== leave your details =====
   Posts to a Google Apps Script bound to his own spreadsheet, so the
   leads land somewhere he owns. Until that endpoint is filled in — and
   if the request ever fails — the same answers go to WhatsApp instead,
   so the form is never a dead end. */
(function () {
  var form = document.getElementById('lead');
  if (!form) return;
  var msg = document.getElementById('leadMsg');
  var btn = document.getElementById('leadBtn');
  var endpoint = (form.getAttribute('data-endpoint') || '').trim();

  function t(name) {
    var en = document.documentElement.getAttribute('lang') === 'en';
    return form.getAttribute('data-' + name + '-' + (en ? 'en' : 'ar')) || '';
  }

  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    var data = {};
    Array.prototype.forEach.call(form.querySelectorAll('input'), function (i) {
      data[i.name] = i.value.trim();
    });
    if (!data.name || !data.phone) {
      msg.className = 'lead-msg bad';
      msg.textContent = document.documentElement.getAttribute('lang') === 'en'
        ? 'Name and WhatsApp number, please.' : 'محتاج الاسم ورقم الواتساب.';
      return;
    }

    // whatever they picked in the three questions rides along
    var picked = [];
    document.querySelectorAll('.ask .chip.on').forEach(function (c) {
      picked.push(c.getAttribute('data-ar'));
    });
    data.needs = picked.join(' / ');
    data.lang = document.documentElement.getAttribute('lang');
    data.page = location.pathname;
    data.referrer = document.referrer || 'direct';
    data.at = new Date().toISOString();

    var waHref = document.getElementById('waBtn');
    function toWhatsApp() {
      var line = data.name + ' — ' + data.phone + (data.needs ? ' — ' + data.needs : '');
      var base = waHref ? waHref.href.split('?text=')[0] : 'https://wa.me/201273874839';
      window.open(base + '?text=' + encodeURIComponent(line), '_blank', 'noopener');
    }

    if (!endpoint) { toWhatsApp(); return; }

    btn.disabled = true;
    btn.setAttribute('aria-busy', 'true');
    msg.className = 'lead-msg';
    msg.textContent = t('busy');

    var done = false;
    function finish(ok) {
      if (done) return; done = true;
      btn.disabled = false;
      btn.removeAttribute('aria-busy');
      msg.className = 'lead-msg ' + (ok ? 'ok' : 'bad');
      msg.textContent = ok ? t('ok') : t('err');
      if (ok) form.classList.add('sent'); else toWhatsApp();
    }

    var guard = setTimeout(function () { finish(false); }, 9000);
    fetch(endpoint, {
      method: 'POST',
      mode: 'no-cors',                       // Apps Script answers without CORS headers
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(data)
    }).then(function () {
      clearTimeout(guard); finish(true);
    }).catch(function () {
      clearTimeout(guard); finish(false);
    });
  });
})();

/* ===== links that land on a chosen answer =====
   A "logo" link anywhere on the site can drop someone into the contact
   block with that answer already picked, so they only have to add their
   number. Works same-page (data-ask) and across pages (?ask=0). */
(function () {
  function pick(n) {
    var q = document.querySelector('.ask .ask-q');
    if (!q) return;
    var chip = q.querySelectorAll('.chip')[n];
    if (chip && !chip.classList.contains('on')) chip.click();
  }
  var fromUrl = new URLSearchParams(location.search).get('ask');
  if (fromUrl !== null && /^\d+$/.test(fromUrl)) {
    pick(parseInt(fromUrl, 10));
    var target = document.getElementById('contact');
    if (target) setTimeout(function () {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 260);
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest('[data-ask]');
    if (!a) return;
    var n = parseInt(a.getAttribute('data-ask'), 10);
    if (isNaN(n)) return;
    if (document.querySelector('.ask')) pick(n);
  });
})();

/* ===== the services list =====
   One service open at a time. The panel height is measured rather than
   animated from 0fr, because that CSS is newer than some of the browsers
   these clients are on and the panel would simply never open. After the
   transition the cap is released, so a late image load cannot clip the panel.
   The collapsed state and the no-script fallback both live in the stylesheet;
   this only supplies the exact height so the motion is smooth. */
(function () {
  var rows = [].slice.call(document.querySelectorAll('.svl-r'));
  if (!rows.length) return;
  var panel = function (r) { return r.querySelector('.svl-p'); };
  var head  = function (r) { return r.querySelector('.svl-h'); };

  function shut(r) {
    var p = panel(r);
    p.style.maxHeight = p.scrollHeight + 'px';   // from its real height, not none
    requestAnimationFrame(function () {
      r.classList.remove('on');
      head(r).setAttribute('aria-expanded', 'false');
      p.style.maxHeight = '0px';
    });
  }
  function show(r) {
    var p = panel(r);
    r.classList.add('on');
    head(r).setAttribute('aria-expanded', 'true');
    p.style.maxHeight = p.scrollHeight + 'px';
  }

  rows.forEach(function (r) {
    var p = panel(r);
    if (r.classList.contains('on')) p.style.maxHeight = p.scrollHeight + 'px';

    p.addEventListener('transitionend', function (e) {
      if (e.propertyName === 'max-height' && r.classList.contains('on')) p.style.maxHeight = 'none';
    });

    head(r).addEventListener('click', function () {
      var open = r.classList.contains('on');
      rows.forEach(function (o) { if (o !== r && o.classList.contains('on')) shut(o); });
      if (open) shut(r); else show(r);
    });
  });

  // an uncapped panel has to be re-measured when the columns reflow
  var rt;
  addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(function () {
      rows.forEach(function (r) { if (r.classList.contains('on')) panel(r).style.maxHeight = 'none'; });
    }, 180);
  });
})();

/* ===== the services menu =====
   Hover opens it, but with a short delay each way: without the closing delay
   it flickers shut whenever the pointer cuts across a corner on its way to
   something else. Focus opens it too, so it is reachable from the keyboard,
   and it closes on Escape or on a click outside.

   The trigger is a BUTTON, not a link. Testing by accessibility practitioners
   has found aria-expanded on a link confuses every kind of user, and on a
   touch screen a control that both navigates and discloses is a trap — the
   first tap fires both. The panel's own "All services" row is the link to the
   section, so nothing is lost by making this a plain disclosure. */
(function () {
  var d = document.querySelector('.nav-d');
  if (!d) return;
  var trigger = d.querySelector('.nav-dt');
  var panel = d.querySelector('.nav-p');
  var inT = 0, outT = 0;

  function set(open) {
    d.classList.toggle('open', open);
    trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  function open()  { clearTimeout(outT); clearTimeout(inT); inT = setTimeout(function () { set(true); }, 70); }
  function close(ms) { clearTimeout(inT); clearTimeout(outT); outT = setTimeout(function () { set(false); }, ms === undefined ? 190 : ms); }

  if (matchMedia('(hover:hover) and (pointer:fine)').matches) {
    d.addEventListener('mouseenter', open);
    d.addEventListener('mouseleave', function () { close(); });
  }
  // click and keyboard work everywhere, hover or not
  trigger.addEventListener('click', function () {
    clearTimeout(inT); clearTimeout(outT);
    set(!d.classList.contains('open'));
  });

  /* Focus landing INSIDE the panel keeps it open — that is someone tabbing in.
     Focus landing on the trigger itself must not open it, or pressing Enter
     straight after would toggle it shut again, which is what it did. */
  d.addEventListener('focusin', function (e) {
    clearTimeout(outT);
    if (e.target !== trigger) set(true);
  });
  d.addEventListener('focusout', function (e) {
    if (!d.contains(e.relatedTarget)) close(0);
  });
  addEventListener('keydown', function (e) {
    if (e.key !== 'Escape' || !d.classList.contains('open')) return;
    /* Shut it on the spot rather than through close(), which schedules it:
       moving focus to the trigger fires focusin, and focusin clears exactly
       that pending timer, so the panel never actually closed. */
    clearTimeout(inT); clearTimeout(outT);
    set(false);
    // focus goes back where it came from, or it is stranded mid-page
    if (d.contains(document.activeElement)) trigger.focus();
  });
  document.addEventListener('click', function (e) { if (!d.contains(e.target)) close(0); });
  // following a link inside should not leave the panel hanging open
  panel.addEventListener('click', function () { close(0); });
})();
