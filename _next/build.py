# -*- coding: utf-8 -*-
"""The new site — a separate project, built from scratch.

Same content as the live site (it reads _source/content.py and _source/meta.py
and the image list in js/projects.json, so there is still ONE place to edit
copy), but a different design, layout and code. Nothing here touches the live
site at the repository root.

    python3 _next/build.py          ->  _next/site/

_next/ starts with an underscore, so GitHub Pages does not publish it.
"""
import html
import json
import os
import re
import shutil
import sys
from datetime import date

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, os.path.join(ROOT, '_source'))
import content as C   # noqa: E402  all the copy
import meta as M      # noqa: E402  the story behind each project

OUT = os.path.join(HERE, 'site')
SRC = os.path.join(HERE, 'src')
CDN = 'https://mir-s3-cdn-cf.behance.net/project_modules/'
SITE = C.SITE
YEAR = date.today().year

P = json.load(open(os.path.join(ROOT, 'js', 'projects.json'), encoding='utf-8'))
BY = {p['slug']: p for p in P}
N = len(P)
AR_DIGITS = str.maketrans('0123456789', '٠١٢٣٤٥٦٧٨٩')

# The reel on the home page. Picked by eye from the contact sheet: work that
# reads at a glance, across identity and social. (slug, index of the image)
FEATURE = [
    ('mountain-view-club', None), ('elva', None), ('restaurant-digital-campaign', 0),
    ('kin', None), ('nabae-alaser', None), ('branding-and-social', None),
    ('hi-my-little-teeth', None), ('visual-identity-showcase', None),
]
# images that flash in the hero window
WINDOW = ['elva', 'mountain-view-club', 'hoops-ablaze', 'kin', 'pizza-restaurant',
          'branding-and-social', 'hi-my-little-teeth', 'iman-abdel-ghani']


# ---------------------------------------------------------------- helpers
def e(s):
    return html.escape(s, quote=True)


def bi(ar, en, tag='span', cls=''):
    c = (' class="%s"' % cls) if cls else ''
    return '<%s%s><span class="ar">%s</span><span class="en">%s</span></%s>' % (tag, c, ar, en, tag)


def seo(text):
    return text.replace('{an}', str(N).translate(AR_DIGITS)).replace('{n}', str(N))


def img(m, size='1400'):
    """A Behance module URL. 'sm' is the 632px-tall variant, which exists for
    every module (measured on the live site)."""
    if size == 'sm':
        return CDN + 'max_632_webp/' + m['f']
    if size == 'hi':
        return CDN + m['hi'] + '/' + m['f']
    return CDN + m['v'] + '/' + m['f']


def wh(m, cap=1400):
    w = min(m['w'], cap)
    return w, max(1, round(w / m['r']))


def cover(p, idx=None, shape='land'):
    """The image that stands for a project. Prefer a landscape board for wide
    slots; fall back to the first image."""
    if idx is not None:
        return p['mods'][idx]
    if shape == 'land':
        for m in p['mods']:
            if 1.15 <= m['r'] < 2.6:
                return m
    return p['mods'][0]


def picture(m, alt='', cls='', eager=False, size='1400', sizes=None):
    w, h = wh(m)
    srcset = ''
    if size == '1400':
        sw = round(632 * m['r'])
        if 200 <= sw < w * .85:
            srcset = ' srcset="%s %dw, %s %dw" sizes="%s"' % (
                img(m, 'sm'), sw, img(m), w, sizes or '100vw')
    return '<img%s src="%s"%s alt="%s" width="%d" height="%d" %s decoding="async">' % (
        (' class="%s"' % cls) if cls else '', img(m, size), srcset, e(alt), w, h,
        'loading="eager" fetchpriority="high"' if eager else 'loading="lazy"')


ARROW = ('<svg class="ar-x" viewBox="0 0 24 24" width="24" height="24" fill="none" '
         'stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M4 12h15M13 6l6 6-6 6"/></svg>')
ARROW_D = ('<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" '
           'stroke-width="1.8" aria-hidden="true"><path d="M12 4v15M6 13l6 6 6-6"/></svg>')
WA_ICON = ('<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" '
           'd="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.9 11.9 0 0 0 4.6 4c1.7.7 2.4.8 3.2.7.5-.1 1.5-.6 1.8-1.2.2-.6.2-1.1.1-1.2l-.5-.3Z"/></svg>')
BACK = ('<svg class="ar-x" viewBox="0 0 24 24" width="24" height="24" fill="none" '
        'stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M20 12H5M11 6l-6 6 6 6"/></svg>')
STAR = '<svg class="star" viewBox="0 0 40 40" aria-hidden="true"><path d="M20 0l3.2 14.1L36 6.4 25.9 16.8 40 20l-14.1 3.2L36 33.6l-10.1-6.8L20 40l-3.2-13.2L4 33.6l10.1-10.4L0 20l14.1-3.2L4 6.4l12.8 7.7z"/></svg>'


def cat(p):
    return C.CATS[p['cat']]


def year(p):
    return str(p.get('year', ''))


def num(i, total=None):
    s = '%02d' % i
    return s if total is None else '%s / %02d' % (s, total)


def wa(msg_ar=None, msg_en=None):
    return C.WA


# ---------------------------------------------------------------- page shell
FONTS = ('https://fonts.googleapis.com/css2?family=Alexandria:wght@300;400;500;700;800;900'
         '&family=Archivo:wdth,wght@62..125,300..900&family=IBM+Plex+Mono:wght@400;500&display=swap')

LANG_BOOT = ("<script>(function(){var d=document.documentElement,l=null;try{l=localStorage.getItem('bw_lang')}catch(e){}"
             "if(l!=='ar'&&l!=='en'){var n=(navigator.languages&&navigator.languages[0])||navigator.language||'en';"
             "l=n.toLowerCase().indexOf('ar')===0?'ar':'en'}d.lang=l;d.dir=l==='ar'?'rtl':'ltr';"
             "d.className=d.className.replace('no-js','js');setTimeout(function(){d.classList.add('ready')},2500)})()</script>")


