# -*- coding: utf-8 -*-
"""The icon set, drawn rather than sourced.

Stock icon packs come with attribution strings and licence terms that follow a
commercial site around, and they are drawn to somebody else's grid — put four
of them side by side and the stroke weights and corner radii disagree. These
are drawn to one spec so the set reads as a set:

  * 40x40 box, and every icon drawn to fill 45-52% of it. MEASURED: an
    earlier pass ranged 35% to 60%, which put a visibly bigger icon next
    to a visibly smaller one in the same row. Re-measure with iconbox.js
    after changing any path here.
  * 1.6 stroke, round caps and joins, no fills
  * one primary shape plus one accent, nothing that disappears at 34px
  * a zero-length path with a round cap renders as a dot, which is how the
    small dots here are drawn without needing a filled shape

Edit a path here and it changes everywhere that icon is used.
"""

# ----------------------------------------------------------------- services
# A pen path with its nodes: the universal mark of vector work, and it says
# "drawn on purpose" rather than "clip art".
# A pair of compasses mid-arc. The pen-path version was the honest signifier
# but it is a thin diagonal, and next to three icons with a solid rectangular
# silhouette it read as the weak one. This has the same mass as its neighbours.
LOGO = (
    '<path d="M20 4.6v3.8"/>'
    '<circle cx="20" cy="10.9" r="2.6"/>'
    '<path d="M18 12.9L6.8 33.2"/>'
    '<path d="M22 12.9L33.2 33.2"/>'
    '<path d="M8.9 27.4a13.3 13.3 0 0 1 22.2 0"/>'
    '<path d="M6.8 33.2l1.5-3"/><path d="M33.2 33.2l-1.5-3"/>'
)

# A kit: one card in front with a mark and its lines, more stacked behind it.
IDENTITY = (
    '<path d="M17 6h14a3 3 0 0 1 3 3v14"/>'
    '<path d="M12.5 11h17a2.6 2.6 0 0 1 2.6 2.6v3"/>'
    '<rect x="6" y="15" width="22" height="19" rx="3"/>'
    '<circle cx="12.8" cy="21.3" r="2.4"/>'
    '<path d="M18.6 21.3H23"/><path d="M11 28h11.5"/>'
)

# A post, and the thing people do to a good one.
SOCIAL = (
    '<rect x="5.4" y="6.4" width="19.2" height="19.2" rx="3.4"/>'
    '<path d="M5.4 20.4l4.8-3.9 3.4 2.7 3.1-2.4 7.9 6.4"/>'
    '<circle cx="12.2" cy="12.4" r="1.8"/>'
    '<path d="M29.4 33c-3.3-2.2-4.7-3.7-4.7-5.4a2.55 2.55 0 0 1 4.7-1.1 '
    '2.55 2.55 0 0 1 4.7 1.1c0 1.7-1.4 3.2-4.7 5.4z"/>'
)

# A layout, not just a browser frame: the sidebar and the rows are the design.
WEB = (
    '<rect x="4" y="7" width="32" height="26" rx="3.4"/>'
    '<path d="M4 14.5h32"/>'
    '<path d="M8.4 10.8h.01"/><path d="M12.2 10.8h.01"/>'
    '<rect x="8" y="18.6" width="7.4" height="9.8" rx="1.6"/>'
    '<path d="M19.6 19.4h12"/><path d="M19.6 23.5h12"/><path d="M19.6 27.6h7"/>'
)

# ------------------------------------------------------------- what you get
# The mark itself, and the fact that it leaves as files.
# Crop marks rather than a plain frame: that is what a design file looks like,
# and it keeps this from reading as "download an image".
D_LOGO = (
    '<path d="M6 12.5V8a2 2 0 0 1 2-2h4.5"/>'
    '<path d="M20.5 6H25a2 2 0 0 1 2 2v4.5"/>'
    '<path d="M27 20.5V25a2 2 0 0 1-2 2h-4.5"/>'
    '<path d="M12.5 27H8a2 2 0 0 1-2-2v-4.5"/>'
    '<circle cx="16.5" cy="16.5" r="5.4"/>'
    '<path d="M30.5 21.5v12"/><path d="M26.3 29.3l4.2 4.2 4.2-4.2"/>'
)

# Three inks, mixing where they meet.
D_PALETTE = (
    '<circle cx="14.9" cy="15.2" r="9.1"/>'
    '<circle cx="25.1" cy="15.2" r="9.1"/>'
    '<circle cx="20" cy="24.8" r="9.1"/>'
)

# Type with the lines it is actually set on.
# The letter sitting exactly on its cap line and baseline — the diagram a
# designer actually draws. Detached ticks just read as stray dashes.
D_TYPE = (
    '<path d="M5 7.6h30"/><path d="M5 31.6h30"/>'
    '<path d="M10.2 31.6L20 7.6l9.8 24"/>'
    '<path d="M14 23h12"/>'
)

# A spread, with the grid that holds it together.
D_GUIDE = (
    '<path d="M20 10.8C16.6 8 12.2 7.4 5.5 7.6v23C12.2 30.4 16.6 31 20 33.8"/>'
    '<path d="M20 10.8C23.4 8 27.8 7.4 34.5 7.6v23C27.8 30.4 23.4 31 20 33.8"/>'
    '<path d="M20 10.8v23"/>'
    '<path d="M10 14.8h5.6"/><path d="M10 19.8h5.6"/>'
    '<path d="M24.4 14.8H30"/><path d="M24.4 19.8H30"/>'
)
