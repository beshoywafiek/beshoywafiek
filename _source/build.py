#!/usr/bin/env python3
"""
Beshoy Wafiek — static site builder.

Emits index.html, work.html and one real case-study page per project.
Every image is placed by two facts we actually measured: its aspect ratio
and the resolution of its source. An image is never given a slot wider
than its source can fill, so nothing on the site is ever upscaled.
"""
import json, os, re, shutil, html
from datetime import date

TODAY = date.today().isoformat()

import content as C   # <-- all the site copy lives in content.py
import meta as M      # <-- project names, order and the per-project story

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'src')

# Where the generated pages go. Two layouts are supported so the same script
# works whether this file sits beside its output or in a _source/ folder of its
# own, which is how the project is handed over and kept in git:
#
#   flat:    build.py, index.html, css/, js/   all in one folder
#   split:   _source/build.py   and   site/index.html, site/css/, site/js/
#   in-root: _source/build.py   and   index.html, css/, js/ at the repo root —
#            this is the GitHub Pages layout, where the published files MUST
#            stay at the root or the live site 404s
#
# The split is detected by a sibling folder named site/ that already holds the
# project data. Without this, running `python3 _source/build.py` quietly wrote
# 31 pages into _source/ and left site/ untouched.
_PARENT = os.path.dirname(HERE)
_SITE = os.path.join(_PARENT, 'site')
if os.path.isdir(os.path.join(_SITE, 'js')):
    OUT = _SITE                                     # _source/ beside site/
elif os.path.basename(HERE) == '_source' and os.path.isdir(os.path.join(_PARENT, 'js')):
    OUT = _PARENT                                   # _source/ inside the published root
else:
    OUT = HERE                                      # everything in one folder
CDN = 'https://mir-s3-cdn-cf.behance.net/project_modules/'
SITE, WA, MAIL, BE = C.SITE, C.WA, C.MAIL, C.BE

P = json.load(open(os.path.join(OUT, 'js', 'projects.json'), encoding='utf-8'))
BY = {p['slug']: p for p in P}

CATS = C.CATS

# The project count appears in the page descriptions that Google and WhatsApp
# read. It was typed by hand and went stale the moment two projects were
# removed, so it is substituted from the real list instead.
_AR_DIGITS = str.maketrans('0123456789', '٠١٢٣٤٥٦٧٨٩')
def seo(text, n=None):
    n = len(P) if n is None else n
    return text.replace('{an}', str(n).translate(_AR_DIGITS)).replace('{n}', str(n))


def url(m, hi=False):
    return CDN + (m['hi'] if hi else m['v']) + '/' + m['f']

def dims(m, cap=1400):
    w = min(m['w'], cap)
    return w, max(1, round(w / m['r']))

def e(s):
    return html.escape(s, quote=True)

def bi(ar, en, cls=''):
    c = (' class="%s"' % cls) if cls else ''
    return '<span%s><span class="ar">%s</span><span class="en">%s</span></span>' % (c, ar, en)



# ---------------------------------------------------------------- schema
# One linked entity graph rather than loose snippets: the person, the
# practice and the site each get an @id and point at each other, which is
# what search engines and AI assistants actually read to work out who you
# are. llms.txt was considered and skipped — Google rejected it publicly
# and large-scale studies found no effect.
def ld(*blocks):
    g = [b for b in blocks if b]
    return ('<script type="application/ld+json">%s</script>'
            % json.dumps({"@context": "https://schema.org", "@graph": g},
                          ensure_ascii=False, separators=(',', ':')))


ADDRESS = {"@type": "PostalAddress", "addressLocality": C.SEO_CITY,
           "addressCountry": C.SEO_COUNTRY}


def base_graph():
    me = {
        "@type": "Person", "@id": SITE + "#me",
        "name": C.NAME[1], "alternateName": C.SEO_NAME_AR,
        "jobTitle": [C.SEO_JOB_EN, C.SEO_JOB_AR],
        "description": seo(C.DESC_HOME),
        "url": SITE, "image": SITE + "images/profile.jpg",
        "email": MAIL, "address": ADDRESS,
        "knowsAbout": C.SEO_SKILLS,
        "knowsLanguage": [{"@type": "Language", "name": "Arabic", "alternateName": "ar"},
                          {"@type": "Language", "name": "English", "alternateName": "en"}],
        "sameAs": [u for u in C.SEO_PROFILES if u],
        "worksFor": {"@id": SITE + "#practice"},
    }
    offers = []
    for num, ar, en, ard, end, price, tar, ten, icon in C.SERVICES:
        cfg = C.SERVICE_PAGES.get(num, {})
        offers.append({
            "@type": "Offer",
            "itemOffered": {
                "@type": "Service", "@id": SITE + "services/" + cfg.get('slug', num) + ".html#service",
                "name": en, "alternateName": ar, "description": end,
                "serviceType": en, "provider": {"@id": SITE + "#practice"},
                "areaServed": C.SEO_AREAS,
            },
            "price": price.replace('$', '').replace('+', ''),
            "priceCurrency": "USD",
            "url": SITE + "services/" + cfg.get('slug', num) + ".html",
        })
    practice = {
        "@type": ["ProfessionalService", "LocalBusiness"], "@id": SITE + "#practice",
        "name": C.NAME[1] + " — " + C.SEO_JOB_EN,
        "alternateName": C.SEO_NAME_AR + " — " + C.SEO_JOB_AR,
        "description": seo(C.DESC_HOME),
        "url": SITE, "image": SITE + "images/profile.jpg",
        "logo": SITE + "images/logo.png",
        "email": MAIL, "telephone": "+201273874839",
        "founder": {"@id": SITE + "#me"}, "foundingDate": C.SEO_FOUNDED,
        "priceRange": C.SEO_PRICE, "address": ADDRESS,
        "areaServed": C.SEO_AREAS,
        "availableLanguage": ["ar", "en"],
        "sameAs": [u for u in C.SEO_PROFILES if u],
        "hasOfferCatalog": {"@type": "OfferCatalog",
                            "name": "Design services", "itemListElement": offers},
    }
    site = {
        "@type": "WebSite", "@id": SITE + "#site", "url": SITE,
        "name": C.NAME[1], "inLanguage": ["ar", "en"],
        "publisher": {"@id": SITE + "#practice"},
    }
    return [me, practice, site]


def crumbs(*pairs):
    return {"@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": i + 1, "name": n, "item": u}
        for i, (n, u) in enumerate(pairs)]}

# ---------------------------------------------------------------- chrome
def head(title, desc, canon, og, extra='', schema=''):
    GA = C.GA_ID
    extra = (schema or '') + extra
    return f'''<!DOCTYPE html>
<html lang="ar" dir="rtl" class="no-js">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{e(title)}</title>
<meta name="description" content="{e(desc)}">
<link rel="canonical" href="{canon}">
<meta property="og:type" content="website">
<meta property="og:title" content="{e(title)}">
<meta property="og:description" content="{e(desc)}">
<meta property="og:image" content="{og}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:locale" content="ar_EG">
<meta property="og:site_name" content="Beshoy Wafiek">
<meta property="og:url" content="{canon}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#0B0A0A">
<link rel="icon" type="image/png" href="{{R}}images/favicon.png">
<link rel="apple-touch-icon" href="{{R}}images/touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preconnect" href="https://mir-s3-cdn-cf.behance.net" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;800;900&family=Space+Mono:wght@400;700&family=Aref+Ruqaa:wght@700&family=Instrument+Serif:ital@1&display=swap" rel="stylesheet">
<link rel="stylesheet" href="{{R}}css/style.css">
<script>
/* set the language before first paint, so an English visitor never sees
   the Arabic flash and back again */
(function(){{var r=document.documentElement,l=null;
try{{l=localStorage.getItem('bw_lang')}}catch(e){{}}
if(l!=='ar'&&l!=='en'){{var n=(navigator.languages&&navigator.languages[0])||navigator.language||'en';
l=n.toLowerCase().indexOf('ar')===0?'ar':'en';}}
r.setAttribute('lang',l);r.setAttribute('dir',l==='ar'?'rtl':'ltr');
r.className=r.className.replace('no-js','js');}})();
</script>
<script async src="https://www.googletagmanager.com/gtag/js?id=G-TNSYF9K2EW"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){{dataLayer.push(arguments);}}
gtag('js',new Date());gtag('config','{GA}');</script>
{extra}
</head>
<body>'''