def head(title, desc, path, og=None, R=''):
    canon = SITE + path
    og = og or SITE + 'images/og.jpg'
    t_ar, _, t_en = title.partition(' | ')
    schema = json.dumps({
        "@context": "https://schema.org", "@type": "Person", "name": C.NAME[1],
        "alternateName": C.SEO_NAME_AR, "jobTitle": [C.SEO_JOB_EN, C.SEO_JOB_AR],
        "url": SITE, "image": SITE + "images/profile.jpg", "sameAs": C.SEO_PROFILES,
        "address": {"@type": "PostalAddress", "addressLocality": C.SEO_CITY,
                    "addressCountry": C.SEO_COUNTRY}}, ensure_ascii=False)
    ga = ''
    if C.GA_ID:
        ga = ('<script async src="https://www.googletagmanager.com/gtag/js?id=%s"></script>'
              '<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}'
              "gtag('js',new Date());gtag('config','%s');</script>" % (C.GA_ID, C.GA_ID))
    return f'''<!doctype html>
<html lang="ar" dir="rtl" class="no-js" data-t-ar="{e(t_ar or title)}" data-t-en="{e(t_en or title)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{e(title)}</title>
<meta name="description" content="{e(desc)}">
<link rel="canonical" href="{canon}">
<meta property="og:type" content="website">
<meta property="og:title" content="{e(title)}">
<meta property="og:description" content="{e(desc)}">
<meta property="og:url" content="{canon}">
<meta property="og:image" content="{og}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#EFECE6">
<link rel="icon" type="image/png" href="{R}images/favicon.png">
<link rel="apple-touch-icon" href="{R}images/touch-icon.png">
{LANG_BOOT}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preconnect" href="https://mir-s3-cdn-cf.behance.net" crossorigin>
<link rel="stylesheet" href="{FONTS}">
<link rel="stylesheet" href="{R}css/style.css">
<script type="application/ld+json">{schema}</script>
{ga}
</head>
'''


NAV = [  # (page, ar, en, id) — every main section is its own page
    ('index.html', 'الرئيسية', 'Home', 'home'),
    ('about.html', 'عني', 'About', 'about'),
    ('work.html', 'المشاريع', 'Projects', 'work'),
    ('archive.html', 'الأرشيف', 'Archive', 'archive'),
    ('services.html', 'الخدمات', 'Services', 'services'),
    ('contact.html', 'تواصل', 'Contact', 'contact'),
]


def navlink(R, href, ar, en, key, cur, extra=''):
    on = ' aria-current="page"' if key == cur else ''
    return '<a href="%s%s"%s>%s%s</a>' % (R, href, on, extra, bi(ar, en))


def header(R='', cur=''):
    links = ''.join(navlink(R, h, a, en, k, cur) for h, a, en, k in NAV[1:])
    menu_links = ''.join('<li>%s</li>' % navlink(R, h, a, en, k, cur, '<i>%02d</i>' % (i + 1))
                         for i, (h, a, en, k) in enumerate(NAV))
    menu_svc = ''.join(
        '<a href="%sservices/%s.html">%s</a>' % (R, C.SERVICE_PAGES[s[0]]['slug'], bi(s[1], s[2]))
        for s in C.SERVICES)
    return f'''<a class="skip" href="#main">{bi('اتخطى للمحتوى', 'Skip to content')}</a>
<header class="hd" id="hd">
  <a class="hd-id pill" href="{R}index.html" aria-label="{e(C.NAME[1])}"><img class="mk" src="{R}images/logo.png" alt="" width="34" height="24"><b>{bi(*C.NAME)}</b></a>
  <nav class="hd-nav pill" aria-label="Main">{links}</nav>
  <div class="hd-end">
    <button class="pill lang" id="lang" type="button" aria-label="Language / اللغة"><span class="ar">EN</span><span class="en">ع</span></button>
    <a class="pill hd-cta" href="{C.WA}" target="_blank" rel="noopener">{WA_ICON}{bi('يلا نتكلم', 'Let’s talk')}</a>
    <button class="pill burger" id="burger" type="button" aria-expanded="false" aria-controls="menu"><span class="bg-l" aria-hidden="true"></span>{bi('القائمة', 'Menu')}</button>
  </div>
</header>
<div class="menu" id="menu" hidden>
  <div class="menu-in">
    <ol class="menu-l">{menu_links}</ol>
    <div class="menu-s"><p class="lbl">{bi('الخدمات', 'Services')}</p>{menu_svc}</div>
    <div class="menu-c">
      <a class="btn btn-o" href="{C.WA}" target="_blank" rel="noopener">{WA_ICON}{bi(*C.CONTACT_BTN)}</a>
      <p class="mono">{C.MAIL}</p>
    </div>
  </div>
</div>
'''


def footer(R=''):
    soc = ''.join('<a href="%s" target="_blank" rel="noopener">%s</a>' % (u, bi(a, en))
                  for k, a, en, u in C.SOCIAL if u and k != 'email')
    pages = ''.join('<a href="%s%s">%s</a>' % (R, h, bi(a, en)) for h, a, en, _ in NAV)
    svcs = ''.join('<a href="%sservices/%s.html">%s</a>' % (R, C.SERVICE_PAGES[s[0]]['slug'], bi(s[1], s[2]))
                   for s in C.SERVICES)
    return f'''<footer class="ft">
  <div class="wrap ft-top">
    <div class="ft-say">
      <p class="ft-big-line">{bi('عندك فكرة؟<br>خلينا نخليها براند.', 'Got an idea?<br>Let’s make it a brand.')}</p>
      <a class="btn btn-o" href="{C.WA}" target="_blank" rel="noopener">{WA_ICON}{bi(*C.CONTACT_BTN)}</a>
    </div>
    <nav class="ft-col" aria-label="Pages"><p class="lbl">{bi('الصفحات', 'Pages')}</p>{pages}</nav>
    <nav class="ft-col" aria-label="Services"><p class="lbl">{bi('الخدمات', 'Services')}</p>{svcs}</nav>
    <nav class="ft-col" aria-label="Social"><p class="lbl">{bi('في كل مكان', 'Elsewhere')}</p>{soc}</nav>
  </div>
  <div class="ft-name" aria-hidden="true"><span class="fit" data-fit>{bi(*C.NAME)}</span></div>
  <div class="wrap ft-bot">
    <span>© {YEAR} {bi(*C.NAME)}</span>
    <span class="mono">{bi(C.CITY[0] + ' — ' + C.SEO_JOB_AR, C.CITY[1] + ' — ' + C.SEO_JOB_EN)}</span>
    <a href="#top" class="to-top">{bi('لفوق', 'Back to top')} ↑</a>
  </div>
</footer>
'''


