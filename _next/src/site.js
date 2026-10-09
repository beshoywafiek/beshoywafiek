/* Beshoy Wafiek — the new site.
   One scroll loop, rAF-throttled, reading only numbers cached on load and
   resize. Nothing measures layout inside a scroll or pointer handler. */
(function () {
  'use strict';
  var root = document.documentElement;
  root.classList.remove('no-js');
  root.classList.add('js');
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  var wide = function () { return innerWidth >= 861; };
  var isRtl = function () { return root.getAttribute('dir') === 'rtl'; };
  var lang = function () { return root.getAttribute('lang') === 'en' ? 'en' : 'ar'; };
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var WA = (document.querySelector('a[href^="https://wa.me/"]') || { href: 'https://wa.me/201273874839' }).href.split('?')[0];
  /* Remembered settings (language, the offer). localStorage when the
     browser allows it; inside a sandboxed frame — the preview viewer is
     one — it throws, so fall back to window.name, which survives page to
     page in the same tab. Without that fallback nothing was remembered
     there and the offer reopened over every page. */
  var store = (function () {
    var ls = null;
    try { ls = window.localStorage; ls.setItem('bw_t', '1'); ls.removeItem('bw_t'); } catch (e) { ls = null; }
    function nameMap() { try { return /^bw:/.test(window.name) ? JSON.parse(window.name.slice(3)) : {}; } catch (e) { return {}; } }
    return {
      get: function (k) { return ls ? ls.getItem(k) : (nameMap()[k] || null); },
      set: function (k, v) {
        if (ls) { try { ls.setItem(k, v); } catch (e) {} return; }
        var m = nameMap(); m[k] = v; try { window.name = 'bw:' + JSON.stringify(m); } catch (e) {}
      }
    };
  })();

  /* ---------------- language ---------------- */
  function setLang(l) {
    root.setAttribute('lang', l);
    root.setAttribute('dir', l === 'ar' ? 'rtl' : 'ltr');
    document.title = root.getAttribute('data-t-' + l) || document.title;
  }
  setLang(lang());
  var langBtn = $('#lang');
  if (langBtn) langBtn.addEventListener('click', function () {
    var next = lang() === 'ar' ? 'en' : 'ar';
    setLang(next);
    store.set('bw_lang', next);
    compose();
    measure();
  });

  /* ---------------- fitted type ----------------
     The longest line of a [data-fit] block is set to the full width. */
  var fits = $$('[data-fit]');
  function fit() {
    fits.forEach(function (el) {
      var box = el.parentNode, cs = getComputedStyle(box);
      var avail = box.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      el.style.fontSize = '100px';
      el.style.display = 'inline-block';
      var w = el.getBoundingClientRect().width;
      el.style.display = '';
      if (!w) return;
      var size = 100 * avail / w * 0.995;
      var max = parseFloat(el.getAttribute('data-max')) || 1e9;
      var vh = parseFloat(el.getAttribute('data-vh-' + lang()));
      if (vh) max = Math.min(max, vh * innerHeight);
      el.style.fontSize = Math.min(size, max) + 'px';
    });
  }

  /* ---------------- header + menu ---------------- */
  var hd = $('#hd'), burger = $('#burger'), menu = $('#menu');
  function closeMenu() {
    if (!menu || menu.hidden) return;
    menu.classList.remove('on');
    menu.hidden = true;
    document.body.classList.remove('menu-open');
    burger.setAttribute('aria-expanded', 'false');
  }
  if (burger && menu) {
    burger.addEventListener('click', function () {
      if (!menu.hidden) { closeMenu(); burger.focus(); return; }
      menu.hidden = false;
      void menu.offsetWidth;
      menu.classList.add('on');
      document.body.classList.add('menu-open');
      burger.setAttribute('aria-expanded', 'true');
      var first = $('a', menu); if (first) first.focus({ preventScroll: true });
    });
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) closeMenu(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { closeMenu(); } });
    addEventListener('resize', function () { if (wide()) closeMenu(); });
  }

  /* ---------------- reveal ---------------- */
  var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) {
    es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 }) : null;
  $$('.rv').forEach(function (el) { if (io && !reduce) io.observe(el); else el.classList.add('in'); });

  /* ---------------- cached geometry ---------------- */
  var G = { vh: innerHeight, vw: innerWidth };
  var reel = $('.reel'), reelTr = $('#reelTr'), reelBar = $('#reelBar'), reelC = $('#reelC');
  var mf = $('.mf-t'), mfWords = mf ? $$('.w', mf) : [];
  var csCover = $('.cs-cover-in img');
  var heroEl = $('.hero');

  function top(el) { var t = 0; while (el) { t += el.offsetTop; el = el.offsetParent; } return t; }

  function measure() {
    G.vh = innerHeight; G.vw = innerWidth;
    fit();
    if (reel && reelTr) {
      var pin = wide() && !reduce;
      reel.classList.toggle('pin', pin);
      reelTr.style.transform = '';
      if (pin) {
        G.reelDist = Math.max(0, reelTr.scrollWidth - G.vw);
        reel.style.setProperty('--reel-h', (G.reelDist + G.vh) + 'px');
        G.reelTop = top(reel);
        G.reelLen = G.reelDist;
        G.panels = reelTr.children.length - 1;
      } else {
        reel.style.removeProperty('--reel-h');
        G.reelDist = 0;
      }
    }
    if (mf) { G.mfTop = top(mf); G.mfH = mf.offsetHeight; }
    if (csCover) { G.cvTop = top(csCover.parentNode); G.cvH = csCover.parentNode.offsetHeight; }
    if (heroEl) { G.heroTop = top(heroEl); G.heroH = heroEl.offsetHeight; }
    frame();
  }

  /* ---------------- the scroll loop ---------------- */
  var lastY = scrollY, ticking = false, hideAt = 0;
  function frame() {
    ticking = false;
    var y = scrollY;
    // header hides going down, returns going up
    if (hd && !/menu-open|locked/.test(document.body.className)) {
      if (y > 160 && y > lastY + 4) hd.classList.add('hide');
      else if (y < lastY - 4 || y < 160) hd.classList.remove('hide');
    }
    lastY = y;
    // the reel
    if (reel && G.reelDist) {
      var p = Math.min(1, Math.max(0, (y - G.reelTop) / G.reelLen));
      var x = p * G.reelDist * (isRtl() ? 1 : -1);
      reelTr.style.transform = 'translate3d(' + x.toFixed(1) + 'px,0,0)';
      if (reelBar) reelBar.style.transform = 'scaleX(' + p.toFixed(3) + ')';
      if (reelC) {
        var idx = Math.min(G.panels, Math.floor(p * G.panels + 0.5) + 1);
        reelC.textContent = (idx < 10 ? '0' : '') + Math.min(idx, G.panels);
      }
    }
    // the manifesto lights word by word
    if (mfWords.length && !reduce) {
      var start = G.mfTop - G.vh * 0.85, end = G.mfTop + G.mfH - G.vh * 0.45;
      var q = Math.min(1, Math.max(0, (y - start) / (end - start)));
      var lit = Math.round(q * mfWords.length);
      for (var i = 0; i < mfWords.length; i++) mfWords[i].classList.toggle('on', i < lit);
    }
    // the case cover eases in
    if (csCover && !reduce) {
      var c = Math.min(1, Math.max(0, (y - (G.cvTop - G.vh)) / (G.vh + G.cvH)));
      csCover.style.setProperty('--cz', (1.12 - c * 0.12).toFixed(4));
    }
  }
  addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(frame); }
  }, { passive: true });

  // only a real width change rebuilds: a phone's address bar fires resize too
  var rzW = innerWidth, rzT;
  addEventListener('resize', function () {
    if (innerWidth === rzW && innerWidth < 861) { G.vh = innerHeight; return; }
    rzW = innerWidth;
    clearTimeout(rzT); rzT = setTimeout(measure, 120);
  });
  addEventListener('orientationchange', function () { setTimeout(measure, 300); });

  /* ---------------- hero: the window and the trail ---------------- */
  var winTimer = null, heroOn = true;
  function cycle() {
    $$('.hn-win').forEach(function (w) {
      var imgs = w.children, n = imgs.length, cur = 0;
      for (var i = 0; i < n; i++) if (imgs[i].classList.contains('on')) cur = i;
      imgs[cur].classList.remove('on');
      var nx = imgs[(cur + 1) % n];
      if (nx.loading === 'lazy') nx.loading = 'eager';
      nx.classList.add('on');
    });
  }
  function winStart() { if (!winTimer && !reduce && heroOn && !document.hidden) winTimer = setInterval(cycle, 900); }
  function winStop() { clearInterval(winTimer); winTimer = null; }
  if ($('.hn-win') && !reduce) {
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) {
      heroOn = es[0].isIntersecting; heroOn ? winStart() : winStop();
    }).observe($('.hero'));
    document.addEventListener('visibilitychange', function () { document.hidden ? winStop() : winStart(); });
    winStart();
  }

  var trail = $('.hero-trail');
  if (trail && fine && !reduce && trail.animate) {
    var pool = $$('img', trail), k = 0, lx = -999, ly = -999, z = 1;
    pool.forEach(function (im) { im.loading = 'eager'; });
    heroEl.addEventListener('pointermove', function (e) {
      if (e.target.closest('a, button')) return;
      var x = e.clientX, yy = e.clientY + scrollY - G.heroTop;
      if (Math.hypot(x - lx, yy - ly) < 110) return;
      lx = x; ly = yy;
      var im = pool[k++ % pool.length];
      if (!im.complete || !im.naturalWidth) return;
      var w = im.offsetWidth, h = im.offsetHeight;
      var tx = x - w / 2, ty = yy - h / 2, r = (Math.random() * 14 - 7).toFixed(1);
      im.style.zIndex = ++z;
      im.animate([
        { transform: 'translate(' + tx + 'px,' + ty + 'px) scale(.55) rotate(' + r + 'deg)', opacity: 0 },
        { transform: 'translate(' + tx + 'px,' + ty + 'px) scale(1) rotate(' + r + 'deg)', opacity: 1, offset: .18 },
        { transform: 'translate(' + tx + 'px,' + ty + 'px) scale(1) rotate(' + r + 'deg)', opacity: 1, offset: .7 },
        { transform: 'translate(' + tx + 'px,' + (ty + 60) + 'px) scale(.92) rotate(' + r + 'deg)', opacity: 0 }
      ], { duration: 1500, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'both' });
    });
  }

  /* ---------------- cursor ---------------- */
  var cur = $('.cur');
  if (cur && fine && !reduce) {
    var cx = -100, cy = -100, tx2 = -100, ty2 = -100, curRun = false;
    function curLoop() {
      cx += (tx2 - cx) * 0.22; cy += (ty2 - cy) * 0.22;
      cur.style.transform = 'translate3d(' + cx.toFixed(1) + 'px,' + cy.toFixed(1) + 'px,0)';
      if (Math.abs(tx2 - cx) > .1 || Math.abs(ty2 - cy) > .1) requestAnimationFrame(curLoop); else curRun = false;
    }
    addEventListener('pointermove', function (e) {
      tx2 = e.clientX; ty2 = e.clientY;
      if (!curRun) { curRun = true; requestAnimationFrame(curLoop); }
    }, { passive: true });
    document.addEventListener('pointerover', function (e) {
      var t = e.target.closest('[data-cur]');
      cur.classList.toggle('big', !!t);
      cur.classList.toggle('off', !t && !!e.target.closest('input, textarea, .lb'));
    });
    document.addEventListener('pointerleave', function () { cur.classList.add('off'); });
    document.addEventListener('pointerenter', function () { cur.classList.remove('off'); });
  }

  /* ---------------- index: filter + hover preview ---------------- */
  $$('.ix-f').forEach(function (group) {
    var list = group.closest('section').querySelector('.ix-l, .wk-g') ||
               document.querySelector('.ix-l, .wk-g');
    group.addEventListener('click', function (e) {
      var b = e.target.closest('.chip'); if (!b) return;
      $$('.chip', group).forEach(function (c) { c.classList.toggle('on', c === b); c.setAttribute('aria-pressed', c === b); });
      var f = b.getAttribute('data-f');
      $$('[data-cat]', list).forEach(function (r) { r.classList.toggle('out', f !== 'all' && r.getAttribute('data-cat') !== f); });
      measure();
    });
  });
  /* ---------------- archive: the preview follows the row in focus ---------------- */
  var arcL = $('#arcL');
  if (arcL) {
    var rowsA = $$('.arc-r', arcL), shotsA = $$('.arc-s');
    function showArc(i) {
      rowsA.forEach(function (r) { r.classList.toggle('on', r.getAttribute('data-i') === i); });
      shotsA.forEach(function (f) { f.classList.toggle('on', f.getAttribute('data-i') === i); });
    }
    showArc('0');
    ['pointerover', 'focusin'].forEach(function (ev) {
      arcL.addEventListener(ev, function (e) {
        var r = e.target.closest('.arc-r'); if (r) showArc(r.getAttribute('data-i'));
      });
    });
    // fetch the large images once the list is idle, so a hover is never empty
    setTimeout(function () { $$('.arc-s img').forEach(function (i) { i.loading = 'eager'; }); }, 1200);
  }

  /* ---------------- counters ---------------- */
  var stats = $$('.stat b[data-n]');
  if (stats.length && io && !reduce) {
    var sio = new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        if (!en.isIntersecting) return;
        sio.unobserve(en.target);
        var el = en.target, n = +el.getAttribute('data-n'), pre = el.getAttribute('data-pre') || '', t0 = null;
        function step(t) {
          if (!t0) t0 = t;
          var p = Math.min(1, (t - t0) / 1400), v = Math.round(n * (1 - Math.pow(1 - p, 4)));
          el.textContent = v.toLocaleString('en-US') + (p === 1 ? pre : '');
          if (p < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
      });
    }, { threshold: .5 });
    stats.forEach(function (s) { s.textContent = '0'; sio.observe(s); });
  } else stats.forEach(function (s) { s.textContent = (+s.getAttribute('data-n')).toLocaleString('en-US') + (s.getAttribute('data-pre') || ''); });

  /* ---------------- marquee pauses off screen ---------------- */
  if ('IntersectionObserver' in window) $$('.mq').forEach(function (m) {
    new IntersectionObserver(function (es) { m.classList.toggle('paused', !es[0].isIntersecting); }).observe(m);
  });

  /* ---------------- the three questions -> one message ---------------- */
  var ask = $('#ask'), waBtn = $('#waBtn'), askMsg = $('#askMsg');
  function compose() {
    var og = $('#offerGo'), of = $('#offerF');
    if (og && of) og.href = WA + '?text=' + encodeURIComponent(of.getAttribute('data-wa-' + lang()));
    if (!ask) return;
    var l = lang(), picked = $$('.ask-q', ask).map(function (q) {
      var on = $('.chip.on', q); return on ? on.getAttribute('data-' + l) : null;
    });
    var text;
    if (picked.every(function (v) { return !v; })) text = ask.getAttribute('data-empty-' + l);
    else {
      var any = ask.getAttribute('data-any-' + l);
      text = ask.getAttribute('data-msg-' + l).replace(/\{(\d)\}/g, function (_, n) { return picked[n - 1] || any; });
    }
    if (askMsg) { askMsg.textContent = text; }
    if (waBtn) waBtn.href = waBtn.href.split('?')[0] + '?text=' + encodeURIComponent(text);
  }
  if (ask) ask.addEventListener('click', function (e) {
    var c = e.target.closest('.chip'); if (!c) return;
    var q = c.closest('.ask-q'), was = c.classList.contains('on');
    $$('.chip', q).forEach(function (x) { x.classList.remove('on'); x.setAttribute('aria-pressed', 'false'); });
    if (!was) { c.classList.add('on'); c.setAttribute('aria-pressed', 'true'); }
    compose();
  });
  compose();

  // links that land on a chosen answer: data-ask on the page, ?ask=n across pages
  function pick(n) {
    var q = ask && $('.ask-q', ask); if (!q) return;
    var c = $$('.chip', q)[n]; if (c && !c.classList.contains('on')) c.click();
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest('[data-ask]'); if (a) pick(+a.getAttribute('data-ask'));
  });
  var qa = new URLSearchParams(location.search).get('ask');
  if (qa !== null && /^\d+$/.test(qa)) pick(+qa);

  /* ---------------- the forms ----------------
     The contact form and the offer's form both post to his Google Apps
     Script (FORM_ENDPOINT) so every lead lands in his sheet. Until that is
     set, and whenever a send fails, the same details go to WhatsApp, so no
     lead is ever lost. */
  $$('form.lead-f').forEach(function (form) {
    var msg = $('.lead-msg', form), btn = $('button[type="submit"]', form);
    var endpoint = (form.getAttribute('data-endpoint') || '').trim();
    var t = function (k) { return form.getAttribute('data-' + k + '-' + lang()) || ''; };
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var data = {};
      $$('input', form).forEach(function (i) { data[i.name] = i.value.trim(); });
      // the honeypot: a person never sees it, so anything there is a bot;
      // pretend it worked rather than tell the bot what to change
      if (data.website) { form.classList.add('sent'); msg.className = 'lead-msg ok'; msg.textContent = t('ok'); return; }
      delete data.website;
      if (!data.name || !data.phone) {
        msg.className = 'lead-msg bad';
        msg.textContent = lang() === 'en' ? 'Name and WhatsApp number, please.' : 'محتاج الاسم ورقم الواتساب.';
        ($('input:invalid', form) || $('input', form)).focus();
        return;
      }
      data.needs = form.getAttribute('data-needs') ||
        $$('.ask .chip.on').map(function (c) { return c.getAttribute('data-ar'); }).join(' / ');
      data.lang = lang(); data.page = location.pathname; data.referrer = document.referrer || 'direct';
      data.at = new Date().toISOString();
      function toWhatsApp() {
        var lead = form.getAttribute('data-wa-' + lang());
        var line = (lead ? lead + '\n' : '') + data.name + ' — ' + data.phone + (!lead && data.needs ? ' — ' + data.needs : '');
        window.open(WA + '?text=' + encodeURIComponent(line), '_blank', 'noopener');
      }
      function finish(ok) {
        btn.disabled = false;
        msg.className = 'lead-msg ' + (ok ? 'ok' : 'bad'); msg.textContent = ok ? t('ok') : t('err');
        if (ok) form.classList.add('sent'); else toWhatsApp();
        form.dispatchEvent(new CustomEvent('lead', { detail: ok }));
      }
      if (!endpoint) { toWhatsApp(); form.dispatchEvent(new CustomEvent('lead', { detail: true })); return; }
      btn.disabled = true; msg.className = 'lead-msg'; msg.textContent = t('busy');
      var done = false, guard = setTimeout(function () { if (!done) { done = true; finish(false); } }, 9000);
      fetch(endpoint, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(data) })
        .then(function () { if (!done) { done = true; clearTimeout(guard); finish(true); } })
        .catch(function () { if (!done) { done = true; clearTimeout(guard); finish(false); } });
    });
  });

  /* ---------------- copy the email ---------------- */
  var copy = $('#copyMail');
  if (copy) copy.addEventListener('click', function () {
    var text = $('#mailA').textContent, label = copy.innerHTML;
    function ok() { copy.textContent = copy.getAttribute('data-ok-' + lang()); setTimeout(function () { copy.innerHTML = label; }, 1600); }
    function sel() { var r = document.createRange(); r.selectNodeContents($('#mailA')); var s = getSelection(); s.removeAllRanges(); s.addRange(r); }
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(ok, sel); else sel();
  });

  /* ---------------- the first-project offer ----------------
     A dialog in the middle of the screen after a few seconds. Closing it
     brings it back in a few days; acting on it (the form or WhatsApp) keeps
     it away much longer, because that person has already reached out. */
  var offer = $('#offer');
  if (offer) {
    var DAY = 864e5, seen = +store.get('bw_offer_seen') || 0, acted = store.get('bw_offer_acted') === '1';
    var wait = (acted ? +offer.getAttribute('data-acted') : +offer.getAttribute('data-days')) * DAY;
    var card = $('.offer-card', offer), lastFocus = null;
    var closeOffer = function (didAct) {
      store.set('bw_offer_seen', String(Date.now()));
      store.set('bw_offer_acted', didAct ? '1' : '0');
      offer.classList.remove('on');
      document.body.classList.remove('locked');
      setTimeout(function () { offer.hidden = true; }, 450);
      if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
    };
    var openOffer = function () {
      if (document.hidden || document.body.classList.contains('menu-open')) return;
      // counted as seen the moment it shows, so it appears once per visit
      // even if it is never closed
      store.set('bw_offer_seen', String(Date.now()));
      lastFocus = document.activeElement;
      offer.hidden = false; void offer.offsetWidth; offer.classList.add('on');
      document.body.classList.add('locked');
      card.focus({ preventScroll: true });
    };
    if (Date.now() - seen > wait) setTimeout(openOffer, (+offer.getAttribute('data-delay') || 5) * 1000);
    offer.addEventListener('click', function (e) {
      if (!e.target.closest('[data-close]')) return;
      closeOffer(false);
      // a click on the dimmed backdrop over the header was meant for the
      // header: close the offer AND follow that link (or open the menu),
      // instead of swallowing the navigation
      if (e.target.classList.contains('offer-bg') && document.elementsFromPoint) {
        var under = document.elementsFromPoint(e.clientX, e.clientY).filter(function (el) {
          return el.closest && el.closest('.hd') && el.closest('a[href], button');
        })[0];
        if (under) under.closest('a[href], button').click();
      }
    });
    $('#offerGo').addEventListener('click', function () { closeOffer(true); });
    $('#offerF').addEventListener('lead', function (e) { if (e.detail) setTimeout(function () { closeOffer(true); }, 2200); });
    document.addEventListener('keydown', function (e) {
      if (offer.hidden) return;
      if (e.key === 'Escape') closeOffer(false);
      if (e.key === 'Tab') {                       // keep the focus inside the dialog
        var f = $$('button, a[href], input:not([tabindex="-1"])', card).filter(function (x) { return x.offsetParent; });
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && (document.activeElement === first || document.activeElement === card)) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
  }

  /* ---------------- lightbox on case pages ---------------- */
  var lb = $('#lb');
  if (lb) {
    var items = $$('.gi'), at = 0, lbImg = $('img', lb), lbC = $('.lb-c', lb), opener = null;
    function show(i) {
      at = (i + items.length) % items.length;
      lbImg.src = items[at].getAttribute('data-hi');
      lbC.textContent = (at + 1) + ' / ' + items.length;
    }
    items.forEach(function (a, i) {
      a.addEventListener('click', function (e) {
        if (e.metaKey || e.ctrlKey) return;
        e.preventDefault(); opener = a; lb.hidden = false; show(i); $('.lb-x', lb).focus();
        document.body.classList.add('locked');
      });
    });
    function closeLb() { lb.hidden = true; lbImg.removeAttribute('src'); document.body.classList.remove('locked'); if (opener) opener.focus(); }
    $('.lb-x', lb).addEventListener('click', closeLb);
    $('.lb-p', lb).addEventListener('click', function () { show(at - 1); });
    $('.lb-n', lb).addEventListener('click', function () { show(at + 1); });
    lb.addEventListener('click', function (e) { if (e.target === lb) closeLb(); });
    document.addEventListener('keydown', function (e) {
      if (lb.hidden) return;
      if (e.key === 'Escape') closeLb();
      if (e.key === 'ArrowRight') show(at + (isRtl() ? -1 : 1));
      if (e.key === 'ArrowLeft') show(at + (isRtl() ? 1 : -1));
    });
  }

  /* ---------------- navigation ----------------
     Links are plain links: the browser navigates the moment they are
     clicked. (An earlier version held every click for a 520ms wipe and
     navigated by script — measured at ~1.45s a click on a phone, and in a
     sandboxed frame it could stall on the orange sheet.) The cross-page
     fade is the browser's own view transition, in the CSS, and costs no
     wait. To make the next page instant, it is prefetched the moment a
     pointer or finger reaches its link. */
  var fetched = {};
  function prefetch(e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a || a.target === '_blank') return;
    var u = new URL(a.href, location.href);
    if (u.origin !== location.origin || u.pathname === location.pathname || fetched[u.pathname]) return;
    fetched[u.pathname] = 1;
    var l = document.createElement('link'); l.rel = 'prefetch'; l.href = u.pathname; document.head.appendChild(l);
  }
  document.addEventListener('pointerover', prefetch, { passive: true });
  document.addEventListener('touchstart', prefetch, { passive: true });
  document.addEventListener('focusin', prefetch);

  // "back to top" scrolls this page; it never leaves it
  $$('.to-top').forEach(function (a) {
    a.addEventListener('click', function (e) { e.preventDefault(); scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); });
  });

  /* ---------------- start ---------------- */
  function ready() { measure(); root.classList.add('ready'); }
  if (document.fonts && document.fonts.ready) {
    var started = false;
    document.fonts.ready.then(function () { if (!started) { started = true; ready(); } });
    setTimeout(function () { if (!started) { started = true; ready(); } }, 1500);
  } else ready();
  addEventListener('load', measure);
})();