MARK = '<img src="{R}images/logo.png" alt="" width="31" height="22">'


NAVLINKS = C.NAV

def header(cur=''):
    MENU_SOCIAL = ''.join(
        '<a href="%s"%s>%s</a>'
        % (href, '' if href.startswith('mailto:') else ' target="_blank" rel="noopener"', bi(ar, en))
        for key, ar, en, href in C.SOCIAL if href)
    # Services opens a panel instead of jumping to the section: someone who
    # already knows what they need picks it here and lands on that page,
    # rather than scrolling the home page hunting for it.
    def svc_rows(cls):
        out = []
        for num, ar, en, ard, end, price, tar, ten, ic in C.SERVICES:
            cfg = C.SERVICE_PAGES[num]
            out.append(
                '<a class="%s" href="{R}services/%s.html">'
                '<span class="nav-p-i"><svg viewBox="0 0 40 40" fill="none" stroke="currentColor" '
                'stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">%s</svg></span>'
                '<span class="nav-p-x"><b>%s</b><em>%s</em></span>'
                '<span class="nav-p-p">%s</span></a>'
                # a written short label, not the long description cut at the
                # first comma — that turned "A clear, distinctive mark, with
                # every final file" into the words "A clear"
                % (cls, cfg['slug'], ic, bi(ar, en), bi(*cfg['short']), price))
        return ''.join(out)

    drop = f'''<div class="nav-d">
    <button class="nav-dt" type="button" aria-expanded="false" aria-controls="navSvc">{bi('الخدمات','Services')}<svg class="nav-cv" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></button>
    <div class="nav-p" id="navSvc">
      <div class="nav-p-g">
        <div class="nav-p-c">
          <p class="nav-p-k">{bi('اختار اللي محتاجه','Pick what you need')}</p>
          {svc_rows('nav-p-r')}
        </div>
        <div class="nav-p-c nav-p-c2">
          <p class="nav-p-k">{bi('كمان','More')}</p>
          <a class="nav-p-s" href="{{R}}index.html#services">{bi('كل الخدمات','All services')}</a>
          <a class="nav-p-s" href="{{R}}work.html">{bi('الشغل كله','All the work')}</a>
          <a class="nav-p-s nav-p-s--go" href="{{R}}index.html#contact">{bi('ابدأ مشروع','Start a project')}{ARROW}</a>
        </div>
      </div>
    </div>
  </div>'''

    nav = ''
    for h, a, n, k in NAVLINKS:
        if n == 'Services':
            nav += drop
        else:
            nav += '<a href="%s"%s>%s</a>' % (h, ' aria-current="page"' if k and k == cur else '', bi(a, n))

    menu = ''
    for i, (h, a, n, k) in enumerate(NAVLINKS):
        menu += '<a href="%s"><i>%02d</i><span class="menu-t">%s</span></a>' % (h, i + 1, bi(a, n))
        if n == 'Services':      # the same choice, on a phone
            menu += '<div class="menu-sub">%s</div>' % svc_rows('menu-sv')
    return f'''
<header class="top">
  <a class="brand" href="{{R}}index.html">{MARK}{bi(*C.NAME)}</a>
  <nav class="nav">{nav}</nav>
  <div class="tools">
    <button class="lang" id="lang" type="button">EN</button>
    <button class="burger" id="burger" type="button" aria-label="Menu" aria-expanded="false"><i></i><i></i></button>
  </div>
</header>
<div class="menu" id="menu" hidden>
  <nav>{menu}</nav>
  <div class="menu-foot">{MENU_SOCIAL}</div>
</div>'''


def footer():
    FOOT_SOCIAL = ''.join(
        '<a href="%s"%s>%s</a>'
        % (href, '' if href.startswith('mailto:') else ' target="_blank" rel="noopener"', en)
        for key, ar, en, href in C.SOCIAL if href)
    # the channels he actually filled in — an empty url just drops out
    items = []
    for key, ar, en, href in C.SOCIAL:
        if not href:
            continue
        ext = '' if href.startswith('mailto:') else ' target="_blank" rel="noopener"'
        items.append(
            '<a class="fab-i fab-i--%s" href="%s"%s aria-label="%s" data-lab-ar="%s" data-lab-en="%s">'
            '<span class="fab-lab">%s</span>'
            '<span class="fab-dot"><svg viewBox="0 0 24 24" fill="currentColor">%s</svg></span></a>'
            % (key, href, ext, e(en), e(ar), e(en), bi(ar, en), SOC_ICON.get(key, '')))
    SOCIAL_ITEMS = ''.join(items)
    WA_ICON = SOC_ICON['whatsapp']
    AR_CONTACT = 'تواصل'

    OFFER_HTML = ''
    if C.OFFER_ON:
        OFFER_HTML = f"""
<div class="pop" id="pop" hidden data-delay="{C.OFFER_DELAY}" data-days="{C.OFFER_DAYS}" data-days-acted="{C.OFFER_DAYS_ACTED}"
     data-msg-ar="{e(C.OFFER_MSG[0])}" data-msg-en="{e(C.OFFER_MSG[1])}">
  <div class="pop-card" role="dialog" aria-modal="true" aria-labelledby="popT">
    <button class="pop-x" id="popX" type="button" aria-label="Close">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 5l14 14M19 5L5 19"/></svg>
    </button>
    <p class="pop-k">{bi(*C.OFFER_KICK)}</p>
    <p class="pop-n" id="popT">{bi(*C.OFFER_TITLE)}</p>
    <p class="pop-b">{bi(*C.OFFER_BODY)}</p>
    <div class="pop-act">
      <a class="btn" id="popGo" href="{WA}" target="_blank" rel="noopener">{bi(*C.OFFER_CTA)}{ARROW}</a>
      <button class="pop-skip" id="popSkip" type="button">{bi(*C.OFFER_SKIP)}</button>
    </div>
  </div>
</div>"""

    return f'''
<footer class="foot">
  <div class="wrap foot-in">
    <span>© <span id="yr"></span> {C.NAME[1]} — {C.CITY[1]}</span>
    <div class="foot-l">{FOOT_SOCIAL}</div>
  </div>
</footer>
<div class="fab" id="fab">
  <div class="fab-list" id="fabList">{SOCIAL_ITEMS}</div>
  <button class="fab-b" id="fabB" type="button" aria-expanded="false" aria-label="{{AR_CONTACT}}">
    <svg class="fab-ic" viewBox="0 0 24 24" fill="currentColor">{WA_ICON}</svg>
    <svg class="fab-x" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M5 5l14 14M19 5L5 19"/></svg>
  </button>
</div>
{OFFER_HTML}
<script src="{{R}}js/site.js" defer></script>
</body>
</html>'''