def offer():
    """The first-project offer: a dialog in the middle of the screen after a
    few seconds, with name and number fields that go to the same Google
    Sheet as the contact form (and to WhatsApp until that is connected)."""
    if not C.OFFER_ON:
        return ''
    return f'''<div class="offer" id="offer" hidden role="dialog" aria-modal="true" aria-labelledby="offerT"
  data-delay="{getattr(C, 'OFFER_DELAY_NEW', C.OFFER_DELAY)}" data-days="{C.OFFER_DAYS}" data-acted="{C.OFFER_DAYS_ACTED}">
  <div class="offer-bg" data-close></div>
  <div class="offer-card" tabindex="-1">
    <button class="offer-x" type="button" data-close aria-label="Close">×</button>
    <p class="lbl">{bi(*C.OFFER_KICK)}</p>
    <p class="offer-t" id="offerT">{bi(*C.OFFER_TITLE)}</p>
    <p class="offer-b">{bi(*C.OFFER_BODY)}</p>
    <form class="offer-f lead-f" id="offerF" novalidate data-endpoint="{e(C.FORM_ENDPOINT)}"
      data-needs="{e(C.OFFER_KICK[0] + ' — ' + C.OFFER_TITLE[0])}" data-wa-ar="{e(C.OFFER_MSG[0])}" data-wa-en="{e(C.OFFER_MSG[1])}"
      data-busy-ar="{e(C.FORM_SENDING[0])}" data-busy-en="{e(C.FORM_SENDING[1])}"
      data-ok-ar="{e(C.OFFER_OK[0])}" data-ok-en="{e(C.OFFER_OK[1])}"
      data-err-ar="{e(C.FORM_ERR[0])}" data-err-en="{e(C.FORM_ERR[1])}">
      <p class="offer-fh">{bi(*C.OFFER_FORM)}</p>
      <div class="offer-ff">
        <label class="fld"><span>{bi(C.FORM_FIELDS[0][1], C.FORM_FIELDS[0][2])}</span><input name="name" type="text" required autocomplete="name"></label>
        <label class="fld"><span>{bi(C.FORM_FIELDS[1][1], C.FORM_FIELDS[1][2])}</span><input name="phone" type="tel" required autocomplete="tel"></label>
      </div>
      <label class="hp" aria-hidden="true">Website<input name="website" type="text" tabindex="-1" autocomplete="off"></label>
      <button class="btn btn-o btn-xl" type="submit">{bi(*C.OFFER_SEND)}{ARROW}</button>
      <p class="lead-msg" role="status" aria-live="polite"></p>
    </form>
    <div class="offer-a">
      <a class="btn btn-t" id="offerGo" href="{e(C.WA)}" target="_blank" rel="noopener">{WA_ICON}{bi(*C.OFFER_CTA)}</a>
      <button class="offer-skip" type="button" data-close>{bi(*C.OFFER_SKIP)}</button>
    </div>
  </div>
</div>
'''


def page(body_cls, title, desc, path, main, R='', og=None, cur=''):
    return (head(title, desc, path, og, R) +
            '<body class="%s">\n' % body_cls + header(R, cur) +
            '<main id="main">\n' + main + '\n</main>\n' + footer(R) + offer() +
            '<div class="cur" aria-hidden="true"><span class="cur-l">%s</span></div>\n' % bi('شوف', 'View') +
            '<script src="%sjs/site.js" defer></script>\n</body>\n</html>\n' % R)


# ---------------------------------------------------------------- blocks
def marquee(words_ar, words_en, cls=''):
    def group(ws):
        one = ''.join('<span>%s</span>%s' % (w, STAR) for w in ws)
        return '<div class="mq-g">%s</div>' % (one * 3)
    return ('<div class="mq %s" aria-hidden="true"><div class="mq-t ar">%s%s</div>'
            '<div class="mq-t en">%s%s</div></div>' % (cls, group(words_ar), group(words_ar),
                                                       group(words_en), group(words_en)))


def words(text_ar, text_en):
    """Split into word spans for the scroll fill. An <em>…</em> stays one span."""
    def split(t):
        out = []
        for tok in re.findall(r'<em>.*?</em>[^\s]*|\S+', t):
            out.append('<span class="w">%s</span>' % tok)
        return ' '.join(out)
    return bi(split(text_ar), split(text_en))


def ask_block():
    qs = []
    for qi, (qa, qe, opts) in enumerate(C.ASK):
        chips = ''.join(
            '<button type="button" class="chip" data-ar="%s" data-en="%s">%s</button>'
            % (e(a), e(en), bi(a, en)) for a, en in opts)
        qs.append('<div class="ask-q" data-q="%d"><p class="ask-h"><i>%02d</i>%s</p><div class="chips">%s</div></div>'
                  % (qi + 1, qi + 1, bi(qa, qe), chips))
    return f'''<div class="ask" id="ask" data-msg-ar="{e(C.ASK_MSG[0])}" data-msg-en="{e(C.ASK_MSG[1])}"
  data-empty-ar="{e(C.ASK_MSG_EMPTY[0])}" data-empty-en="{e(C.ASK_MSG_EMPTY[1])}"
  data-any-ar="{e(C.ASK_ANY[0])}" data-any-en="{e(C.ASK_ANY[1])}">
  <p class="lbl">{bi(*C.PICK_LABEL)}</p>
  {''.join(qs)}
  <div class="ask-pv"><p class="lbl">{bi(*C.ASK_PREVIEW)}</p><p class="ask-msg" id="askMsg">{bi(*C.ASK_MSG_EMPTY)}</p></div>
  <a class="btn btn-k btn-xl" id="waBtn" href="{C.WA}" target="_blank" rel="noopener">{WA_ICON}{bi(*C.CONTACT_BTN)}{ARROW}</a>
</div>'''


def lead_form():
    fields = ''.join(
        '<label class="fld"><span>%s</span><input name="%s" type="%s" %sautocomplete="%s"></label>'
        % (bi(la, le), k, t, 'required ' if req else '',
           {'name': 'name', 'phone': 'tel', 'email': 'email'}.get(k, 'on'))
        for k, la, le, t, req in C.FORM_FIELDS)
    return f'''<form class="lead lead-f" id="lead" data-endpoint="{e(C.FORM_ENDPOINT)}" novalidate
  data-busy-ar="{e(C.FORM_SENDING[0])}" data-busy-en="{e(C.FORM_SENDING[1])}"
  data-ok-ar="{e(C.FORM_OK[0])}" data-ok-en="{e(C.FORM_OK[1])}"
  data-err-ar="{e(C.FORM_ERR[0])}" data-err-en="{e(C.FORM_ERR[1])}">
  <p class="lead-t">{bi(*C.FORM_TITLE)}</p>
  {fields}
  <label class="hp" aria-hidden="true">Website<input name="website" type="text" tabindex="-1" autocomplete="off"></label>
  <button class="btn btn-k" type="submit">{bi(*C.FORM_SEND)}{ARROW}</button>
  <p class="lead-msg" role="status" aria-live="polite"></p>
  <p class="lead-note">{bi(*C.FORM_NOTE)}</p>
</form>'''


