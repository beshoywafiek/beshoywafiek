# -*- coding: utf-8 -*-
"""Download the project images the new site uses but does not have yet.

The site serves its project images from _next/media/work/<slug>/ (normal
size) and .../sm/ (thumbnails), copied from Behance once and verified, so it
never depends on Behance staying reachable. When a project is added to
js/projects.json, build.py stops and lists the missing images; run this, then
build again:

    python3 _next/fetch_images.py

It fetches only what the pages reference, follows Behance's redirects (some
thumbnails are served from mir-cdn.behance.net), keeps WebP files byte for
byte, and turns the occasional PNG rendition into lossless WebP, checking the
decoded pixels are identical. Needs Pillow (pip install pillow).
"""
import io
import os
import sys
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import build as B  # noqa: E402  (importing builds nothing; main() is not run)

from PIL import Image, ImageChops  # noqa: E402


def wanted():
    """Every local image path the pages reference."""
    B.home(); B.work_index(); B.about_page(); B.archive_page(); B.services_page()
    B.contact_page(); B.notfound()
    for i, p in enumerate(B.P):
        B.case(p, i, B.P[i - 1], B.P[(i + 1) % B.N])
    for s in B.C.SERVICES:
        B.service(s)
    return sorted(B.USED_MEDIA)


def source_url(rel):
    _, slug, *rest = rel.split('/')
    small = rest[0] == 'sm'
    stem = rest[-1][:-len('.webp')]
    m = next(m for p in B.P if p['slug'] == slug for m in p['mods'] if m['f'].rsplit('.', 1)[0] == stem)
    return B.CDN + ('max_632_webp' if small else m['v']) + '/' + m['f'], m


def fetch(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'}), timeout=60) as r:
        return r.read()


def main():
    missing = [r for r in wanted() if not os.path.exists(os.path.join(B.MEDIA, r))]
    if not missing:
        print('every project image is already local')
        return
    print('fetching %d image(s)' % len(missing))
    for rel in missing:
        url, m = source_url(rel)
        raw = fetch(url)
        if not raw:
            sys.exit('empty response for ' + url)
        dest = os.path.join(B.MEDIA, rel)
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        im = Image.open(io.BytesIO(raw)); im.load()
        if abs(im.size[0] / im.size[1] - m['r']) / m['r'] > .02:
            sys.exit('wrong shape for %s: %dx%d' % (url, im.size[0], im.size[1]))
        if raw[:4] == b'RIFF' and raw[8:12] == b'WEBP':
            open(dest, 'wb').write(raw)                       # as Behance serves it
        else:
            mode = 'RGBA' if im.mode in ('RGBA', 'LA', 'P') else 'RGB'
            px = im.convert(mode)
            px.save(dest, 'WEBP', lossless=True, quality=100, method=6, exact=True)
            if ImageChops.difference(Image.open(dest).convert(mode), px).getbbox() is not None:
                os.remove(dest)
                sys.exit('lossless conversion changed pixels: ' + url)
        print('  ok', rel)


if __name__ == '__main__':
    main()