# brand marks for the floating contact button
SOC_ICON = {
 'whatsapp':'<path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.72.45 3.4 1.3 4.89L2.05 22l5.32-1.39a9.87 9.87 0 0 0 4.67 1.19h.01c5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2Zm5.79 14.07c-.24.68-1.43 1.3-1.96 1.38-.5.07-1.14.1-1.83-.11-.42-.13-.96-.31-1.65-.61-2.9-1.25-4.8-4.17-4.94-4.36-.15-.19-1.19-1.58-1.19-3.02s.76-2.14 1.03-2.44c.27-.29.58-.37.78-.37h.56c.18 0 .42-.07.66.5.24.59.83 2.03.9 2.18.08.15.13.32.03.51-.1.2-.15.32-.29.49-.15.17-.31.38-.44.51-.15.15-.3.31-.13.6.17.3.76 1.25 1.63 2.02 1.12.99 2.06 1.3 2.36 1.45.29.15.46.12.63-.07.17-.2.73-.85.92-1.14.2-.29.39-.24.66-.15.27.1 1.71.81 2 .96.3.14.49.22.56.34.07.12.07.69-.17 1.36Z"/>',
 'instagram':'<path d="M12 2.2c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.8 3.8 0 0 1-1.38-.9 3.8 3.8 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23C2.21 15.58 2.2 15.2 2.2 12s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.21 8.8 2.2 12 2.2Zm0 1.98c-3.14 0-3.51.01-4.75.07-1.15.05-1.77.24-2.18.4-.55.21-.94.47-1.35.88-.41.41-.67.8-.88 1.35-.16.41-.35 1.03-.4 2.18-.06 1.24-.07 1.61-.07 4.75s.01 3.51.07 4.75c.05 1.15.24 1.77.4 2.18.21.55.47.94.88 1.35.41.41.8.67 1.35.88.41.16 1.03.35 2.18.4 1.24.06 1.61.07 4.75.07s3.51-.01 4.75-.07c1.15-.05 1.77-.24 2.18-.4.55-.21.94-.47 1.35-.88.41-.41.67-.8.88-1.35.16-.41.35-1.03.4-2.18.06-1.24.07-1.61.07-4.75s-.01-3.51-.07-4.75c-.05-1.15-.24-1.77-.4-2.18a3.6 3.6 0 0 0-.88-1.35 3.6 3.6 0 0 0-1.35-.88c-.41-.16-1.03-.35-2.18-.4-1.24-.06-1.61-.07-4.75-.07Zm0 3.37a5.45 5.45 0 1 1 0 10.9 5.45 5.45 0 0 1 0-10.9Zm0 8.99a3.54 3.54 0 1 0 0-7.08 3.54 3.54 0 0 0 0 7.08Zm6.94-9.2a1.27 1.27 0 1 1-2.55 0 1.27 1.27 0 0 1 2.55 0Z"/>',
 'facebook':'<path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.52 1.49-3.91 3.78-3.91 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.78-1.63 1.57v1.89h2.78l-.45 2.91h-2.33V22c4.78-.76 8.43-4.92 8.43-9.94Z"/>',
 'behance':'<path d="M9.2 5.5c.73 0 1.4.07 2 .2.6.12 1.1.33 1.53.61.42.28.74.66.97 1.13.22.47.33 1.05.33 1.74 0 .74-.17 1.36-.51 1.86-.34.5-.84.9-1.5 1.21.9.26 1.58.72 2.02 1.37.45.65.67 1.44.67 2.36 0 .74-.14 1.39-.43 1.93-.29.54-.68.98-1.17 1.33-.49.34-1.05.6-1.69.76-.63.16-1.28.24-1.95.24H2V5.5h7.2Zm-.42 5.68c.6 0 1.09-.14 1.48-.43.38-.28.57-.74.57-1.38 0-.35-.06-.64-.19-.87a1.4 1.4 0 0 0-.52-.53 2.2 2.2 0 0 0-.75-.26 5 5 0 0 0-.88-.07H5.08v3.54h3.7Zm.2 5.96c.33 0 .65-.03.95-.1.3-.06.57-.17.8-.33.23-.15.41-.36.55-.63.13-.26.2-.6.2-1.02 0-.81-.23-1.39-.68-1.74-.46-.35-1.06-.52-1.81-.52H5.08v4.34h3.9ZM17.7 17.3c.42.4 1.02.61 1.8.61.57 0 1.05-.14 1.46-.42.4-.29.65-.59.74-.9h2.2c-.35 1.09-.9 1.87-1.62 2.34-.73.46-1.61.7-2.64.7-.72 0-1.37-.12-1.95-.35a4.1 4.1 0 0 1-1.47-1 4.4 4.4 0 0 1-.93-1.55 5.9 5.9 0 0 1-.33-2c0-.71.11-1.37.34-1.98.23-.61.55-1.14.97-1.58.42-.45.92-.8 1.5-1.06a4.9 4.9 0 0 1 1.94-.38c.78 0 1.46.15 2.05.46.58.3 1.06.71 1.43 1.22.37.52.64 1.1.8 1.76.16.66.22 1.35.17 2.07h-6.47c0 .8.23 1.46.65 1.86Zm3.15-5.03c-.33-.37-.87-.57-1.56-.57-.45 0-.83.08-1.13.23-.3.16-.54.35-.72.57-.18.23-.3.47-.37.72-.07.26-.11.48-.12.68h4.01c-.12-.63-.33-1.26-.66-1.63Zm-4.2-3.9h5v1.22h-5V8.37Z"/>',
 'linkedin':'<path d="M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05a3.74 3.74 0 0 1 3.37-1.85c3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.07 2.07 0 1 1 0-4.13 2.07 2.07 0 0 1 0 4.13Zm1.78 13.02H3.55V9h3.57v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0Z"/>',
 'email':'<path d="M3 5h18a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm9 7.6 8-5.1V6.6l-8 5.1-8-5.1v.9l8 5.1Z"/>',
}

# one class on both arrows, so a single stylesheet rule mirrors every one of
# them in Arabic instead of a rule per component (the services links were
# pointing the wrong way because they had no rule of their own)
ARROW = '<svg class="ar-x" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M13 6l6 6-6 6"/></svg>'
ARROWL = '<svg class="ar-x" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>'


# ---------------------------------------------------------------- packer
def family(m):
    """Which shape family an image belongs to. The artwork decides, not us."""
    if m['r'] >= 2.6:  return 'strip'   # a sheet of several posts in one file
    if m['r'] >= 1.15: return 'land'    # slides, boards, presentation spreads
    if m['r'] >= 0.95: return 'sq'      # square social posts
    return 'port'                       # portrait / story format

# The beat each family is laid out on. Twenty-five identical full-width slides
# is not a layout, it is a scroll — so landscape work alternates between one
# big moment and a pair, and squares run three across with a wider pair to
# break the grid.
RHYTHM = {'land': (1, 2, 2, 1, 2, 3), 'sq': (3, 3, 2), 'port': (2, 2, 3)}


def pack(mods):
    """Group the image sequence into rows: (kind, [modules]) where kind is
    'bleed' (edge to edge) or the number of columns.

    Hard rule underneath the rhythm: an image is never given a slot wider
    than its source file can fill, so nothing on the site is upscaled."""
    rows, i, n = [], 0, len(mods)
    while i < n:
        fam = family(mods[i])
        if fam == 'strip':
            rows.append(('bleed', [mods[i]])); i += 1; continue

        # take the run of images that share this family and a similar shape
        j = i
        while j < n and family(mods[j]) == fam and abs(mods[j]['r'] - mods[i]['r']) <= 0.35:
            j += 1
        run, k, beat, first_row = mods[i:j], 0, 0, len(rows)

        while k < len(run):
            want = RHYTHM[fam][beat % len(RHYTHM[fam])]; beat += 1
            # resolution guards: widen the row (smaller slots) until every
            # image in it is comfortably inside its own source resolution
            if want == 1 and run[k]['w'] < 1400: want = 2
            grp = run[k:k + want]
            if grp and min(x['w'] for x in grp) <= 700 and len(grp) < 3:
                grp = run[k:k + 3]
            # A square or a portrait blown up to the full column is a wall, not
            # a layout — only landscape work earns a row to itself, and only if
            # its source is big enough. A leftover of one joins the row before
            # it rather than being stranded at a size it cannot fill.
            lonely = len(grp) == 1 and (fam != 'land' or run[k]['w'] < 1400)
            if lonely and len(rows) > first_row:
                rows[-1] = (rows[-1][0] + 1, rows[-1][1] + grp)
                k += 1; continue
            if lonely:
                rows.append((2 if run[k]['w'] >= 700 else 3, grp)); k += 1; continue
            rows.append((len(grp), grp))
            k += len(grp)
        i = j
    return rows


# Behance's max_316 / max_632 variants cap the image HEIGHT at that number and
# exist for every module, whether or not the project page referenced them —
# measured, not assumed. So a width descriptor is simply N x the aspect ratio.
SMALL = ((316, 'max_316_webp'), (632, 'max_632_webp'))

SIZES = {
    'bleed': '100vw',
    1: '(min-width:1768px) 1640px, calc(100vw - 128px)',
    2: '(max-width:760px) calc(100vw - 36px), (min-width:1768px) 810px, calc(50vw - 74px)',
    3: ('(max-width:520px) calc(100vw - 36px), (max-width:760px) calc(50vw - 46px), '
        '(min-width:1768px) 533px, calc(33vw - 60px)'),
}


