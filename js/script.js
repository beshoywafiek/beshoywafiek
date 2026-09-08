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
    });
    viewport.addEventListener('pointerup', function(event){
      if(!isPointerDown) return;
      isPointerDown = false;
      var delta = event.clientX - startX;
      if(Math.abs(delta) > 40){
        offset = delta < 0 ? Math.min(maxOffset(), currentX + cardStep()) : Math.max(0, currentX - cardStep());
        update();
        resetAutoAdvance();
      }
    });
    viewport.addEventListener('pointerleave', function(){
      isPointerDown = false;
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

        lastFocused = document.activeElement;
        modal.classList.add('open');
        document.body.classList.add('menu-open');
        closeBtn.focus();
      });
    });

    function closeModal(){
      modal.classList.remove('open');
      document.body.classList.remove('menu-open');
      if(lastFocused) lastFocused.focus();
    }
    closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', function(e){ if(e.target === modal) closeModal(); });
    document.addEventListener('keydown', function(e){ if(e.key === 'Escape' && modal.classList.contains('open')) closeModal(); });
  })();
