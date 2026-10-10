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
  /* Section heads rise only on a desktop (style.css: .reveal-heads). They are
     not even observed on a phone: observing them there shifted the phone's
     text rendering by a sub-pixel, and the phone is kept exactly as it was.
     A page opened narrow and widened later simply shows its heads. */
  var wideHeads = matchMedia('(min-width: 861px)').matches;
  if (wideHeads) document.documentElement.classList.add('reveal-heads');
  var targets = document.querySelectorAll(wideHeads ? '.up, .rv, .mega, .shead' : '.up, .rv, .mega');
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
   A quiet, precise surface with a lens of glass moving over it.

   This replaced a field of code glyphs. The glyphs were legible and they
   animated, but they did not say anything to the person looking at them — the
   first question anyone asked was "what is this meant to be?", which is the
   whole answer. A measured grid says the same thing a designer's hero needs to
   say — this was laid out on purpose — without asking to be read.

   The lens is the point. It follows the pointer with a lag, so it feels like
   an object with weight being led rather than a cursor, and it drifts on its
   own once the pointer has been still for a while. What it does is MAGNIFY:
   the grid under it is genuinely larger and brighter inside the glass. That is
   what glass does to what is behind it, and it is the one part of the look a
   gradient cannot fake.

   Deliberately NOT used anywhere here: filter:blur(), backdrop-filter,
   mix-blend-mode, mask-image. All four were measured on this page and a
   surface this size cannot afford any of them. See the note in the stylesheet.

   The surface is drawn ONCE to an offscreen canvas and never redrawn. The only
   per-frame work is repairing the rectangle the lens has left and drawing it
   again — so the cost does not depend on the size of the hero. */
