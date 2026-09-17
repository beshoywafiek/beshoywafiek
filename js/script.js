  var yearNodes = [document.getElementById('yearAr'), document.getElementById('yearEn')];
  var currentYear = String(new Date().getFullYear());
  yearNodes.forEach(function(node){ if(node) node.textContent = currentYear; });

  var navToggle = document.getElementById('navToggle');
  var navLinks = document.getElementById('navLinks');
  var langButtons = [document.getElementById('langBtnTop')];

  function setMenuState(isOpen){
    navLinks.classList.toggle('open', isOpen);
    navToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    document.body.classList.toggle('menu-open', isOpen && window.innerWidth <= 900);
  }

  navToggle.addEventListener('click', function(){
    setMenuState(!navLinks.classList.contains('open'));
  });

  Array.prototype.forEach.call(navLinks.querySelectorAll('a'), function(link){
    link.addEventListener('click', function(){
      setMenuState(false);
    });
  });

  document.addEventListener('keydown', function(event){
    if(event.key === 'Escape') setMenuState(false);
  });

  window.addEventListener('resize', function(){
    if(window.innerWidth > 900) document.body.classList.remove('menu-open');
  });

  function applyLang(lang){
    var html = document.documentElement;
    html.setAttribute('lang', lang);
    html.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
    updateAriaLabels(lang);
  }

  var ariaLabels = {
    navToggle: {ar:'القائمة', en:'Menu'},
    heroPanel: {ar:'لمحة سريعة', en:'Quick profile'},
    carPrev: {ar:'السابق', en:'Previous'},
    carNext: {ar:'التالي', en:'Next'},
    backToTop: {ar:'العودة للأعلى', en:'Back to top'}
  };
  function updateAriaLabels(lang){
    navToggle.setAttribute('aria-label', ariaLabels.navToggle[lang]);
    var heroPanel = document.querySelector('.hero-panel');
    if(heroPanel) heroPanel.setAttribute('aria-label', ariaLabels.heroPanel[lang]);
    var carPrev = document.getElementById('carPrev');
    var carNext = document.getElementById('carNext');
    if(carPrev) carPrev.setAttribute('aria-label', ariaLabels.carPrev[lang]);
    if(carNext) carNext.setAttribute('aria-label', ariaLabels.carNext[lang]);
    var backToTop = document.getElementById('backToTop');
    if(backToTop) backToTop.setAttribute('aria-label', ariaLabels.backToTop[lang]);
  }
  updateAriaLabels(document.documentElement.getAttribute('lang'));

  function toggleLang(){
    var isAr = document.documentElement.getAttribute('lang') === 'ar';
    var next = isAr ? 'en' : 'ar';
    applyLang(next);
    try{ window.localStorage.setItem('siteLang', next); }catch(e){}
  }

  try{
    var savedLang = window.localStorage.getItem('siteLang');
    if(savedLang && savedLang !== document.documentElement.getAttribute('lang')) applyLang(savedLang);
  }catch(e){}

  langButtons.forEach(function(button){
    button.addEventListener('click', toggleLang);
  });

  (function(){
    var counters = document.querySelectorAll('.counter');
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function setFinal(){
      counters.forEach(function(el){
        el.textContent = parseInt(el.getAttribute('data-target'),10).toLocaleString('en-US');
      });
    }
    if(reduce){ setFinal(); }
    else if('IntersectionObserver' in window){
      var animated = false;
      function animate(){
        counters.forEach(function(el){
          var target = parseInt(el.getAttribute('data-target'),10);
          var duration = 1400;
          var start = null;
          function step(ts){
            if(!start) start = ts;
            var progress = Math.min((ts-start)/duration, 1);
            var value = Math.floor(progress * target);
            el.textContent = value.toLocaleString('en-US');
            if(progress < 1) requestAnimationFrame(step);
            else el.textContent = target.toLocaleString('en-US');
          }
          requestAnimationFrame(step);
        });
      }
      var statsBar = document.querySelector('.stats-bar');
      var obs = new IntersectionObserver(function(entries){
        entries.forEach(function(entry){
          if(entry.isIntersecting && !animated){
            animated = true;
            animate();
            statsBar.classList.add('is-visible');
            obs.disconnect();
          }
        });
      }, {threshold:0.3});
      obs.observe(statsBar);
    } else { setFinal(); }
  })();

  (function(){
    var revealItems = document.querySelectorAll('.hero-copy, .hero-panel, .services, #work, .featured-portfolio, .process, .contact');
    if('IntersectionObserver' in window){
      var revealObserver = new IntersectionObserver(function(entries){
        entries.forEach(function(entry){
          if(entry.isIntersecting){
            entry.target.classList.add('is-visible');
            revealObserver.unobserve(entry.target);
          }
        });
      }, {threshold:0.18});
      revealItems.forEach(function(item){
        item.classList.add('reveal');
        revealObserver.observe(item);
      });
    } else {
      revealItems.forEach(function(item){
        item.classList.add('is-visible');
      });
    }
  })();

  (function(){
    var track = document.getElementById('workTrack');
    var viewport = document.querySelector('.carousel-viewport');
    var prevBtn = document.getElementById('carPrev');
    var nextBtn = document.getElementById('carNext');
    var progressFill = document.getElementById('carouselProgressFill');
    var counter = document.getElementById('carouselCounter');
    var cards = Array.prototype.slice.call(track.children);
    var offset = 0;
    var startX = 0;
    var currentX = 0;
    var isPointerDown = false;
    var autoAdvance = null;

    viewport.setAttribute('tabindex', '0');

    function cardStep(){
      var c = track.children[0];
      var gap = 26;
      return c.getBoundingClientRect().width + gap;
    }
    function maxOffset(){
      return Math.max(0, track.scrollWidth - viewport.clientWidth);
    }
    function activeIndex(){
      return Math.min(cards.length - 1, Math.max(0, Math.round(offset / Math.max(cardStep(), 1))));
    }
    function updateMeta(){
      var index = activeIndex();
      var progress = cards.length > 1 ? (index / (cards.length - 1)) * 100 : 0;
      if(progressFill) progressFill.style.width = progress + '%';
      if(counter) counter.textContent = String(index + 1).padStart(2, '0') + ' / ' + String(cards.length).padStart(2, '0');
      cards.forEach(function(card, cardIndex){
        card.classList.toggle('is-active', cardIndex === index);
      });
    }
    function update(){
      track.style.transform = 'translateX(' + (-offset) + 'px)';
      prevBtn.disabled = offset <= 0;
      nextBtn.disabled = offset >= maxOffset() - 1;
      updateMeta();
    }
    function nextStep(){
      if(offset >= maxOffset() - 1) offset = 0;
      else offset = Math.min(maxOffset(), offset + cardStep());
      update();
    }
    function resetAutoAdvance(){
      if(window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      window.clearInterval(autoAdvance);
      autoAdvance = window.setInterval(nextStep, 3800);
    }
    prevBtn.addEventListener('click', function(){
      offset = Math.max(0, offset - cardStep());
      update();
      resetAutoAdvance();
    });
    nextBtn.addEventListener('click', function(){
      nextStep();
      resetAutoAdvance();
    });
    window.addEventListener('resize', function(){
      offset = Math.min(offset, maxOffset());
      update();
    });
    viewport.addEventListener('wheel', function(event){
      if(Math.abs(event.deltaY) < Math.abs(event.deltaX)) return;
      event.preventDefault();
      offset = Math.max(0, Math.min(maxOffset(), offset + event.deltaY));
      update();
      resetAutoAdvance();
    }, {passive:false});
    var canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    viewport.addEventListener('mouseenter', function(){
      if(canHover) window.clearInterval(autoAdvance);
    });
    viewport.addEventListener('mouseleave', function(){
      if(canHover) resetAutoAdvance();
    });

    viewport.addEventListener('pointerdown', function(event){
      isPointerDown = true;
      startX = event.clientX;
      currentX = offset;
      track.classList.add('dragging');
      try{ viewport.setPointerCapture(event.pointerId); }catch(e){}
    });
    viewport.addEventListener('pointermove', function(event){
      if(!isPointerDown) return;
      var delta = event.clientX - startX;
      var live = Math.max(0, Math.min(maxOffset(), currentX - delta));
      track.style.transform = 'translateX(' + (-live) + 'px)';
    });
    viewport.addEventListener('pointerup', function(event){
      if(!isPointerDown) return;
      isPointerDown = false;
      track.classList.remove('dragging');
      var delta = event.clientX - startX;
      if(Math.abs(delta) > 40){
        offset = delta < 0 ? Math.min(maxOffset(), currentX + cardStep()) : Math.max(0, currentX - cardStep());
      } else {
        offset = currentX;
      }
      update();
      resetAutoAdvance();
    });
    viewport.addEventListener('pointerleave', function(){
      if(isPointerDown){
        isPointerDown = false;
        track.classList.remove('dragging');
        offset = currentX;
        update();
      }
      resetAutoAdvance();
    });
    viewport.addEventListener('keydown', function(event){
      if(event.key === 'ArrowRight'){
        offset = Math.min(maxOffset(), offset + cardStep());
        update();
        resetAutoAdvance();
      }
      if(event.key === 'ArrowLeft'){
        offset = Math.max(0, offset - cardStep());
        update();
        resetAutoAdvance();
      }
    });

    update();
    resetAutoAdvance();
  })();

  (function(){
    var navAnchors = Array.prototype.slice.call(document.querySelectorAll('.nav-links a[href^="#"]'));
    if(!navAnchors.length || !('IntersectionObserver' in window)) return;
    var sections = navAnchors.map(function(a){ return document.getElementById(a.getAttribute('href').slice(1)); }).filter(Boolean);
    function setActive(id){
      navAnchors.forEach(function(a){
        a.classList.toggle('active', a.getAttribute('href') === '#' + id);
      });
    }
    var spy = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(entry.isIntersecting) setActive(entry.target.id);
      });
    }, {rootMargin: '-45% 0px -50% 0px'});
    sections.forEach(function(section){ spy.observe(section); });
  })();

  (function(){
    var items = document.querySelectorAll('.faq-item');
    items.forEach(function(item){
      var btn = item.querySelector('.faq-q');
      var ans = item.querySelector('.faq-a');
      btn.addEventListener('click', function(){
        var isOpen = item.classList.contains('open');
        items.forEach(function(other){
          other.classList.remove('open');
          other.querySelector('.faq-a').style.maxHeight = null;
        });
        if(!isOpen){
          item.classList.add('open');
          ans.style.maxHeight = ans.scrollHeight + 'px';
        }
      });
    });
  })();

  (function(){
    var fill = document.getElementById('scrollProgressFill');
    if(!fill) return;
    function update(){
      var h = document.documentElement;
      var scrolled = h.scrollTop;
      var max = h.scrollHeight - h.clientHeight;
      var pct = max > 0 ? (scrolled / max) * 100 : 0;
      fill.style.width = pct + '%';
    }
    window.addEventListener('scroll', update, {passive:true});
    window.addEventListener('resize', update);
    update();
  })();

  (function(){
    var backToTop = document.getElementById('backToTop');
    if(!backToTop) return;
    backToTop.addEventListener('click', function(){
      window.scrollTo({top:0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'});
    });
  })();

  (function(){
    var btn = document.getElementById('waBuilderBtn');
    if(!btn) return;
    var groups = document.querySelectorAll('.wa-options');
    var selected = {service: null, budget: null};
    var phone = '201273874839';

    function isAr(){ return document.documentElement.getAttribute('lang') === 'ar'; }

    function buildMessage(){
      var ar = isAr();
      var service = selected.service;
      var budget = selected.budget;
      if(!service && !budget){
        return ar ? 'مرحبا بيشوي 👋 عندي مشروع حابب أتكلم معاك عنه.' : "Hi Bishoy 👋 I have a project I'd like to talk to you about.";
      }
      if(ar){
        var msg = 'مرحبا بيشوي 👋 عندي مشروع';
        if(service) msg += ' ' + service;
        if(budget) msg += '، بميزانية تقريبية ' + budget;
        msg += '. حابب أعرف التفاصيل.';
        return msg;
      } else {
        var msgEn = 'Hi Bishoy 👋 I have a';
        msgEn += service ? ' ' + service.toLowerCase() + ' project' : ' project';
        if(budget) msgEn += ' with an approximate budget of ' + budget;
        msgEn += ". I'd like to know more details.";
        return msgEn;
      }
    }

    function updateHref(){
      btn.href = 'https://wa.me/' + phone + '?text=' + encodeURIComponent(buildMessage());
    }

    groups.forEach(function(group){
      var groupName = group.getAttribute('data-group');
      group.querySelectorAll('.wa-chip').forEach(function(chip){
        chip.addEventListener('click', function(){
          var alreadyActive = chip.classList.contains('active');
          group.querySelectorAll('.wa-chip').forEach(function(c){ c.classList.remove('active'); });
          if(alreadyActive){
            selected[groupName] = null;
          } else {
            chip.classList.add('active');
            selected[groupName] = isAr() ? chip.getAttribute('data-ar') : chip.getAttribute('data-en');
          }
          updateHref();
        });
      });
    });

    document.querySelectorAll('.lang-btn, [data-lang]').forEach(function(el){
      el.addEventListener('click', function(){
        setTimeout(function(){
          document.querySelectorAll('.wa-chip.active').forEach(function(chip){
            var group = chip.closest('.wa-options');
            var groupName = group.getAttribute('data-group');
            selected[groupName] = isAr() ? chip.getAttribute('data-ar') : chip.getAttribute('data-en');
          });
          updateHref();
        }, 0);
      });
    });

    updateHref();
  })();

  (function(){
    var modal = document.getElementById('qvModal');
    if(!modal) return;
    var img = modal.querySelector('.qv-img');
    var titleAr = modal.querySelector('.qv-title .ar-only');
    var titleEn = modal.querySelector('.qv-title .en-only');
    var catAr = modal.querySelector('.qv-cat .ar-only');
    var catEn = modal.querySelector('.qv-cat .en-only');
    var link = modal.querySelector('.qv-link');
    var caseLink = document.getElementById('qvCaseLink');
    var closeBtn = modal.querySelector('.qv-close');
    var lastFocused = null;

    function textOrFallback(container, selector, fallback){
      var el = container.querySelector(selector);
      return el ? el.textContent.trim() : fallback;
    }

    document.querySelectorAll('.card[data-quickview]').forEach(function(card){
      card.addEventListener('click', function(e){
        e.preventDefault();
        var imgEl = card.querySelector('.card-img img');
        var h3 = card.querySelector('.card-info h3');
        var catSpan = card.querySelector('.card-info > span');
        var fallbackTitle = h3 ? h3.textContent.trim() : '';

        if(imgEl){ img.src = imgEl.src; img.alt = imgEl.alt || fallbackTitle; }
        titleAr.textContent = h3 ? textOrFallback(h3, '.ar-only', fallbackTitle) : '';
        titleEn.textContent = h3 ? textOrFallback(h3, '.en-only', fallbackTitle) : '';
        if(catSpan){
          catAr.textContent = textOrFallback(catSpan, '.ar-only', '');
          catEn.textContent = textOrFallback(catSpan, '.en-only', '');
        }
        link.href = card.getAttribute('href');

        var caseHref = card.getAttribute('data-case');
        if(caseHref){
          caseLink.href = caseHref;
          caseLink.style.display = 'inline-block';
        } else {
          caseLink.style.display = 'none';
        }

        lastFocused = document.activeElement;
        modal.classList.add('open');
        requestAnimationFrame(function(){ modal.classList.add('shown'); });
        document.body.classList.add('menu-open');
        closeBtn.focus();
      });
    });

    function closeModal(){
      modal.classList.remove('shown');
      modal.classList.remove('open');
      document.body.classList.remove('menu-open');
      if(lastFocused) lastFocused.focus();
    }
    closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', function(e){ if(e.target === modal) closeModal(); });
    document.addEventListener('keydown', function(e){ if(e.key === 'Escape' && modal.classList.contains('open')) closeModal(); });
  })();

  // ===== Hero cursor spotlight + panel tilt (premium glass feel, desktop pointer only) =====
  (function(){
    var hero = document.querySelector('.hero');
    var spotlight = document.querySelector('.hero-spotlight');
    var panel = document.querySelector('.hero-panel');
    if(!hero || !spotlight) return;
    var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(!fine) return;

    hero.addEventListener('pointermove', function(e){
      var r = hero.getBoundingClientRect();
      var x = ((e.clientX - r.left) / r.width) * 100;
      var y = ((e.clientY - r.top) / r.height) * 100;
      spotlight.style.setProperty('--sx', x + '%');
      spotlight.style.setProperty('--sy', y + '%');
      spotlight.classList.add('is-active');

      if(panel && !reduce){
        var pr = panel.getBoundingClientRect();
        var withinPanel = e.clientX >= pr.left && e.clientX <= pr.right && e.clientY >= pr.top && e.clientY <= pr.bottom;
        if(withinPanel){
          var px = (e.clientX - pr.left) / pr.width - 0.5;
          var py = (e.clientY - pr.top) / pr.height - 0.5;
          panel.style.transform = 'perspective(900px) rotateX(' + (py * -6) + 'deg) rotateY(' + (px * 8) + 'deg) translateY(-2px)';
        } else {
          panel.style.transform = '';
        }
      }
    });

    hero.addEventListener('pointerleave', function(){
      spotlight.classList.remove('is-active');
      if(panel) panel.style.transform = '';
    });
  })();

  // ===== Premium motion layer =====
  (function(){
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    var hasIO = 'IntersectionObserver' in window;

    /* ---- 1. Intro veil: hand off from the inline script and clear it ---- */
    (function(){
      var veil = document.getElementById('introVeil');
      if(!veil || veil.style.display === 'none') return;
      var done = false;
      function finish(){
        if(done) return;
        done = true;
        veil.classList.add('done');
        document.documentElement.style.overflow = '';
        try{ sessionStorage.setItem('bw_intro', '1'); }catch(e){}
        setTimeout(function(){ if(veil.parentNode) veil.parentNode.removeChild(veil); }, 650);
      }
      if(document.readyState === 'complete') setTimeout(finish, 300);
      else window.addEventListener('load', function(){ setTimeout(finish, 300); });
      setTimeout(finish, 1700); // hard cap: never trap the visitor behind it
    })();

    /* ---- 2. Section headings reveal word by word ---- */
    (function(){
      if(reduce || !hasIO) return;
      var heads = document.querySelectorAll('.section-head');
      if(!heads.length) return;
      Array.prototype.forEach.call(heads, function(head){
        var spans = head.querySelectorAll('h2 > span');
        Array.prototype.forEach.call(spans, function(span){
          if(span.getAttribute('data-split')) return;
          var text = (span.textContent || '').trim();
          if(!text) return;
          var words = text.split(/\s+/);
          span.textContent = '';
          words.forEach(function(word, i){
            var w = document.createElement('span');
            w.className = 'w';
            w.textContent = word;
            w.style.transitionDelay = (i * 0.075).toFixed(3) + 's';
            span.appendChild(w);
            if(i < words.length - 1) span.appendChild(document.createTextNode(' '));
          });
          span.setAttribute('data-split', '1');
        });
      });
      var headObserver = new IntersectionObserver(function(entries){
        entries.forEach(function(entry){
          if(entry.isIntersecting){
            entry.target.classList.add('words-in');
            headObserver.unobserve(entry.target);
          }
        });
      }, {threshold: 0.25});
      Array.prototype.forEach.call(heads, function(head){ headObserver.observe(head); });
      // Safety: if anything goes wrong, never leave a heading invisible
      setTimeout(function(){
        Array.prototype.forEach.call(heads, function(head){ head.classList.add('words-in'); });
      }, 6000);
    })();

    /* ---- 3. Parallax on the large images ---- */
    (function(){
      if(reduce) return;
      var boxes = document.querySelectorAll('.fp-img, #work .card-img');
      if(!boxes.length) return;
      var items = [];
      Array.prototype.forEach.call(boxes, function(box){
        var img = box.querySelector('img');
        if(!img || img.parentNode !== box) return;
        var layer = document.createElement('span');
        layer.className = 'par-layer';
        box.insertBefore(layer, img);
        layer.appendChild(img);
        items.push({box: box, layer: layer, live: false});
      });
      if(!items.length) return;

      if(hasIO){
        var liveObserver = new IntersectionObserver(function(entries){
          entries.forEach(function(entry){
            for(var i = 0; i < items.length; i++){
              if(items[i].box === entry.target) items[i].live = entry.isIntersecting;
            }
          });
        }, {rootMargin: '120px 0px'});
        items.forEach(function(it){ liveObserver.observe(it.box); });
      } else {
        items.forEach(function(it){ it.live = true; });
      }

      // Positions are measured once and cached. Reading getBoundingClientRect() for
      // every item on every scroll frame forces a layout each time and is what makes
      // parallax feel heavy.
      function measure(){
        var pageY = window.pageYOffset || document.documentElement.scrollTop || 0;
        items.forEach(function(it){
          var r = it.box.getBoundingClientRect();
          it.mid = r.top + pageY + r.height / 2;
        });
      }
      var ticking = false;
      function update(){
        var vh = window.innerHeight || 800;
        var depth = window.innerWidth < 700 ? 10 : 18;
        var pageY = window.pageYOffset || document.documentElement.scrollTop || 0;
        var center = pageY + vh / 2;
        for(var i = 0; i < items.length; i++){
          var it = items[i];
          if(!it.live || it.mid === undefined) continue;
          var progress = (it.mid - center) / vh;
          if(progress > 1) progress = 1;
          else if(progress < -1) progress = -1;
          var y = (progress * -depth).toFixed(1);
          if(y !== it.last){
            it.layer.style.transform = 'translate3d(0,' + y + 'px,0)';
            it.last = y;
          }
        }
        ticking = false;
      }
      window.addEventListener('scroll', function(){
        if(!ticking){ ticking = true; requestAnimationFrame(update); }
      }, {passive: true});
      var resizeTimer;
      window.addEventListener('resize', function(){
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function(){ measure(); update(); }, 150);
      });
      window.addEventListener('load', function(){ measure(); update(); });
      measure();
      update();
    })();

    /* ---- 4. Portfolio cards wipe in (first ones only, with a safety release) ---- */
    (function(){
      if(reduce || !hasIO) return;
      var cards = document.querySelectorAll('#work .card');
      if(!cards.length) return;
      var staged = Array.prototype.slice.call(cards, 0, 8);
      staged.forEach(function(card){ card.classList.add('pre-reveal'); });
      var cardObserver = new IntersectionObserver(function(entries){
        entries.forEach(function(entry){
          if(!entry.isIntersecting) return;
          var idx = staged.indexOf(entry.target);
          setTimeout(function(){ entry.target.classList.remove('pre-reveal'); }, Math.max(0, idx % 4) * 110);
          cardObserver.unobserve(entry.target);
        });
      }, {threshold: 0.12});
      staged.forEach(function(card){ cardObserver.observe(card); });
      setTimeout(function(){
        staged.forEach(function(card){ card.classList.remove('pre-reveal'); });
      }, 4000);
    })();

    /* ---- 5. Magnetic buttons (desktop) ---- */
    (function(){
      if(!fine || reduce) return;
      var targets = document.querySelectorAll('.btn, .btn-outline, .nav-cta, .car-btn, .whatsapp-fab');
      Array.prototype.forEach.call(targets, function(el){
        el.addEventListener('pointermove', function(e){
          var r = el.getBoundingClientRect();
          var dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
          var dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
          el.style.transform = 'translate(' + (dx * 5).toFixed(1) + 'px,' + (dy * 4 - 2).toFixed(1) + 'px)';
        });
        el.addEventListener('pointerleave', function(){ el.style.transform = ''; });
      });
    })();

    /* ---- 6. Cursor ring (desktop; the normal cursor stays) ---- */
    (function(){
      if(!fine || reduce) return;
      var ring = document.createElement('div');
      ring.className = 'cursor-ring';
      ring.setAttribute('aria-hidden', 'true');
      document.body.appendChild(ring);
      var tx = 0, ty = 0, cx = 0, cy = 0, started = false, running = false;
      function loop(){
        cx += (tx - cx) * 0.18;
        cy += (ty - cy) * 0.18;
        ring.style.transform = 'translate3d(' + cx.toFixed(1) + 'px,' + cy.toFixed(1) + 'px,0)';
        if(Math.abs(tx - cx) > 0.3 || Math.abs(ty - cy) > 0.3){ requestAnimationFrame(loop); }
        else { running = false; }
      }
      document.addEventListener('pointermove', function(e){
        tx = e.clientX; ty = e.clientY;
        if(!started){ started = true; cx = tx; cy = ty; ring.classList.add('is-on'); }
        if(!running){ running = true; requestAnimationFrame(loop); }
      }, {passive: true});
      document.addEventListener('pointerover', function(e){
        var hot = e.target && e.target.closest ? e.target.closest('a, button, .card, .svc-card, .faq-q, .wa-chip, input, textarea') : null;
        ring.classList.toggle('is-hot', !!hot);
      });
      document.addEventListener('mouseleave', function(){ ring.classList.remove('is-on'); });
      document.addEventListener('mouseenter', function(){ if(started) ring.classList.add('is-on'); });
    })();

    /* ---- 7. Graceful fallback for images hosted elsewhere ---- */
    (function(){
      var imgs = document.querySelectorAll('.card-img img, .fp-img img');
      Array.prototype.forEach.call(imgs, function(img){
        function fail(){
          var box = img.closest ? img.closest('.card-img, .fp-img') : null;
          if(!box || box.classList.contains('img-failed')) return;
          var card = img.closest ? img.closest('.card') : null;
          var titleEl = card ? card.querySelector('.card-info h3') : null;
          var label = '';
          if(titleEl){
            // the title holds both languages; take whichever one is currently shown
            var spans = titleEl.querySelectorAll('span');
            for(var i = 0; i < spans.length; i++){
              if(window.getComputedStyle(spans[i]).display !== 'none'){ label = spans[i].textContent.trim(); break; }
            }
            if(!label) label = titleEl.textContent.trim();
          }
          if(!label) label = img.getAttribute('alt') || '';
          box.setAttribute('data-fallback', label || 'Bishoy Wafiek');
          box.classList.add('img-failed');
        }
        img.addEventListener('error', fail);
        if(img.complete && img.naturalWidth === 0 && img.getAttribute('src')) fail();
      });
    })();
  })();