def contact(R=''):
    soc = ''.join('<a href="%s" target="_blank" rel="noopener">%s</a>' % (u, bi(a, en))
                  for k, a, en, u in C.SOCIAL if u and k != 'email')
    return f'''<section class="contact" id="contact">
  <div class="wrap">
    <p class="kick"><i>(—)</i>{bi('تواصل', 'Contact')}</p>
    <h1 class="contact-h">{bi(C.CONTACT_AR, C.CONTACT_EN)}</h1>
    <div class="contact-g">
      {ask_block()}
      {lead_form()}
    </div>
    <div class="contact-f">
      <div class="mail"><span class="lbl">{bi('إيميل', 'Email')}</span><span class="mail-a" id="mailA">{C.MAIL}</span><button type="button" class="copy" id="copyMail" data-ok-ar="اتنسخ" data-ok-en="Copied">{bi('انسخ', 'Copy')}</button></div>
      <div class="contact-soc">{soc}</div>
    </div>
  </div>
</section>'''


def process(kick='(04)'):
    steps = ''.join(
        '<li class="st"><span class="st-n">%02d</span><h3>%s</h3><p>%s</p></li>'
        % (i + 1, bi(a, en), bi(da, de)) for i, (a, en, da, de) in enumerate(C.PROCESS))
    return f'''<section class="proc" id="process">
  <div class="wrap">
    <div class="sh"><p class="kick"><i>{kick}</i>{bi(*C.SVC_HOW_HEAD)}</p>
    <h2 class="h2">{bi('أربع خطوات.<br>ولا مفاجأة.', 'Four steps.<br>No surprises.')}</h2></div>
    <div class="steps-w rv"><span class="steps-line" aria-hidden="true"></span><ol class="steps">{steps}</ol></div>
  </div>
</section>'''


def faq(kick='(05)'):
    items = ''.join(
        '<details class="fq"><summary>%s<span class="fq-i" aria-hidden="true"></span></summary><div class="fq-a">%s</div></details>'
        % (bi(qa, qe), bi(aa, ae)) for qa, qe, aa, ae in C.FAQ)
    return f'''<section class="faq" id="faq">
  <div class="wrap faq-g">
    <div class="sh"><p class="kick"><i>{kick}</i>{bi('أسئلة', 'FAQ')}</p><h2 class="h2">{bi(*C.FAQ_HEAD)}</h2></div>
    <div class="fq-l">{items}</div>
  </div>
</section>'''


def cta_band(ar, en, R=''):
    return f'''<section class="band">
  <div class="wrap band-in">
    <h2 class="band-h">{bi(ar, en)}</h2>
    <div class="band-a">
      <a class="btn btn-k btn-xl" href="{C.WA}" target="_blank" rel="noopener">{WA_ICON}{bi(*C.CONTACT_BTN)}</a>
      <a class="btn btn-t" href="{R}contact.html">{bi('أو سيب بياناتك', 'Or leave your details')}{ARROW}</a>
    </div>
  </div>
</section>'''


# ---------------------------------------------------------------- shared
# Ten projects for the archive page, picked for range: social, identity,
# logo and art direction, across the years. Every project is still one
# click away on the Projects page.
ARCHIVE = ['food-and-beverage', 'real-estate', 'yalla-masyaf', 'strike', 'pizza-restaurant',
           'iman-abdel-ghani', 'capital-football-academy', 'hoops-ablaze',
           'engineering-consultancy', 'lawyer-logo']


def pg_hero(kick_n, kick, title, sub='', extra='', vh='.3'):
    """The top of every inner page: a kicker, the page name set to the full
    width (capped by height so a short Arabic word does not fill the
    screen), and a line under it."""
    return f'''<section class="pg-hero">
  <div class="wrap">
    <p class="kick"><i>{kick_n}</i>{kick}</p>
    <h1 class="pg-h"><span class="fit" data-fit data-vh-ar="{vh}" data-vh-en="{vh}">{title}</span></h1>
    <div class="pg-sub">{sub}{extra}</div>
  </div>
</section>'''


def about_block(R=''):
    facts = ''.join('<div class="fact"><dt>%s</dt><dd>%s</dd></div>' % (bi(a, b), bi(c, d))
                    for a, b, c, d in C.ABOUT_FACTS)
    stats = ''.join(
        '<div class="stat"><b data-n="%d"%s>%d</b><span>%s</span></div>'
        % ((C.PROJECT_COUNT or N) if n is None else n, ' data-pre="%s"' % pre if pre else '',
           (C.PROJECT_COUNT or N) if n is None else n, bi(a, en))
        for n, pre, a, en in C.STATS)
    return f'''<section class="about" id="about">
  <div class="wrap about-g">
    <figure class="about-ph rv"><img src="{R}images/profile.jpg" alt="{e(C.NAME[1])}" width="900" height="1125" loading="lazy" decoding="async"><figcaption class="mono">{bi(*C.NAME)} <i>—</i> {bi(*C.CITY)}</figcaption></figure>
    <div class="about-c">
      <p class="kick"><i>(01)</i>{bi('مين أنا', 'Who I am')}</p>
      <p class="about-lead">{bi(*C.ABOUT_LEAD)}</p>
      <p class="about-body">{bi(*C.ABOUT_BODY)}</p>
      <dl class="facts">{facts}</dl>
    </div>
  </div>
  <div class="wrap stats">{stats}</div>
</section>'''


def service_cards(R=''):
    cards = []
    for i, (n, ar, en, ard, end, price, tar, ten, _icon) in enumerate(C.SERVICES):
        sp = C.SERVICE_PAGES[n]
        inc = ''.join('<li>%s</li>' % bi(a, b) for a, b in sp['inc'])
        cards.append(f'''<article class="sv sv-{i + 1}">
  <div class="sv-top"><span class="sv-n">{n}</span><span>{bi(ar, en)}</span><span class="ltr">{price}</span></div>
  <div class="sv-in">
    <div class="sv-a"><h2 class="sv-t">{bi(ar, en)}</h2><p class="sv-d">{bi(ard, end)}</p></div>
    <div class="sv-b">
      <p class="sv-price"><span class="ltr">{price}</span><small>{bi(tar, ten)}</small></p>
      <ul class="sv-inc">{inc}</ul>
      <div class="sv-cta"><a class="btn btn-k" href="{R}services/{sp['slug']}.html">{bi('التفاصيل', 'Details')}{ARROW}</a>
      <a class="btn btn-t" href="{R}contact.html?ask={sp['ask']}">{bi(*C.SVC_CTA)}</a></div>
    </div>
  </div>
</article>''')
    return '<div class="sv-stack">%s</div>' % ''.join(cards)