def srcset(m, main_w):
    outs = []
    for n, v in SMALL:
        w = round(n * m['r'])
        if 180 <= w < main_w * 0.8:
            outs.append('%s%s/%s %dw' % (CDN, v, m['f'], w))
    outs.append('%s %dw' % (url(m), main_w))
    return ', '.join(outs)


def fig(m, idx, total, kind=1, eager=False, cap=1400, alt=''):
    w, h = dims(m, cap)
    mw = min(m['w'], 1400)
    return (
        '<a class="fig rv" style="--ar:%s" data-hi="%s" data-n="%02d / %02d" href="%s" data-cur="ZOOM">'
        '<img src="%s" srcset="%s" sizes="%s" alt="%s" width="%d" height="%d" %s decoding="async"></a>'
        % ('%d/%d' % (w, h), url(m, True), idx, total, url(m, True), url(m),
           srcset(m, mw), SIZES.get(kind, SIZES[1]),
           e(alt or 'Design work by %s' % C.NAME[1]), w, h,
           'loading="eager" fetchpriority="high"' if eager else 'loading="lazy"'))



def proof():
    """Client quotes. Returns nothing at all when he has not added any — an
    empty 'what clients say' heading is worse than no section."""
    if not getattr(C, 'PROOF', None):
        return ''
    cards = ''.join(
        '<figure class="pf-c up"><blockquote>%s</blockquote>'
        '<figcaption><b>%s</b><span>%s</span></figcaption></figure>'
        % (bi(q_ar, q_en), e(who), e(role))
        for q_ar, q_en, who, role in C.PROOF)
    return f"""
<section class="sec" id="proof">
  <div class="wrap">
    <div class="shead">
      <div class="shead-l"><span class="idx">05</span><h2>{bi(*C.PROOF_HEAD)}</h2></div>
      <p class="note">{bi(*C.PROOF_NOTE)}</p>
    </div>
    <div class="pf">{cards}</div>
  </div>
</section>"""


def story(slug):
    """The thinking behind a project. Renders nothing at all unless he has
    written it — a 'the brief' heading with no brief under it is worse than
    no section."""
    st = getattr(M, 'STORY', {}).get(slug)
    if not st:
        return ''
    rows = []
    # "Delivered" rather than "the outcome": what shipped is a fact that can be
    # stated truthfully from the work itself. A result needs numbers from the
    # client, and a made-up number on a portfolio is a lie with his name on it.
    for key, ar_h, en_h in (('brief', 'التحدي', 'The challenge'),
                            ('approach', 'الاتجاه', 'The approach'),
                            ('shipped', 'التسليم', 'Delivered')):
        v = st.get(key)
        if not v:
            continue
        rows.append('<div class="cs-st-c"><dt>%s</dt><dd>%s</dd></div>'
                    % (bi(ar_h, en_h), bi(*v)))
    if not rows:
        return ''
    return '<section class="cs-st"><div class="wrap"><dl class="cs-st-g">%s</dl></div></section>' % ''.join(rows)


def work_strip(prefix='', seed=0, count=16, skip=None, label=None):
    """A band of real work, clickable, for the top of a page. Whoever lands
    anywhere sees the work itself within a second rather than a heading."""
    pool = [(q, m) for q in P for m in q['mods'][:3]
            if m['w'] >= 1400 and q['slug'] != skip]
    if not pool:
        return ''
    off = seed % len(pool)
    pool = pool[off:] + pool[:off]
    picked, seen = [], set()
    for q, m in pool:                      # spread across projects, not 3 from one
        if q['slug'] in seen:
            continue
        picked.append((q, m)); seen.add(q['slug'])
        if len(picked) >= count:
            break
    for q, m in pool:
        if len(picked) >= count:
            break
        picked.append((q, m))
    items = ''.join(
        '<a href="%swork/%s.html" aria-label="%s"><img src="%smax_632_webp/%s" alt="%s" '
        'width="%d" height="%d" loading="lazy" decoding="async"></a>'
        % (prefix, q['slug'], e(q['en']), CDN, m['f'],
           e('%s — %s' % (q['en'], CATS[q['cat']][1])), *dims(m, 632))
        for q, m in picked)
    head = ('<p class="mq-k">%s</p>' % label) if label else ''
    return '<div class="band">%s<div class="mq"><div class="mq-t a">%s%s</div></div></div>' % (
        head, items, items)

# ---------------------------------------------------------------- pages
def case(p, prev, nxt):
    hero = p['mods'][0]
    rest = p['mods'][1:]
    rows = pack(rest)
    total = len(p['mods'])
    car, cen = CATS[p['cat']]

    flow, k = [], 1
    for kind, grp in rows:
        k_from = k
        cap = 1400 if kind in ('bleed', 1) else (700 if kind == 2 else 520)
        inner = ''.join(
            fig(m, k_from + z, total, kind=kind, cap=cap,
                alt='%s — %s design by %s (%d of %d)'
                    % (p['en'], cen.lower(), C.NAME[1], k_from + z, total))
            for z, m in enumerate(grp))
        k += len(grp)
        if kind == 'bleed':
            flow.append('<div class="r r-1 r-bleed">%s</div>' % inner)
        else:
            flow.append('<div class="r r-%d">%s</div>' % (kind, inner))

    hw, hh = dims(hero)
    # A full-bleed opening only earns its place if the file can actually fill
    # the screen. Anything smaller opens contained, at the size it is sharp at.
    if hero['w'] >= 1400:
        hero_cls, hero_style, hero_sizes = 'r-bleed', '', '100vw'
    else:
        lim = min(hero['w'], 1100)
        hero_cls, hero_style = 'cs-hero--held', ' style="max-width:%dpx"' % lim
        hero_sizes = '(max-width:%dpx) 100vw, %dpx' % (lim, lim)
    nav = []
    for lab_ar, lab_en, q, align in (('السابق', 'Previous', prev, ''), ('التالي', 'Next', nxt, '')):
        nav.append('<a href="%s.html">%s<b>%s</b></a>' % (
            q['slug'], bi(lab_ar, lab_en, 'x'), bi(q['ar'], q['en'])))

    body = f'''
<span class="prog" aria-hidden="true"></span>
<main class="cs">
  <section class="cs-top">
    <div class="wrap">
      <!-- the path prefix, not a bare "work.html": a case study lives in
           work/, so the bare form resolved to work/work.html and gave a 404
           on all 25 project pages -->
      <a class="cs-back" href="{{R}}work.html">{ARROWL}{bi('كل الشغل','All work')}</a>
      <h1 class="cs-h1">{bi(p['ar'], p['en'])}</h1>
      <p class="cs-lead">{bi(p['arl'], p['enl'])}</p>
      <dl class="cs-meta up">
        <div><dt>{bi('النوع','Discipline')}</dt><dd>{bi(car, cen)}</dd></div>
        <div><dt>{bi('السنة','Year')}</dt><dd>{p['year']}</dd></div>
        <div><dt>{bi('القطع','Pieces')}</dt><dd>{total}</dd></div>
        <div><dt>{bi('على بيهانس','On Behance')}</dt><dd><a href="{p['be']}" target="_blank" rel="noopener">{bi('افتح المشروع','Open project')}</a></dd></div>
      </dl>
    </div>
  </section>

  {story(p['slug'])}

  <div class="cs-body">
    <div class="r r-1 cs-hero {hero_cls}"{hero_style}>
      <a class="fig" style="--ar:{hw}/{hh}" data-hi="{url(hero, True)}" data-n="01 / {total:02d}" href="{url(hero, True)}" data-cur="ZOOM" data-hero>
        <img src="{url(hero)}" srcset="{srcset(hero, min(hero['w'],1400))}" sizes="{hero_sizes}" alt="{e(p['en'] + ' — ' + cen + ' by ' + C.NAME[1])}" width="{hw}" height="{hh}" loading="eager" fetchpriority="high" decoding="async">
      </a>
    </div>
    <div class="flow">{''.join(flow)}</div>
  </div>

  {work_strip('../', seed=int(p['id']) % 31, count=18, skip=p['slug'],
              label=bi('شغل تاني','More work'))}

  <nav class="cs-nav">{''.join(nav)}</nav>

  <section class="end">
    <div class="wrap">
      <h2 class="up">{bi(C.CASE_CTA_AR, C.CASE_CTA_EN)}</h2>
      <div class="end-act up">
        <a class="btn" id="waBtn" href="{WA}" target="_blank" rel="noopener">{bi(*C.CONTACT_BTN)}{ARROW}</a>
        <a class="end-mail" href="mailto:{MAIL}">{MAIL}</a>
      </div>
    </div>
  </section>
</main>'''

    page_url = SITE + 'work/' + p['slug'] + '.html'
    work_ld = {
        "@type": ["CreativeWork", "ImageGallery"], "@id": page_url + "#work",
        "name": p['en'], "alternateName": p['ar'],
        "description": p['enl'], "url": page_url,
        "creator": {"@id": SITE + "#me"}, "author": {"@id": SITE + "#me"},
        "provider": {"@id": SITE + "#practice"},
        "genre": cen, "dateCreated": str(p['year']), "dateModified": TODAY,
        "inLanguage": ["ar", "en"],
        "image": [url(m, True) for m in p['mods'][:8]],
        "numberOfItems": total,
        "sameAs": p['be'],
        "keywords": ', '.join([cen, car, p['en'], 'Beshoy Wafiek']),
    }
    h = head(
        '%s — %s | %s · %s' % (p['en'], p['ar'], cen, C.NAME[1]),
        '%s — %s' % (p['enl'], p['arl']),
        page_url, url(hero),
        schema=ld(*base_graph(), work_ld,
                  crumbs((C.NAME[1], SITE), ('Work', SITE + 'work.html'),
                         (p['en'], page_url))),
    )
    return (h + header('work') + body + footer()).replace('{R}', '../')



