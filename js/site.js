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
   A field of monospace glyphs on a canvas: drawn once, then only a handful
   of cells repainted per tick. ~18 fillText calls at 11fps instead of
   thousands at 60 — the difference between a texture and a space heater.
   It halts the moment the hero is off screen, and holds still for anyone
   who asked for reduced motion. */
(function () {
  var cv = document.getElementById('heroBg');
  if (!cv || !cv.getContext) return;
  var ctx = cv.getContext('2d', { alpha: true });
  if (!ctx) return;

  var GLYPHS = '01{}<>/\;:=+*#[]()$%&|_.—01'.split('');
  var CELL = 26, FONT = 13;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var cols = 0, rows = 0, dpr = 1, cells = null, running = false, timer = 0;

  function glyph() { return GLYPHS[(Math.random() * GLYPHS.length) | 0]; }

  function paintCell(c, r) {
    var x = c * CELL, y = r * CELL;
    ctx.clearRect(x, y, CELL, CELL);
    var v = cells[r * cols + c];
    if (!v) return;
    ctx.fillStyle = v.hot
      ? 'rgba(232,80,2,' + v.a.toFixed(3) + ')'
      : 'rgba(244,242,239,' + v.a.toFixed(3) + ')';
    ctx.fillText(v.g, x + CELL / 2, y + CELL / 2);
  }

  function build() {
    var box = cv.getBoundingClientRect();
    if (box.width < 2 || box.height < 2) return false;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(box.width * dpr);
    cv.height = Math.round(box.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.font = '700 ' + FONT + 'px "Space Mono", ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    cols = Math.ceil(box.width / CELL);
    rows = Math.ceil(box.height / CELL);
    cells = new Array(cols * rows);
    for (var i = 0; i < cells.length; i++) {
      cells[i] = Math.random() < 0.46
        ? { g: glyph(), a: 0.02 + Math.random() * 0.07, hot: Math.random() < 0.025 }
        : null;
    }
    ctx.clearRect(0, 0, box.width, box.height);
    for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) paintCell(c, r);
    return true;
  }

  function tick() {
    if (!running) return;
    for (var n = 0; n < 18; n++) {
      var c = (Math.random() * cols) | 0, r = (Math.random() * rows) | 0;
      var i = r * cols + c;
      cells[i] = Math.random() < 0.52
        ? { g: glyph(), a: 0.02 + Math.random() * 0.09, hot: Math.random() < 0.05 }
        : null;
      paintCell(c, r);
    }
    timer = setTimeout(function () { requestAnimationFrame(tick); }, 90);
  }

  function start() { if (running || reduce || !cells) return; running = true; tick(); }
  function stop() { running = false; clearTimeout(timer); }

  if (!build()) { addEventListener('load', build); }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) {
      es[0].isIntersecting ? start() : stop();
    }, { threshold: 0 }).observe(cv);
  } else { start(); }

  document.addEventListener('visibilitychange', function () {
    document.hidden ? stop() : start();
  });

  var rt = 0;
  addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(function () { stop(); if (build()) start(); }, 220);
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
  var days = parseInt(pop.getAttribute('data-days') || '14', 10);
  var delay = parseInt(pop.getAttribute('data-delay') || '9', 10) * 1000;

  try {
    var seen = parseInt(localStorage.getItem(KEY) || '0', 10);
    if (seen && Date.now() - seen < days * 864e5) return;
  } catch (e) {}

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