# ---------------------------------------------------------------- home
def home():
    win = ''.join(picture(cover(BY[s]), cls='on' if i == 0 else '', eager=i < 2, size='sm')
                  for i, s in enumerate(WINDOW))
    window = '<span class="hn-win" aria-hidden="true">%s</span>' % win
    trail = ''.join(picture(cover(BY[s], shape='any'), size='sm') for s in
                    ['kin', 'restaurant-digital-campaign', 'elva', 'strike', 'hi-my-little-teeth',
                     'food-and-beverage', 'nabae-alaser', 'hoops-ablaze', 'capital-football-academy',
                     'yalla-masyaf', 'iman-abdel-ghani', 'pizza-restaurant'])

    panels = []
    for i, (slug, idx) in enumerate(FEATURE):
        p = BY[slug]
        m = cover(p, idx)
        panels.append(f'''<a class="rl-p" href="work/{slug}.html" data-cur>
  <div class="rl-img">{picture(m, alt=p['en'], sizes='(min-width:861px) 70vw, 84vw')}</div>
  <div class="rl-cap"><span class="rl-n">{num(i + 1)}</span>
    <h3 class="rl-t">{bi(p['ar'], p['en'])}</h3>
    <p class="rl-m">{bi(*cat(p))}<i>·</i>{year(p)}</p>
    <p class="rl-l">{bi(p['arl'], p['enl'])}</p></div>
</a>''')
    panels.append(f'''<a class="rl-p rl-end" href="work.html" data-cur>
  <span class="rl-end-n">{N}</span>
  <span class="rl-end-t">{bi('شوف كل<br>المشاريع', 'See every<br>project')}</span>{ARROW}
</a>''')

    svl = ''.join(
        f'''<li><a class="svl-r" href="services/{C.SERVICE_PAGES[n]['slug']}.html">
  <span class="svl-n">{n}</span><span class="svl-t">{bi(ar, en)}</span>
  <span class="svl-s">{bi(*C.SERVICE_PAGES[n]['short'])}</span><span class="svl-p ltr">{price}</span>{ARROW}</a></li>'''
        for n, ar, en, ard, end, price, tar, ten, _ in C.SERVICES)

    cats_ar = [v[0] for v in C.CATS.values()]
    cats_en = [v[1] for v in C.CATS.values()]

    main = f'''
<section class="hero">
  <div class="hero-trail" aria-hidden="true">{trail}</div>
  <div class="wrap hero-top">
    <p class="mono">{bi(C.SEO_JOB_AR, C.SEO_JOB_EN)}</p>
    <p class="mono">{bi(C.CITY[0] + '، مصر', C.CITY[1] + ', Egypt')} <i>—</i> {bi('من ٢٠٢١', 'Since 2021')}</p>
    <p class="mono live"><i class="dot"></i>{bi(*C.HERO_BADGE)}</p>
  </div>
  <h1 class="hero-name"><span class="sr">{e(C.NAME[1])} — {e(C.SEO_JOB_EN)}</span>
    <span class="fit" data-fit data-vh-ar=".21" data-vh-en=".3" aria-hidden="true">
      <span class="ar"><span class="hn-l"><span>بيشوي</span></span><span class="hn-l"><span>{window}وفيق</span></span></span>
      <span class="en"><span class="hn-l"><span>Beshoy</span></span><span class="hn-l"><span>{window}Wafiek</span></span></span>
    </span>
  </h1>
  <div class="hero-pic hn-win" aria-hidden="true">{win}</div>
  <div class="wrap hero-foot">
    <p class="hero-line">{bi(*[re.sub('</?em>', '', x) for x in (' '.join(C.HERO_AR), ' '.join(C.HERO_EN))])}</p>
    <p class="hero-intro">{bi(*C.HERO_INTRO)}</p>
    <div class="hero-a">
      <a class="btn btn-o btn-xl" href="work.html">{bi(*C.HERO_CTA)}{ARROW}</a>
      <a class="btn btn-t" href="{C.WA}" target="_blank" rel="noopener">{WA_ICON}{bi('واتساب', 'WhatsApp')}</a>
    </div>
  </div>
</section>

{marquee(cats_ar, cats_en)}

<section class="mf" id="manifesto">
  <div class="wrap">
    <p class="kick"><i>(01)</i>{bi(*C.BAND_KICKER)}</p>
    <h2 class="mf-t">{words(*C.BAND_LINE)}</h2>
    <p class="mf-s">{bi(*C.ABOUT_BODY)}</p>
  </div>
</section>

<section class="reel" id="work">
  <div class="reel-st">
    <div class="wrap reel-hd">
      <div><p class="kick"><i>(02)</i>{bi(*C.WORK_HEAD)}</p>
      <h2 class="h2">{bi('شغل مختار', 'Selected work')}</h2></div>
      <div class="reel-pg"><span class="reel-c" id="reelC">01</span><span class="reel-bar"><i id="reelBar"></i></span><span>{len(FEATURE):02d}</span></div>
    </div>
    <div class="reel-tr" id="reelTr">{''.join(panels)}</div>
  </div>
</section>

<section class="svl">
  <div class="wrap">
    <div class="sh sh-row"><div><p class="kick"><i>(03)</i>{bi(*C.SERVICES_HEAD)}</p>
      <h2 class="h2">{bi('تلات حاجات.<br>بعملها كويس جداً.', 'Three things.<br>Done properly.')}</h2></div>
      <a class="btn btn-t" href="services.html">{bi(*C.SVC_ALL)}{ARROW}</a></div>
    <ol class="svl-l">{svl}</ol>
  </div>
</section>

<section class="abt">
  <div class="wrap abt-g">
    <figure class="abt-ph rv"><img src="images/profile.jpg" alt="{e(C.NAME[1])}" width="900" height="1125" loading="lazy" decoding="async"></figure>
    <div class="abt-c">
      <p class="kick"><i>(04)</i>{bi(*C.ABOUT_HEAD)}</p>
      <p class="about-lead">{bi(*C.ABOUT_LEAD)}</p>
      <a class="btn btn-o" href="about.html">{bi('اعرفني أكتر', 'More about me')}{ARROW}</a>
    </div>
  </div>
</section>

{cta_band(C.CONTACT_AR, C.CONTACT_EN)}
'''
    return page('pg-home', C.TITLE_HOME, seo(C.DESC_HOME), '', main, cur='home')