def notfound():
    """GitHub Pages serves /404.html for anything it cannot find. Without this
    a mistyped or outdated link shows GitHub's grey page, which has nothing to
    do with him and no way back into the site."""
    h = head(bi(*C.NF_HEAD) + ' — ' + C.NAME[1], bi(*C.NF_BODY),
             SITE + '404.html', SITE + 'images/og.jpg')
    body = f"""
<main id="top">
  <section class="nf">
    <div class="wrap">
      <p class="nf-n">404</p>
      <h1 class="nf-h">{bi(*C.NF_HEAD)}</h1>
      <p class="nf-b">{bi(*C.NF_BODY)}</p>
      <div class="nf-a">
        <a class="btn" href="{{R}}work.html">{bi(*C.NF_WORK)}{ARROW}</a>
        <a class="svl-l" href="{{R}}index.html">{bi(*C.NF_HOME)}{ARROW}</a>
      </div>
    </div>
  </section>
  {work_strip(label=bi('من الشغل','From the work'))}
</main>"""
    return (h + header('') + body + footer()).replace('{R}', '')


def work_index():
    tiles = []
    for i, p in enumerate(P):
        m = p['mods'][0]
        w, h = dims(m, 700)
        car, cen = CATS[p['cat']]
        tiles.append(f'''<a class="tile up{' t-w' if i % 5 < 2 else ''}" data-c="{p['cat']}" href="work/{p['slug']}.html" data-cur="VIEW">
  <span class="tile-m"><img src="{url(m)}" srcset="{srcset(m, min(m['w'],1400))}" sizes="(max-width:620px) calc(100vw - 36px), (max-width:1100px) calc(50vw - 40px), (min-width:1768px) 800px, calc(50vw - 60px)" alt="{e(p['en'])}" width="{w}" height="{h}" loading="{'eager' if i < 4 else 'lazy'}" decoding="async">
    <span class="tile-o"><span class="tile-go">{bi('شوف المشروع','View project')}</span></span></span>
  <span class="tile-b"><span class="tile-t">{bi(p['ar'], p['en'])}</span><span class="tile-y">{p['year']}</span></span>
  <span class="tile-c">{bi(car, cen)}</span>
</a>''')

    counts = {}
    for p in P:
        counts[p['cat']] = counts.get(p['cat'], 0) + 1
    fs = ['<button class="f on" data-c="all" type="button">%s<b>%d</b></button>'
          % (bi('الكل', 'All'), len(P))]
    for c, (ar, en) in CATS.items():
        if counts.get(c):
            fs.append('<button class="f" data-c="%s" type="button">%s<b>%d</b></button>'
                      % (c, bi(ar, en), counts[c]))

    body = f'''
<main>
  <section class="sec" style="padding-top:clamp(110px,15vh,170px)">
    <div class="wrap">
      <div class="shead">
        <div class="shead-l"><span class="idx">/ {len(P):02d}</span>
          <h2>{bi(*C.ALL_HEAD)}</h2></div>
        <p class="note">{bi(*C.ALL_NOTE)}</p>
      </div>
    </div>
    {work_strip(seed=5, count=18, label=bi('لمحة سريعة','A quick look'))}
    <div class="wrap">
      <div class="filters">{''.join(fs)}</div>
      <div class="mosaic">{''.join(tiles)}</div>
    </div>
  </section>
  <section class="end">
    <div class="wrap">
      <h2 class="up">{bi('شفت حاجة<br><em>عجبتك؟</em>','Seen something<br>you <em>like?</em>')}</h2>
      <div class="end-act up">
        <a class="btn" id="waBtn" href="{WA}" target="_blank" rel="noopener">{bi(*C.CONTACT_BTN)}{ARROW}</a>
        <a class="end-mail" href="mailto:{MAIL}">{MAIL}</a>
      </div>
    </div>
  </section>
</main>'''
    items = {"@type": "ItemList", "@id": SITE + "work.html#list",
             "numberOfItems": len(P), "itemListElement": [
                 {"@type": "ListItem", "position": i + 1,
                  "url": SITE + "work/" + q['slug'] + ".html", "name": q['en']}
                 for i, q in enumerate(P)]}
    coll = {"@type": "CollectionPage", "@id": SITE + "work.html#page",
            "name": C.TITLE_WORK, "about": {"@id": SITE + "#me"},
            "dateModified": TODAY, "mainEntity": {"@id": SITE + "work.html#list"}}
    h = head(C.TITLE_WORK, seo(C.DESC_WORK), SITE + 'work.html', SITE + 'images/og.jpg',
             schema=ld(*base_graph(), coll, items,
                       crumbs((C.NAME[1], SITE), ('Work', SITE + 'work.html'))))
    return (h + header('work') + body + footer()).replace('{R}', '')


SVC = C.SERVICES

DLV = C.DELIVER



# A hand-drawn pen stroke under the headline's accent word. Desktop only; it
# draws itself once the headline has risen (style.css: .swoosh).
SWOOSH = ('<svg class="swoosh" viewBox="0 0 320 64" preserveAspectRatio="none" aria-hidden="true">'
          '<path pathLength="1" d="M8 40C70 31 142 25 214 28c46 2 92 9 96 17 4 9-43 13-95 12'
          'C160 56 110 51 92 46"/></svg>')


def words(ar, en):
    """A line split into whole words for a staggered reveal; an <em>...</em>
    run stays one unit. Never letters: splitting Arabic into letters breaks
    the joins between them. On a phone the spans are plain inline text."""
    import re
    tok = re.compile(r'<em>.*?</em>[^\s]*|\S+')
    w = lambda s: ' '.join('<span class="w" style="--i:%d">%s</span>' % (i, x)
                           for i, x in enumerate(tok.findall(s)))
    return bi(w(ar), w(en))


# The desktop work collage: real projects scattered at different sizes, each
# drifting at its own speed on scroll (site.js). Positions are a fixed
# choreography in container units, so the layout scales with the column and
# mirrors itself in Arabic through inset-inline-start.
CLG = [  # inline-start %, top (cqw), width %, scroll speed
    (0, 0, 30, .88), (36, 7, 21, .66), (66, 0, 27, 1.14),
    (4, 27, 23, 1.1), (34, 37, 31, .82), (73, 40, 21, .7),
    (14, 58, 25, 1.18),
]
# where the line of copy sits inside the collage (inline-start %, top cqw)
CLG_QUOTE = (50, 74)