(function () {
  var cv = document.getElementById('heroBg');
  if (!cv || !cv.getContext) return;
  var ctx = cv.getContext('2d', { alpha: true });
  if (!ctx) return;

  var INK = '244,242,239', HOT = '232,80,2', COOL = '86,132,168';
  var STEP = 58;                               // the grid, in CSS pixels

  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var coarse = matchMedia('(pointer: coarse)').matches;
  var thin = (navigator.hardwareConcurrency || 8) <= 4 ||
             (navigator.connection && navigator.connection.saveData);

  var off = document.createElement('canvas');
  var octx = off.getContext('2d', { alpha: true });
  if (!octx) return;

  var W = 0, H = 0, dpr = 1, ready = false;
  var running = false, raf = 0, last = 0;
  var FRAME = 1000 / (thin ? 24 : 30);

  /* The grid fades out at the top and bottom so it never collides with the
     header or the strip below. Baked into the alpha here, which is free —
     a CSS mask doing the same thing cost this page 40 frames a second. */
  function ramp(y) {
    var t = y / H;
    if (t < 0.08) return t / 0.08;
    if (t > 0.72) return Math.max(0, 1 - (t - 0.72) / 0.28);
    return 1;
  }

  function surface() {
    octx.setTransform(dpr, 0, 0, dpr, 0, 0);
    octx.clearRect(0, 0, W, H);
    octx.lineWidth = 1 / dpr < 0.5 ? 0.5 : 1 / dpr;

    // the lines
    for (var y = STEP; y < H; y += STEP) {
      var a = 0.050 * ramp(y);
      if (a < 0.004) continue;
      octx.strokeStyle = 'rgba(' + INK + ',' + a.toFixed(3) + ')';
      octx.beginPath(); octx.moveTo(0, y + 0.5); octx.lineTo(W, y + 0.5); octx.stroke();
    }
    for (var x = STEP; x < W; x += STEP) {
      octx.beginPath();
      for (var yy = 0; yy < H; yy += 4) {
        var av = 0.050 * ramp(yy);
        if (av < 0.004) continue;
        octx.strokeStyle = 'rgba(' + INK + ',' + av.toFixed(3) + ')';
        octx.beginPath(); octx.moveTo(x + 0.5, yy); octx.lineTo(x + 0.5, yy + 4); octx.stroke();
      }
    }

    /* Nodes at some of the intersections. Without them the grid is perfectly
       even and the lens has nothing to magnify — the eye needs a detail to
       catch for the refraction to register at all. */
    var seed = 20260104;
    function rnd() { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; }
    for (var gy = STEP; gy < H; gy += STEP) {
      for (var gx = STEP; gx < W; gx += STEP) {
        var r = rnd();
        if (r > 0.30) continue;
        var k = ramp(gy);
        if (k < 0.05) continue;
        var warm = r < 0.045;
        var big = r < 0.09;
        octx.fillStyle = 'rgba(' + (warm ? HOT : r < 0.075 ? COOL : INK) + ',' +
                         ((warm ? 0.62 : big ? 0.30 : 0.16) * k).toFixed(3) + ')';
        octx.beginPath();
        octx.arc(gx + 0.5, gy + 0.5, big ? 2.1 : 1.25, 0, 6.2832);
        octx.fill();
      }
    }
    octx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.globalAlpha = 1;
    ctx.drawImage(off, 0, 0);
  }

  function build() {
    var box = cv.getBoundingClientRect();
    if (box.width < 2 || box.height < 2) return false;
    dpr = Math.min(window.devicePixelRatio || 1, thin ? 1.25 : 1.6);
    W = box.width; H = box.height;
    cv.width = off.width = Math.round(W * dpr);
    cv.height = off.height = Math.round(H * dpr);
    surface();
    /* Keep the lens where it was. build() runs again on a resize, and
       resetting here is what made it snap back to the middle. */
    if (ready && W && H) { lx = keepX * W; ly = keepY * H; }
    else { lx = W * 0.5; ly = H * 0.42; }
    ready = true;
    return true;
  }

  function repair(x, y, w, h) {
    var sx = Math.max(0, Math.floor(x * dpr) - 2), sy = Math.max(0, Math.floor(y * dpr) - 2);
    var sw = Math.min(cv.width - sx, Math.ceil(w * dpr) + 4);
    var sh = Math.min(cv.height - sy, Math.ceil(h * dpr) + 4);
    if (sw <= 0 || sh <= 0) return;
    ctx.globalAlpha = 1;
    ctx.clearRect(sx, sy, sw, sh);
    ctx.drawImage(off, sx, sy, sw, sh, sx, sy, sw, sh);
  }

  /* ---- where the lens is ----
     aim is where it WANTS to be, 0..1 of the hero. The pointer sets it
     directly; when the pointer has been still for a while, or there is no
     pointer at all, aim goes back to drifting on two slow sine waves of
     different periods so the path never visibly repeats.
     The lens itself eases toward aim, which is what gives it weight. */
  var aimX = 0.5, aimY = 0.42, lx = 0, ly = 0, lensPrev = null;
  var keepX = 0.5, keepY = 0.42;
  var lastMove = -1e9, t0 = 0;
  var MAG = 1.62;
  var IDLE = 2200;

  function drift(t) {
    t /= 1000;
    aimX = 0.5 + 0.26 * Math.sin(t / 11.3) + 0.07 * Math.sin(t / 3.7);
    /* On a phone there is no pointer, so this path is the only one the lens
       ever takes — and the hero is tall and narrow there, which put the lens
       right on top of the paragraph. It stays in the upper half on touch. */
    aimY = coarse
      ? 0.33 + 0.12 * Math.sin(t / 8.1 + 1.1) + 0.04 * Math.sin(t / 2.9)
      : 0.44 + 0.17 * Math.sin(t / 8.1 + 1.1) + 0.05 * Math.sin(t / 2.9);
  }

  function drawLens(R, t) {
    var d = dpr, cx = lx * d, cy = ly * d, rr = R * d;

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, rr, 0, 6.2832);
    ctx.clip();

    /* Real magnification: the same pixels drawn larger about the centre.
       Only the lens's own box is handed to drawImage — passing the whole
       canvas and letting clip() throw the rest away looks identical and
       measured 17fps slower, because the clip does not stop the scale from
       being computed. */
    var k = R / MAG;
    ctx.globalAlpha = 1;
    ctx.drawImage(off,
      (lx - k) * d, (ly - k) * d, 2 * k * d, 2 * k * d,
      (lx - R) * d, (ly - R) * d, 2 * R * d, 2 * R * d);

    /* A second copy a little larger and barely there. Two offset copies of
       the same pixels give the doubled, smeared quality of thick glass —
       which is what a blend mode would have been used for, at a cost this
       page cannot pay. */
    ctx.globalAlpha = 0.26;
    var k2 = R / (MAG * 1.16);
    ctx.drawImage(off,
      (lx - k2) * d, (ly - k2) * d, 2 * k2 * d, 2 * k2 * d,
      (lx - R) * d, (ly - R) * d, 2 * R * d, 2 * R * d);
    ctx.globalAlpha = 1;

    // the body: barely lifted in the middle, the light collecting at the rim
    var g = ctx.createRadialGradient(cx, cy, rr * 0.08, cx, cy, rr);
    g.addColorStop(0.00, 'rgba(' + INK + ',.050)');
    g.addColorStop(0.58, 'rgba(' + INK + ',.034)');
    g.addColorStop(0.86, 'rgba(' + INK + ',.105)');
    g.addColorStop(0.96, 'rgba(240,214,166,.26)');
    g.addColorStop(1.00, 'rgba(' + HOT + ',.20)');
    ctx.fillStyle = g;
    ctx.fillRect(cx - rr, cy - rr, rr * 2, rr * 2);
    ctx.restore();

    /* The rim, and a glint travelling round it. The glint is the thing the eye
       reads as "this is alive" — more than the refraction is. */
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, rr, 0, 6.2832);
    ctx.strokeStyle = 'rgba(' + INK + ',.17)';
    ctx.lineWidth = Math.max(1, 1.1 * d);
    ctx.stroke();

    var a0 = (t / 2800) % 6.2832;
    ctx.beginPath();
    ctx.arc(cx, cy, rr, a0, a0 + 1.0);
    ctx.strokeStyle = 'rgba(246,228,194,.52)';
    ctx.lineWidth = Math.max(1, 1.7 * d);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, rr, a0 + 3.14, a0 + 3.62);
    ctx.strokeStyle = 'rgba(' + HOT + ',.30)';
    ctx.stroke();
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function frame(ms) {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    if (ms - last < FRAME) return;
    last = ms;
    if (!t0) t0 = ms;
    var t = ms - t0;

    // the pointer leads; left alone, it goes back to drifting
    if (coarse || ms - lastMove > IDLE) drift(t);

    var R = Math.max(62, Math.min(W, H) * (coarse ? 0.125 : 0.112));
    var tx = aimX * W, ty = aimY * H;
    var ease = (ms - lastMove < IDLE) ? 0.14 : 0.045;   // keen under the hand, slow on its own
    lx += (tx - lx) * ease;
    ly += (ty - ly) * ease;

    if (lensPrev) {
      var x0 = Math.min(lensPrev[0], lx) - R, y0 = Math.min(lensPrev[1], ly) - R;
      repair(x0, y0, Math.abs(lx - lensPrev[0]) + R * 2, Math.abs(ly - lensPrev[1]) + R * 2);
    }
    drawLens(R, t);
    lensPrev = [lx, ly];
    keepX = lx / W; keepY = ly / H;      // survives a rebuild
  }

  function start() {
    if (running || !ready) return;
    running = true;
    if (reduce) { surface(); return; }       // one still frame, and stop
    last = 0;
    raf = requestAnimationFrame(frame);
  }
  function stop() { running = false; cancelAnimationFrame(raf); }

  if (!build()) addEventListener('load', function () { if (build()) start(); });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) {
      es[0].isIntersecting ? start() : stop();
    }, { threshold: 0 }).observe(cv);
  } else { start(); }

  document.addEventListener('visibilitychange', function () {
    document.hidden ? stop() : start();
  });

  /* One listener for the pointer. It sets where the lens is aiming and nudges
     the two custom properties the CSS layers parallax from — the layers do the
     rest on the compositor, so moving the mouse never touches layout. */
  if (!coarse && !reduce) {
    var hero = document.querySelector('.hero'), pend = 0;
    if (hero) {
      /* The pointer has to be mapped into the CANVAS, not into the hero. The
         canvas is deliberately taller than the hero — it is inset -7% so the
         drift has somewhere to go — so treating a hero-relative position as a
         canvas-relative one put the lens up to 300px from the pointer, which
         is why it did not read as following anything.

         Both rectangles are cached rather than read per move: a layout read
         inside a pointermove handler is the thing that makes a page feel
         heavy under the hand. They are refreshed on scroll and on resize,
         which is when they can actually change. */
      var cRect = null, hRect = null, rpend = 0;
      function rects() { cRect = cv.getBoundingClientRect(); hRect = hero.getBoundingClientRect(); }
      rects();
      function remeasure() {
        if (rpend) return;
        rpend = requestAnimationFrame(function () { rpend = 0; rects(); });
      }
      addEventListener('scroll', remeasure, { passive: true });
      addEventListener('resize', remeasure, { passive: true });

      addEventListener('pointermove', function (e) {
        if (!cRect || !hRect) return;
        if (e.clientY > hRect.bottom || e.clientY < hRect.top) return;
        aimX = Math.min(1, Math.max(0, (e.clientX - cRect.left) / cRect.width));
        aimY = Math.min(1, Math.max(0, (e.clientY - cRect.top) / cRect.height));
        lastMove = performance.now();
        var hx = (e.clientX - hRect.left) / hRect.width;
        var hy = (e.clientY - hRect.top) / hRect.height;
        if (pend) return;
        pend = requestAnimationFrame(function () {
          pend = 0;
          hero.style.setProperty('--mx', (hx - 0.5).toFixed(3));
          hero.style.setProperty('--my', (hy - 0.5).toFixed(3));
        });
      }, { passive: true });
    }
  }

  /* MEASURED on a phone: scrolling hides and shows the browser's own address
     bar, and that fires a resize. Rebuilding on it meant the lens jumped back
     to the middle every time the page was touched and moved — which reads
     exactly like something broken. The address bar only ever changes the
     HEIGHT, so a rebuild now needs the width to have actually changed. */
  var rt = 0, lastW = innerWidth;
  addEventListener('resize', function () {
    if (innerWidth === lastW) return;          // the address bar, not a resize
    lastW = innerWidth;
    clearTimeout(rt);
    rt = setTimeout(function () {
      stop(); lensPrev = null;
      if (build()) start();
    }, 220);
  }, { passive: true });

  /* A real orientation change does change the width, and the line above
     catches it. This covers the case where it does not. */
  addEventListener('orientationchange', function () {
    clearTimeout(rt);
    rt = setTimeout(function () {
      stop(); lensPrev = null; lastW = innerWidth;
      if (build()) start();
    }, 320);
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
   Shown once per visit, after a delay.

   Saying "not now" and actually messaging him are different answers, and they
   used to be treated the same: both silenced the offer for fourteen days. The
   person who said not now is precisely the one still deciding — on a site with
   considered traffic they often come back days later, and that is when the
   offer is worth the most. So a dismissal buys a short rest; acting on it buys
   a long one, because showing a discount to someone who already wrote to you
   reads as desperate. Both periods are set in content.py. */
(function () {
  var pop = document.getElementById('pop');
  if (!pop) return;
  var KEY = 'bw_offer_seen';
  var SKEY = 'bw_offer_shown';          // this browsing session only
  var days = parseInt(pop.getAttribute('data-days') || '3', 10);
  var daysActed = parseInt(pop.getAttribute('data-days-acted') || '60', 10);
  var delay = parseInt(pop.getAttribute('data-delay') || '9', 10) * 1000;

  /* ?offer in the address bar always shows it and clears the memory, so the
     offer can be checked at any time — otherwise, once it has been dismissed,
     there is no way to see it again for days and it looks broken. */
  var force = /[?&]offer\b/.test(location.search);
  if (force) { try { localStorage.removeItem(KEY); localStorage.removeItem(KEY + '_acted');
                     sessionStorage.removeItem(SKEY); } catch (e) {} }

  if (!force) {
    try {
      var seen = parseInt(localStorage.getItem(KEY) || '0', 10);
      var acted = localStorage.getItem(KEY + '_acted') === '1';
      if (seen && Date.now() - seen < (acted ? daysActed : days) * 864e5) return;
      // it has already had its turn this visit; don't meet it on every page
      if (sessionStorage.getItem(SKEY)) return;
    } catch (e) {}
  }

  function remember(acted) {
    try {
      localStorage.setItem(KEY, String(Date.now()));
      if (acted) localStorage.setItem(KEY + '_acted', '1');
      else localStorage.removeItem(KEY + '_acted');
    } catch (e) {}
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
  if (go2) go2.addEventListener('click', function () { remember(true); });
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
    // a fresh attempt starts clean: no leftover error, no leftover button
    msg.className = 'lead-msg';
    msg.textContent = '';
    var oldWa = form.querySelector('.lead-wa');
    if (oldWa) oldWa.parentNode.removeChild(oldWa);
    var data = {};
    Array.prototype.forEach.call(form.querySelectorAll('input'), function (i) {
      data[i.name] = i.value.trim();
    });

    /* The honeypot. A person never sees this field, so anything in it came
       from a bot. Pretend the send worked rather than showing an error — an
       error tells the bot what to change. */
    if (data.website) {
      delete data.website;
      form.classList.add('sent');
      msg.className = 'lead-msg ok';
      msg.textContent = t('ok');
      return;
    }
    delete data.website;

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
      if (ok) form.classList.add('sent'); else waButton();
    }

    // When the send fails the browser would block a WhatsApp window opened
    // from here (it is no longer a direct click), so the same message is
    // offered as a button — a copy of the page's WhatsApp button.
    function waButton() {
      var line = data.name + ' — ' + data.phone + (data.needs ? ' — ' + data.needs : '');
      var base = waHref ? waHref.href.split('?text=')[0] : 'https://wa.me/201273874839';
      var a = waHref ? waHref.cloneNode(true) : document.createElement('a');
      a.removeAttribute('id');
      a.className = (waHref ? waHref.className + ' ' : 'btn ') + 'lead-wa';
      a.href = base + '?text=' + encodeURIComponent(line);
      a.target = '_blank'; a.rel = 'noopener';
      msg.parentNode.insertBefore(a, msg.nextSibling);
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

/* ===== desktop collage: each piece drifts at its own speed =====
   Desktop only, and only while the collage is on screen. Each item's resting
   centre is measured once (and again on a real resize) — never inside the
   scroll frame — and the frame only writes transforms. */
(function () {
  var box = document.querySelector('.clg');
  if (!box || !('IntersectionObserver' in window)) return;
  var wide = matchMedia('(min-width: 861px)');
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;
  var items = [].slice.call(box.querySelectorAll('.clg-i, .clg-q')), rest = [], on = false, raf = 0, lastW = 0;
  function measure() {
    lastW = innerWidth;
    items.forEach(function (el) { el.style.transform = ''; });
    rest = items.map(function (el) {
      var r = el.getBoundingClientRect();
      return { c: r.top + scrollY + r.height / 2, s: parseFloat(el.style.getPropertyValue('--s')) || 1 };
    });
  }
  function frame() {
    raf = 0;
    var mid = scrollY + innerHeight / 2;
    for (var i = 0; i < items.length; i++) {
      var d = (mid - rest[i].c) * (rest[i].s - 1) * 0.3;
      items[i].style.transform = 'translate3d(0,' + d.toFixed(1) + 'px,0)';
    }
  }
  function onScroll() { if (on && !raf) raf = requestAnimationFrame(frame); }
  new IntersectionObserver(function (es) {
    on = es[0].isIntersecting && wide.matches;
    if (on) { if (!rest.length) measure(); onScroll(); }
  }, { rootMargin: '20% 0px' }).observe(box);
  addEventListener('scroll', onScroll, { passive: true });
  // the address bar changes height with the same width; only a real width change re-measures
  addEventListener('resize', function () { if (innerWidth !== lastW && rest.length) { measure(); onScroll(); } });
  addEventListener('load', function () { if (rest.length) { measure(); onScroll(); } });
})();