# ---------------------------------------------------------------- about
def about_page():
    main = (pg_hero('(—)', bi(*C.ABOUT_HEAD), bi('عني', 'About'),
                    '<p>%s</p>' % bi(C.SEO_JOB_AR + ' — ' + C.CITY[0], C.SEO_JOB_EN + ' — ' + C.CITY[1]))
            + about_block() + process('(02)') + cta_band(C.CONTACT_AR, C.CONTACT_EN))
    title = 'عني — %s | About — %s' % (C.NAME[0], C.NAME[1])
    return page('pg-about', title, '%s %s' % C.ABOUT_LEAD, 'about.html', main, cur='about')


# ---------------------------------------------------------------- archive
def archive_page():
    items = [BY[s] for s in ARCHIVE]
    rows, shots = [], []
    for i, p in enumerate(items):
        m = cover(p)
        rows.append(f'''<li><a class="arc-r" href="work/{p['slug']}.html" data-i="{i}" data-cur>
  <span class="arc-n">{num(i + 1)}</span>
  <span class="arc-th">{picture(cover(p, shape='any'), size='sm')}</span>
  <span class="arc-t">{bi(p['ar'], p['en'])}</span>
  <span class="arc-c">{bi(*cat(p))}</span>
  <span class="arc-y">{year(p)}</span>{ARROW}</a></li>''')
        shots.append(f'''<figure class="arc-s{' on' if i == 0 else ''}" data-i="{i}">
  <span class="arc-img">{picture(m, alt='', size='1400', sizes='40vw')}</span>
  <figcaption><b>{bi(p['ar'], p['en'])}</b><span>{bi(p['arl'], p['enl'])}</span>
  <i class="mono">{len(p['mods'])} {bi('قطعة', 'pieces')}</i></figcaption></figure>''')
    sub = '<p>%s</p>' % bi('عشرة مشاريع من الأرشيف، كل واحد ليه صفحة بالتفاصيل والقطع كاملة.',
                           'Ten projects from the archive, each with a page of its own and the full set of work.')
    extra = '<a class="btn btn-t" href="work.html">%s%s</a>' % (
        bi('كل المشاريع (%s)' % str(N).translate(AR_DIGITS), 'All %d projects' % N), ARROW)
    main = (pg_hero('(10)', bi('من الأرشيف', 'From the archive'), bi('الأرشيف', 'Archive'), sub, extra)
            + f'''<section class="arc"><div class="wrap arc-g">
  <ol class="arc-l" id="arcL">{''.join(rows)}</ol>
  <div class="arc-pv" aria-hidden="true">{''.join(shots)}</div>
</div></section>''' + cta_band(C.CASE_CTA_AR, C.CASE_CTA_EN))
    title = 'الأرشيف — %s | Archive — %s' % (C.NAME[0], C.NAME[1])
    return page('pg-archive', title, 'Ten projects from the archive of %s.' % C.NAME[1], 'archive.html', main, cur='archive')


# ---------------------------------------------------------------- services overview
def services_page():
    dv = ''.join('<li class="dv rv"><span class="dv-n">%02d</span><h3>%s</h3><p>%s</p></li>' % (i + 1, bi(a, b), bi(c, d))
                 for i, (a, b, c, d, _icon) in enumerate(C.DELIVER))
    main = (pg_hero('(03)', bi('اللي بعمله', 'What I do'), bi(*C.SERVICES_HEAD),
                    '<p>%s</p>' % bi(*C.SERVICES_NOTE))
            + f'''<section class="svc"><div class="wrap">{service_cards()}</div></section>
<section class="dlv"><div class="wrap">
  <div class="sh sh-row"><div><p class="kick"><i>(02)</i>{bi(*C.DELIVER_HEAD)}</p>
  <h2 class="h2">{bi(*C.DELIVER_NOTE)}</h2></div></div>
  <ol class="dv-l">{dv}</ol>
</div></section>'''
            + process('(03)') + faq('(04)') + cta_band(C.CASE_CTA_AR, C.CASE_CTA_EN))
    title = 'الخدمات — %s | Services — %s' % (C.NAME[0], C.NAME[1])
    return page('pg-services', title, '%s %s' % C.SERVICES_NOTE, 'services.html', main, cur='services')


# ---------------------------------------------------------------- contact
def contact_page():
    title = 'تواصل — %s | Contact — %s' % (C.NAME[0], C.NAME[1])
    return page('pg-contact', title, '%s %s' % C.FORM_TITLE, 'contact.html', contact(), cur='contact')


# ---------------------------------------------------------------- work index
def work_index():
    counts = {k: sum(1 for p in P if p['cat'] == k) for k in C.CATS}
    chips = ('<button type="button" class="chip on" data-f="all">%s<sup>%d</sup></button>' % (bi('الكل', 'All'), N) +
             ''.join('<button type="button" class="chip" data-f="%s">%s<sup>%d</sup></button>'
                     % (k, bi(*v), counts[k]) for k, v in C.CATS.items() if counts[k]))
    cards = []
    for i, p in enumerate(P):
        m = cover(p, shape='any')
        cards.append(f'''<li class="wk rv" data-cat="{p['cat']}"><a href="work/{p['slug']}.html" data-cur>
  <span class="wk-img" style="--ar:{max(.75, min(m['r'], 1.6)):.4f}">{picture(m, alt=p['en'], sizes='(min-width:1100px) 31vw, (min-width:700px) 46vw, 92vw')}</span>
  <span class="wk-cap"><span class="wk-n">{num(i + 1)}</span><span class="wk-t">{bi(p['ar'], p['en'])}</span><span class="wk-c">{bi(*cat(p))} · {year(p)}</span></span>
</a></li>''')
    main = f'''
{pg_hero('(%d)' % N, bi('مشروع منشور', 'Published projects'), bi('المشاريع', 'Projects'),
          '<p>%s</p>' % bi(*C.ALL_NOTE), '<div class="chips ix-f" role="group" aria-label="Filter">%s</div>' % chips)}
<section class="wk-s"><div class="wrap"><ol class="wk-g" id="wkG">{''.join(cards)}</ol></div></section>
{cta_band(C.CASE_CTA_AR, C.CASE_CTA_EN)}
'''
    return page('pg-work', C.TITLE_WORK, seo(C.DESC_WORK), 'work.html', main, cur='work')