def collage():
    items, bottom = [], 0
    for (x, y, w, sp), p in zip(CLG, P):
        m = next((m for m in p['mods'] if .7 <= m['r'] <= 1.8), p['mods'][0])
        mw, mh = dims(m, 1400)
        bottom = max(bottom, y + w / m['r'] + 5)
        car, cen = CATS[p['cat']]
        items.append(
            f'<a class="clg-i" href="work/{p["slug"]}.html" style="--x:{x};--y:{y};--w:{w};--s:{sp}" data-cur="VIEW">'
            f'<span class="clg-m" style="aspect-ratio:{mw}/{mh}"><img src="{url(m)}" '
            f'srcset="{srcset(m, min(m["w"], 1400))}" sizes="(min-width: 861px) 34vw, 1px" alt="{e(p["en"])}" '
            f'width="{mw}" height="{mh}" loading="lazy" decoding="async"></span>'
            f'<span class="clg-c"><b>{bi(p["ar"], p["en"])}</b><span>{bi(car, cen)} · {p["year"]}</span></span></a>')
    # one line of his own copy set among the pictures, as the reference sets its quotes
    qa, qe = (x.split('.')[1].strip() + '.' for x in C.HERO_INTRO)
    qx, qy = CLG_QUOTE
    items.append(f'<p class="clg-q" style="--x:{qx};--y:{qy};--s:.92">{bi(qa, qe)}</p>')
    bottom = max(bottom, qy + 12)
    return f'<div class="clg" style="--h:{bottom:.1f}">{"".join(items)}</div>'


def home():
    hero = ''.join(
        '<span class="%s">%s</span>' % (lang, ''.join(
            '<span class="ln"><span>%s</span></span>' % ln for ln in lines))
        for lang, lines in (('ar', C.HERO_AR), ('en', C.HERO_EN)))
    hero = hero.replace('</em>', SWOOSH + '</em>')

    # One group of stats is only ~700px wide. The strip animates by -50%,
    # so each half has to be wider than the widest screen or a bare gap
    # scrolls past. Six groups a half covers an ultrawide monitor.
    def stat(n, pre):
        # None means "however many projects are actually on the site"
        if n is None:
            n = C.PROJECT_COUNT if C.PROJECT_COUNT else len(P)
        return n, pre
    group = '<span>' + ' <i>/</i> '.join(
        '<b data-n="%d"%s>0</b> %s' % (stat(n, pre)[0],
                                       (' data-pre="%s"' % pre) if pre else '', bi(a, e))
        for n, pre, a, e in C.STATS) + ' <i>/</i> </span>'
    ticker = group * 8

    lead = ''.join(
        '<label class="lead-l"><span>%s</span>'
        '<input name="%s" type="%s" %sautocomplete="%s"></label>'
        % (bi(la, le), key, typ, 'required ' if req else '',
           {'name': 'name', 'phone': 'tel', 'email': 'email'}.get(key, 'on'))
        for key, la, le, typ, req in C.FORM_FIELDS)

    ask = ''.join(
        '<div class="ask-q"><p class="ask-k"><i>%02d</i>%s</p><div class="chips">%s</div></div>'
        % (qi + 1, bi(qa, qe), ''.join(
            '<button type="button" class="chip" data-q="%d" data-ar="%s" data-en="%s">%s</button>'
            % (qi, ca, ce, bi(ca, ce)) for ca, ce in opts))
        for qi, (qa, qe, opts) in enumerate(C.ASK))

    faq = ''.join(
        '<details class="qa up"%s><summary><h3>%s</h3>'
        '<span class="qa-i" aria-hidden="true"></span></summary>'
        '<div class="qa-a"><p>%s</p></div></details>'
        % (' open' if i == 0 else '', bi(qa, qe), bi(aa, ae))
        for i, (qa, qe, aa, ae) in enumerate(C.FAQ))

    facts = ''.join('<div><dt>%s</dt><dd>%s</dd></div>' % (bi(a, e), bi(va, ve))
                    for a, e, va, ve in C.ABOUT_FACTS)

    feat = P[:6]
    rows = []
    for i, p in enumerate(feat):
        car, cen = CATS[p['cat']]
        bg = ''.join('<img src="%smax_632_webp/%s" alt="" width="%d" height="%d" '
                     'loading="lazy" decoding="async">' % (CDN, m['f'], *dims(m, 632))
                     for m in p['mods'][:4])
        m0 = p['mods'][0]
        mw, mh = dims(m0, 700)
        rows.append(f'''<a class="wrow" href="work/{p['slug']}.html" data-cur="VIEW">
  <span class="wrow-bg" aria-hidden="true">{bg}</span>
  <span class="wrow-in">
    <span class="wrow-n">{i+1:02d}</span>
    <span class="wrow-t">{bi(p['ar'], p['en'])}</span>
    <span class="wrow-m" style="--ar:{mw}/{mh}"><img src="{url(m0)}" srcset="{srcset(m0, min(m0['w'],1400))}" sizes="calc(100vw - 36px)" alt="{e(p['en'])}" width="{mw}" height="{mh}" loading="lazy" decoding="async"></span>
    <span class="wrow-meta"><span class="wrow-c">{bi(car, cen)}</span><span class="wrow-end"><span class="wrow-y">{p['year']}</span><span class="wrow-go">{bi('شوف المشروع','View project')}{ARROW}</span></span></span>
  </span>
</a>''')

    # a running strip of real work under the headline
    strip = []
    for p in P:
        for m in p['mods'][:2]:
            if m['w'] >= 1400:
                strip.append((p, m))
    strip = strip[:16]
    items = ''.join(
        '<a href="work/%s.html" aria-label="%s"><img src="%s%s/%s" alt="%s" '
        'width="%d" height="%d" loading="lazy" decoding="async"></a>'
        % (p['slug'], e(p['en']), CDN, 'max_632_webp', m['f'], e(p['en']), *dims(m, 632))
        for p, m in strip)

    # Services as one expanding list rather than a row of equal boxes: the
    # headline of each service reads at a glance, and opening one gives the
    # deliverables, the price, the turnaround and a look at matching work —
    # so the decision can be made here instead of on another page.
    svc = []
    for si, (n, ar, en, ard, end, price, tar, ten, ic) in enumerate(SVC):
        cfg = C.SERVICE_PAGES[n]
        inc = ''.join('<li>%s</li>' % bi(a, b) for a, b in cfg['inc'])
        # Real work in the same family, at a size that can fill the slot. Some
        # families are small — there are only two logo projects — so the pool
        # widens to the rest of the work rather than leaving a hole in the grid.
        shots, seen = [], set()
        for own in (True, False):
            for p in P:
                if len(shots) == 3:
                    break
                if p['slug'] in seen or (p['cat'] == cfg['cat']) != own:
                    continue
                for m in p['mods']:
                    if m['w'] >= 1080:
                        shots.append((p, m)); seen.add(p['slug']); break
        ph = ''.join(
            '<a href="work/%s.html" aria-label="%s"><img src="%smax_632_webp/%s" alt="%s" '
            'width="%d" height="%d" loading="lazy" decoding="async"></a>'
            % (p['slug'], e(p['en']), CDN, m['f'], e(p['en']), *dims(m, 632))
            for p, m in shots)
        op = ' aria-expanded="true"' if si == 0 else ' aria-expanded="false"'
        svc.append(f'''<div class="svl-r{' on' if si == 0 else ''} up">
  <button class="svl-h" type="button"{op} aria-controls="svp{n}">
    <span class="svl-n">{n}</span>
    <span class="svl-i"><svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{ic}</svg></span>
    <span class="svl-t">{bi(ar, en)}</span>
    <span class="svl-pr">{price}</span>
    <span class="svl-x" aria-hidden="true"><i></i><i></i></span>
  </button>
  <div class="svl-p" id="svp{n}">
    <div class="svl-g">
      <div class="svl-c">
        <p class="svl-d">{bi(ard, end)}</p>
        <ul class="svl-inc">{inc}</ul>
        <p class="svl-m"><span>{bi('مدة التنفيذ','Turnaround')}</span><b>{bi(tar, ten)}</b></p>
        <div class="svl-a">
          <a class="btn btn-s" href="#contact" data-ask="{cfg['ask']}">{bi('ابدأ الخدمة دي','Start this')}{ARROW}</a>
          <a class="svl-l" href="services/{cfg['slug']}.html">{bi('تفاصيل أكتر','Full details')}{ARROW}</a>
        </div>
      </div>
      <div class="svl-ph">{ph}</div>
    </div>
  </div>
</div>''')
    svc = ''.join(svc)

    dlv = ''.join(f'''<div class="dv-c up"><svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{ic}</svg>
  <h3>{bi(ar, en)}</h3><p>{bi(ard, end)}</p></div>''' for ar, en, ard, end, ic in DLV)

    body = f'''
<main id="top">
<section class="hero">
  <div class="hero-fx" aria-hidden="true">
    <span class="orb orb-a"></span><span class="orb orb-c"></span>
  </div>
  <div class="hero-bgw" aria-hidden="true"><canvas class="hero-bg" id="heroBg"></canvas></div>
  <span class="hero-sheen" aria-hidden="true"><i></i></span>
  <span class="hero-veil" aria-hidden="true"></span>
  <div class="wrap">
    <p class="kick"><b></b>{bi(*C.HERO_BADGE)}</p>
    <h1 class="mega">
      {hero}
    </h1>
    <div class="hero-foot">
      <p>{bi(*C.HERO_INTRO)}</p>
      <a class="ln-a" href="#work">{bi(*C.HERO_CTA)}{ARROW}</a>
    </div>
  </div>
  <div class="mq"><div class="mq-t a">{items}{items}</div></div>
  <div class="tick" aria-hidden="true"><div class="tick-t">{ticker}{ticker}</div></div>
</section>

<section class="sec" id="work">
  <div class="wrap">
    <div class="shead">
      <div class="shead-l"><span class="idx">01</span><h2>{bi(*C.WORK_HEAD)}</h2></div>
      <p class="note">{bi(*C.WORK_NOTE)}</p>
    </div>
    <div class="rows">{''.join(rows)}</div>
    {collage()}
    <p style="margin-top:clamp(26px,3.4vw,44px)"><a class="ln-a" href="work.html">{bi(*C.WORK_ALL)}{ARROW}</a></p>
  </div>
</section>

<section class="say">
  <div class="wrap">
    <p class="k">{bi(*C.BAND_KICKER)}</p>
    <h2 class="up">{words(*C.BAND_LINE)}</h2>
  </div>
</section>

<section class="sec" id="services">
  <div class="wrap">
    <div class="shead">
      <div class="shead-l"><span class="idx">02</span><h2>{bi(*C.SERVICES_HEAD)}</h2></div>
      <p class="note">{bi(*C.SERVICES_NOTE)}</p>
    </div>
    <div class="svl">{svc}</div>
  </div>
</section>

<section class="sec" id="about">
  <div class="wrap">
    <div class="shead">
      <div class="shead-l"><span class="idx">03</span><h2>{bi(*C.ABOUT_HEAD)}</h2></div>
    </div>
    <div class="me">
      <div class="me-ph up"><img src="images/profile.jpg" alt="Beshoy Wafiek" loading="lazy" decoding="async" width="900" height="900"></div>
      <div class="me-copy up">
        <p class="me-lead">{bi(*C.ABOUT_LEAD)}</p>
        <p>{bi(*C.ABOUT_BODY)}</p>
        <dl class="me-facts">{facts}</dl>
      </div>
    </div>
  </div>
</section>

<section class="sec" id="deliver">
  <div class="wrap">
    <div class="shead">
      <div class="shead-l"><span class="idx">04</span><h2>{bi(*C.DELIVER_HEAD)}</h2></div>
      <p class="note">{bi(*C.DELIVER_NOTE)}</p>
    </div>
    <div class="dv">{dlv}</div>
  </div>
</section>

{proof()}
<section class="sec" id="faq">
  <div class="wrap">
    <div class="shead">
      <div class="shead-l"><span class="idx">05</span><h2>{bi(*C.FAQ_HEAD)}</h2></div>
    </div>
    <div class="qas">{faq}</div>
  </div>
</section>

<section class="end" id="contact">
  <div class="wrap">
    <span class="idx">06</span>
    <h2 class="up">{bi(C.CONTACT_AR, C.CONTACT_EN)}</h2>
    <div class="pick up">
      <p class="pick-k">{bi(*C.PICK_LABEL)}</p>
      <div class="ask"
           data-msg-ar="{e(C.ASK_MSG[0])}" data-msg-en="{e(C.ASK_MSG[1])}"
           data-empty-ar="{e(C.ASK_MSG_EMPTY[0])}" data-empty-en="{e(C.ASK_MSG_EMPTY[1])}"
           data-any-ar="{e(C.ASK_ANY[0])}" data-any-en="{e(C.ASK_ANY[1])}">{ask}</div>
      <div class="ask-out">
        <p class="ask-lbl">{bi(*C.ASK_PREVIEW)}</p>
        <p class="ask-prev" id="askPrev"></p>
        <div class="end-act">
          <a class="btn" id="waBtn" href="{WA}" target="_blank" rel="noopener">{bi(*C.CONTACT_BTN)}{ARROW}</a>
          <a class="end-mail" href="mailto:{MAIL}">{MAIL}</a>
        </div>
      </div>
      <form class="lead" id="lead" data-endpoint="{C.FORM_ENDPOINT}"
            data-ok-ar="{e(C.FORM_OK[0])}" data-ok-en="{e(C.FORM_OK[1])}"
            data-err-ar="{e(C.FORM_ERR[0])}" data-err-en="{e(C.FORM_ERR[1])}"
            data-send-ar="{e(C.FORM_SEND[0])}" data-send-en="{e(C.FORM_SEND[1])}"
            data-busy-ar="{e(C.FORM_SENDING[0])}" data-busy-en="{e(C.FORM_SENDING[1])}" novalidate>
        <p class="lead-t">{bi(*C.FORM_TITLE)}</p>
        <!-- A field no human can see or tab into. Bots fill every input they
             find; the script drops any submission that has this one set. Costs
             nothing and keeps the sheet clean once the endpoint is live. -->
        <div class="hp" aria-hidden="true"><label>Company website<input name="website" type="text" tabindex="-1" autocomplete="off"></label></div>
        <div class="lead-grid">{lead}</div>
        <div class="lead-act">
          <button class="btn btn--ghost" type="submit" id="leadBtn">{bi(*C.FORM_SEND)}{ARROW}</button>
          <span class="lead-note">{bi(*C.FORM_NOTE)}</span>
        </div>
        <p class="lead-msg" id="leadMsg" role="status" aria-live="polite"></p>
      </form>
    </div>
  </div>
</section>
</main>'''

    faq_ld = {"@type": "FAQPage", "@id": SITE + "#faq", "mainEntity": [
        {"@type": "Question", "name": qe,
         "acceptedAnswer": {"@type": "Answer", "text": ae}}
        for qa, qe, aa, ae in C.FAQ]}
    prof = {"@type": "ProfilePage", "@id": SITE + "#page",
            "mainEntity": {"@id": SITE + "#me"},
            "about": {"@id": SITE + "#practice"},
            "dateModified": TODAY, "inLanguage": ["ar", "en"]}
    h = head(C.TITLE_HOME, seo(C.DESC_HOME), SITE, SITE + 'images/og.jpg',
             schema=ld(*base_graph(), prof, faq_ld))
    return (h + header('') + body + footer()).replace('{R}', '')