# ---------------------------------------------------------------- case study
def family(m):
    if m['r'] >= 2.6:
        return 'strip'
    if m['r'] >= 1.15:
        return 'land'
    if m['r'] >= .95:
        return 'sq'
    return 'port'


def gallery(mods, name):
    """Rows by shape. Landscape alternates one big and a pair, squares and
    portraits run three across (two on a phone) — never wider than the
    source can fill."""
    out, i, beat = [], 0, 0
    while i < len(mods):
        f = family(mods[i])
        j = i
        while j < len(mods) and family(mods[j]) == f:
            j += 1
        run = mods[i:j]
        k = 0
        while k < len(run):
            if f == 'strip':
                n = 1
            elif f == 'land':
                n = 1 if (beat % 3 == 0 and run[k]['w'] >= 1400) else 2
                beat += 1
            else:
                n = 3
            grp = run[k:k + n]
            if len(run) - (k + n) == 1 and n > 1:
                grp = run[k:k + n + 1]            # never strand one
            cls = 'g%d' % min(len(grp), 4)
            out.append('<div class="gr %s %s">%s</div>' % (cls, f, ''.join(
                '<a class="gi rv" href="%s" data-hi="%s" data-cur style="--ar:%.4f">%s</a>'
                % (img(m, 'hi'), img(m, 'hi'), m['r'],
                   picture(m, alt='%s — %s' % (name, C.NAME[1]),
                           sizes='100vw' if len(grp) == 1 else '(min-width:861px) %dvw, 100vw' % (100 // len(grp))))
                for m in grp)))
            k += len(grp)
        i = j
    return ''.join(out)


def case(p, i, prev, nxt):
    m = cover(p)
    st = M.STORY.get(p['slug'], {})
    story = ''
    rows = []
    for key, ar_h, en_h in (('brief', 'التحدي', 'The challenge'),
                            ('approach', 'الاتجاه', 'The approach'),
                            ('shipped', 'التسليم', 'Delivered')):
        v = st.get(key)
        if v:
            rows.append('<div class="cs-r rv"><h2 class="cs-k"><i>%02d</i>%s</h2><p>%s</p></div>'
                        % (len(rows) + 1, bi(ar_h, en_h), bi(*v)))
    if rows:
        story = '<section class="cs-story"><div class="wrap">%s</div></section>' % ''.join(rows)
    nm = cover(nxt)
    pieces = len(p['mods'])
    main = f'''
<section class="cs-hero">
  <div class="wrap">
    <a class="back mono" href="../work.html">{BACK}{bi(*C.ALL_HEAD)}</a>
    <p class="kick"><i>{num(i + 1, N)}</i>{bi(*cat(p))}</p>
    <h1 class="cs-h"><span class="fit" data-fit data-max="220">{bi(p['ar'], p['en'])}</span></h1>
    <div class="cs-meta">
      <p class="cs-line">{bi(p['arl'], p['enl'])}</p>
      <dl>
        <div><dt>{bi('النوع', 'Discipline')}</dt><dd>{bi(*cat(p))}</dd></div>
        <div><dt>{bi('السنة', 'Year')}</dt><dd>{year(p)}</dd></div>
        <div><dt>{bi('القطع', 'Pieces')}</dt><dd>{pieces}</dd></div>
        <div><dt>{bi('على بيهانس', 'On Behance')}</dt><dd><a href="{p['be']}" target="_blank" rel="noopener">{bi('افتح', 'Open')} ↗</a></dd></div>
      </dl>
    </div>
  </div>
</section>
<figure class="cs-cover"><div class="cs-cover-in">{picture(m, alt=p['en'], eager=True)}</div></figure>
{story}
<section class="cs-gal"><div class="wrap-w">{gallery([x for x in p['mods'] if x is not m] or p['mods'], p['en'])}</div></section>
<nav class="cs-next" aria-label="Next project">
  <a class="nx" href="{nxt['slug']}.html" data-cur>
    <span class="nx-img">{picture(nm, size='sm')}</span>
    <span class="kick"><i>→</i>{bi('المشروع اللي بعده', 'Next project')}</span>
    <span class="nx-t">{bi(nxt['ar'], nxt['en'])}</span>
  </a>
  <a class="pv mono" href="{prev['slug']}.html">{bi('اللي قبله', 'Previous')}: {bi(prev['ar'], prev['en'])}</a>
</nav>
{cta_band(C.CASE_CTA_AR, C.CASE_CTA_EN, '../')}
<div class="lb" id="lb" hidden><button class="lb-x" type="button" aria-label="Close">×</button><button class="lb-p" type="button" aria-label="Previous">‹</button><img alt=""><button class="lb-n" type="button" aria-label="Next">›</button><span class="lb-c mono"></span></div>
'''
    title = '%s — %s | %s — %s' % (p['ar'], C.NAME[0], p['en'], C.NAME[1])
    return page('pg-case', title, '%s %s' % (p['arl'], p['enl']), 'work/%s.html' % p['slug'],
                main, R='../', og=img(m), cur='work')


# ---------------------------------------------------------------- service
def service(s):
    n, ar, en, ard, end, price, tar, ten, _ = s
    sp = C.SERVICE_PAGES[n]
    inc = ''.join('<li class="rv"><i>%02d</i>%s</li>' % (i + 1, bi(a, b)) for i, (a, b) in enumerate(sp['inc']))
    work = [p for p in P if p['cat'] == sp['cat']] or P[:6]
    strip = ''.join(f'''<a class="sw" href="../work/{p['slug']}.html" data-cur>{picture(cover(p), alt=p['en'], size='sm')}<span>{bi(p['ar'], p['en'])}</span></a>''' for p in work[:10])
    others = ''.join(
        f'''<a class="so" href="{C.SERVICE_PAGES[o[0]]['slug']}.html"><span class="mono">{o[0]}</span><span class="so-t">{bi(o[1], o[2])}</span><span class="ltr">{o[5]}</span>{ARROW}</a>'''
        for o in C.SERVICES if o[0] != n)
    main = f'''
<section class="sp-hero">
  <div class="wrap">
    <a class="back mono" href="../services.html">{BACK}{bi(*C.SVC_ALL)}</a>
    <p class="kick"><i>{n}</i>{bi('خدمة', 'Service')}</p>
    <h1 class="sp-h"><span class="fit" data-fit data-max="240">{bi(ar, en)}</span></h1>
    <div class="sp-g">
      <p class="sp-d">{bi(ard, end)}</p>
      <div class="sp-p"><span class="ltr">{price}</span><small>{bi(tar, ten)}</small></div>
      <div class="sp-a"><a class="btn btn-o btn-xl" href="../contact.html?ask={sp['ask']}">{bi(*C.SVC_CTA)}{ARROW}</a>
      <a class="btn btn-t" href="{C.WA}" target="_blank" rel="noopener">{WA_ICON}{bi('واتساب', 'WhatsApp')}</a></div>
    </div>
  </div>
</section>
<section class="sp-inc"><div class="wrap"><div class="sh"><p class="kick"><i>(01)</i>{bi(*C.SVC_INC_HEAD)}</p></div><ol>{inc}</ol></div></section>
{process()}
<section class="sp-work"><div class="wrap"><div class="sh"><p class="kick"><i>(03)</i>{bi(*C.SVC_WORK_HEAD)}</p></div></div>
  <div class="sw-tr">{strip}</div></section>
<section class="sp-oth"><div class="wrap"><p class="kick"><i>(04)</i>{bi('خدمات تانية', 'Other services')}</p>{others}</div></section>
{cta_band(C.CASE_CTA_AR, C.CASE_CTA_EN, '../')}
'''
    title = '%s — %s | %s — %s' % (ar, C.NAME[0], en, C.NAME[1])
    return page('pg-svc', title, '%s %s' % (ard, end), 'services/%s.html' % sp['slug'], main, R='../', cur='services')


# GitHub Pages answers ANY missing address with 404.html, at any depth
# (/beshoy-wafiek/work/old/link), so the page cannot know where the site's
# root is from its own location — relative paths break, and a fixed
# '/beshoywafiek/' breaks on any other repository or a custom domain.
# So the 404 page carries its stylesheet, script and logo inside itself,
# and its links find the root at runtime: the root is wherever index.html
# actually exists, '/<first segment>/' (a project site) or '/' (a user
# site or a custom domain).
ROOT_FINDER = """<script>(function(){var seg=location.pathname.split('/').filter(Boolean)[0],
root=(/\\.github\\.io$/i.test(location.hostname)&&seg)?'/'+seg+'/':'/';
function apply(r){root=r;document.querySelectorAll('[data-rel]').forEach(function(e){
e.setAttribute(e.tagName==='IMG'?'src':'href',r+e.getAttribute('data-rel'))})}
document.addEventListener('DOMContentLoaded',function(){apply(root);if(!seg)return;
fetch('/'+seg+'/index.html',{method:'HEAD',cache:'no-store'}).then(function(x){
var r=x.ok?'/'+seg+'/':'/';if(r!==root)apply(r)}).catch(function(){})})})()</script>"""


def data_uri(path, mime):
    import base64
    with open(path, 'rb') as f:
        return 'data:%s;base64,%s' % (mime, base64.b64encode(f.read()).decode())


def notfound():
    imgs = ''.join(picture(cover(BY[s]), size='sm') for s in WINDOW[:5])
    main = f'''
<section class="nf">
  <div class="wrap">
    <h1 class="nf-h"><span class="fit" data-fit>404</span></h1>
    <p class="nf-t">{bi(*C.NF_HEAD)}</p>
    <p class="nf-b">{bi(*C.NF_BODY)}</p>
    <div class="hero-a"><a class="btn btn-o btn-xl" href="work.html">{bi(*C.NF_WORK)}{ARROW}</a>
    <a class="btn btn-t" href="index.html">{bi(*C.NF_HOME)}</a></div>
  </div>
  <div class="nf-imgs" aria-hidden="true">{imgs}</div>
</section>'''
    h = page('pg-nf', '404 — ' + C.NAME[1], C.NF_BODY[1], '404.html', main)
    img_dir = os.path.join(ROOT, 'images')
    css = open(os.path.join(SRC, 'style.css'), encoding='utf-8').read()
    js = open(os.path.join(SRC, 'site.js'), encoding='utf-8').read()
    h = h.replace('<link rel="stylesheet" href="css/style.css">', '<style>\n' + css + '\n</style>')
    h = h.replace('<script src="js/site.js" defer></script>', '<script>\n' + js + '\n</script>')
    h = h.replace('href="images/favicon.png"', 'href="%s"' % data_uri(os.path.join(img_dir, 'favicon.png'), 'image/png'))
    h = h.replace('href="images/touch-icon.png"', 'href="%s"' % data_uri(os.path.join(img_dir, 'touch-icon.png'), 'image/png'))
    h = h.replace('src="images/logo.png"', 'src="%s"' % data_uri(os.path.join(img_dir, 'logo.png'), 'image/png'))
    # every remaining link inside the site waits for the root to be known
    h = re.sub(r'href="((?!https?:|mailto:|tel:|#|data:|/)[^"]+)"', r'href="/\1" data-rel="\1"', h)
    h = h.replace('</head>', ROOT_FINDER + '\n</head>', 1)
    assert 'css/style.css' not in h and 'js/site.js' not in h and 'images/' not in h.replace(SITE + 'images/', '')
    return h


# ---------------------------------------------------------------- write
def write(rel, text):
    path = os.path.join(OUT, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(text)


def main():
    if os.path.isdir(OUT):
        shutil.rmtree(OUT)
    os.makedirs(OUT)
    shutil.copytree(os.path.join(ROOT, 'images'), os.path.join(OUT, 'images'))
    os.makedirs(os.path.join(OUT, 'css'))
    os.makedirs(os.path.join(OUT, 'js'))
    shutil.copy(os.path.join(SRC, 'style.css'), os.path.join(OUT, 'css', 'style.css'))
    shutil.copy(os.path.join(SRC, 'site.js'), os.path.join(OUT, 'js', 'site.js'))
    write('index.html', home())
    write('work.html', work_index())
    write('about.html', about_page())
    write('archive.html', archive_page())
    write('services.html', services_page())
    write('contact.html', contact_page())
    for i, p in enumerate(P):
        write('work/%s.html' % p['slug'], case(p, i, P[i - 1], P[(i + 1) % N]))
    for s in C.SERVICES:
        write('services/%s.html' % C.SERVICE_PAGES[s[0]]['slug'], service(s))
    write('404.html', notfound())
    print('built _next/site: 6 main pages, %d case studies, %d service pages, 404' % (N, len(C.SERVICES)))


if __name__ == '__main__':
    main()