def service(num, ar, en, ard, end, price, tar, ten, icon):
    """A full page per service, built from the same parts as a case study."""
    cfg = C.SERVICE_PAGES[num]
    rel = [p for p in P if p['cat'] == cfg['cat']][:6]

    inc = ''.join('<li>%s</li>' % bi(a, e) for a, e in cfg['inc'])

    steps = ''.join(
        '<div class="step up"><span class="step-n">%02d</span><h3>%s</h3><p>%s</p></div>'
        % (i + 1, bi(sa, se), bi(da, de))
        for i, (sa, se, da, de) in enumerate(C.PROCESS))

    cards = ''
    if rel:
        cards = ''.join(
            '<a class="tile up" href="../work/%s.html" data-cur="VIEW">'
            '<span class="tile-m"><img src="%s" srcset="%s" '
            'sizes="(max-width:620px) calc(100vw - 36px), (max-width:1100px) calc(50vw - 40px), 420px" '
            'alt="%s" width="%d" height="%d" loading="lazy" decoding="async">'
            '<span class="tile-o"><span class="tile-go">%s</span></span></span>'
            '<span class="tile-b"><span class="tile-t">%s</span><span class="tile-y">%s</span></span></a>'
            % (q['slug'], url(q['mods'][0]), srcset(q['mods'][0], min(q['mods'][0]['w'], 1400)),
               e(q['en']), *dims(q['mods'][0], 700),
               bi('شوف المشروع', 'View project'), bi(q['ar'], q['en']), q['year'])
            for q in rel)

    body = f'''
<main class="cs">
  <section class="cs-top">
    <div class="wrap">
      <a class="cs-back" href="../index.html#services">{ARROWL}{bi(*C.SVC_ALL)}</a>
      <p class="svc-num">{num}</p>
      <h1 class="cs-h1">{bi(ar, en)}</h1>
      <p class="cs-lead">{bi(ard, end)}</p>
      <dl class="cs-meta up">
        <div><dt>{bi('السعر يبدأ من','From')}</dt><dd>{price}</dd></div>
        <div><dt>{bi('المدة','Timeline')}</dt><dd>{bi(tar, ten)}</dd></div>
        <div><dt>{bi('اللغات','Languages')}</dt><dd>{bi('عربي · إنجليزي','Arabic · English')}</dd></div>
        <div><dt>{bi('التعديلات','Revisions')}</dt><dd>{bi('لحد ما تظبط','Until it is right')}</dd></div>
      </dl>
    </div>
  </section>

  {work_strip('../', seed=int(num) % 29, count=18, label=bi('من الشغل','From the work'))}

  <section class="sec" style="padding-top:clamp(30px,5vw,60px)">
    <div class="wrap">
      <div class="shead"><div class="shead-l"><span class="idx">01</span>
        <h2>{bi(*C.SVC_INC_HEAD)}</h2></div></div>
      <ul class="inc up">{inc}</ul>
    </div>
  </section>

  <section class="sec" style="padding-top:0">
    <div class="wrap">
      <div class="shead"><div class="shead-l"><span class="idx">02</span>
        <h2>{bi(*C.SVC_HOW_HEAD)}</h2></div></div>
      <div class="steps">{steps}</div>
    </div>
  </section>

  {'<section class="sec" style="padding-top:0"><div class="wrap"><div class="shead"><div class="shead-l"><span class="idx">03</span><h2>' + bi(*C.SVC_WORK_HEAD) + '</h2></div></div><div class="mosaic mosaic--svc">' + cards + '</div></div></section>' if cards else ''}

  <section class="end">
    <div class="wrap">
      <h2 class="up">{bi(ar, en)}<br><em>{bi('من ' + price, 'from ' + price)}</em></h2>
      <div class="end-act up">
        <a class="btn" href="../index.html?ask={cfg['ask']}#contact">{bi(*C.SVC_CTA)}{ARROW}</a>
        <a class="end-mail" href="mailto:{MAIL}">{MAIL}</a>
      </div>
    </div>
  </section>
</main>'''

    page_url = SITE + 'services/' + cfg['slug'] + '.html'
    svc_ld = {
        "@type": "Service", "@id": page_url + "#service",
        "name": en, "alternateName": ar, "description": end,
        "serviceType": en, "url": page_url,
        "provider": {"@id": SITE + "#practice"},
        "areaServed": C.SEO_AREAS, "availableLanguage": ["ar", "en"],
        "termsOfService": SITE,
        "offers": {"@type": "Offer", "price": price.replace('$', '').replace('+', ''),
                   "priceCurrency": "USD", "url": page_url,
                   "availability": "https://schema.org/InStock",
                   "priceSpecification": {
                       "@type": "PriceSpecification", "minPrice": price.replace('$', '').replace('+', ''),
                       "priceCurrency": "USD"}},
        "hasOfferCatalog": {"@type": "OfferCatalog", "name": en, "itemListElement": [
            {"@type": "Offer", "itemOffered": {"@type": "Service", "name": ie}}
            for ia, ie in cfg['inc']]},
    }
    h = head('%s — %s | %s' % (ar, en, C.NAME[1]),
             '%s %s' % (end, ard),
             page_url, url(P[0]['mods'][0]),
             schema=ld(*base_graph(), svc_ld,
                       crumbs((C.NAME[1], SITE), ('Services', SITE + '#services'),
                              (en, page_url))))
    return (h + header('') + body + footer()).replace('{R}', '../')

# ---------------------------------------------------------------- run
def main():
    os.makedirs(os.path.join(OUT, 'work'), exist_ok=True)
    os.makedirs(os.path.join(OUT, 'css'), exist_ok=True)
    os.makedirs(os.path.join(OUT, 'js'), exist_ok=True)
    shutil.copy(os.path.join(SRC, 'style.css'), os.path.join(OUT, 'css', 'style.css'))
    shutil.copy(os.path.join(SRC, 'site.js'), os.path.join(OUT, 'js', 'site.js'))

    open(os.path.join(OUT, 'index.html'), 'w', encoding='utf-8').write(home())
    open(os.path.join(OUT, 'work.html'), 'w', encoding='utf-8').write(work_index())
    os.makedirs(os.path.join(OUT, 'services'), exist_ok=True)
    for row in C.SERVICES:
        open(os.path.join(OUT, 'services', C.SERVICE_PAGES[row[0]]['slug'] + '.html'),
             'w', encoding='utf-8').write(service(*row))

    for i, p in enumerate(P):
        prev = P[(i - 1) % len(P)]
        nxt = P[(i + 1) % len(P)]
        open(os.path.join(OUT, 'work', p['slug'] + '.html'), 'w', encoding='utf-8').write(case(p, prev, nxt))

    # a sitemap and robots.txt, because the point of this site is being found
    urls = [(SITE, '1.0'), (SITE + 'work.html', '0.9')]
    urls += [(SITE + 'services/' + C.SERVICE_PAGES[k]['slug'] + '.html', '0.9')
             for k in C.SERVICE_PAGES]
    urls += [(SITE + 'work/' + p['slug'] + '.html', '0.8') for p in P]
    sm = ['<?xml version="1.0" encoding="UTF-8"?>',
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for u, pr in urls:
        sm.append('  <url><loc>%s</loc><lastmod>%s</lastmod><priority>%s</priority></url>'
                  % (u, date.today().isoformat(), pr))
    sm.append('</urlset>')
    open(os.path.join(OUT, '404.html'), 'w', encoding='utf-8').write(notfound())
    open(os.path.join(OUT, 'sitemap.xml'), 'w', encoding='utf-8').write('\n'.join(sm) + '\n')
    # AI assistants are named explicitly: he wants to be quoted by them,
    # and several only index what they are clearly allowed to read.
    # No llms.txt here on purpose — Google rejected the idea publicly and
    # large studies found no effect, so it would be a file doing nothing.
    bots = ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot',
            'Claude-Web', 'anthropic-ai', 'PerplexityBot', 'Perplexity-User',
            'Google-Extended', 'Applebot-Extended', 'Bingbot', 'CCBot',
            'Amazonbot', 'meta-externalagent']
    lines = ['User-agent: *', 'Allow: /', '']
    for bot in bots:
        lines += ['User-agent: %s' % bot, 'Allow: /', '']
    lines += ['Sitemap: %ssitemap.xml' % SITE, '']
    open(os.path.join(OUT, 'robots.txt'), 'w', encoding='utf-8').write('\n'.join(lines))

    n_img = sum(len(p['mods']) for p in P)
    print('built  index.html  work.html  + %d case studies  (%d images)' % (len(P), n_img))


if __name__ == '__main__':
    main()
