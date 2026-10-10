# Stitch a page's viewport screenshots into one sheet for review.
import sys, glob
from PIL import Image
files, out, cols = sys.argv[1:-2], sys.argv[-2], int(sys.argv[-1])
ims = [Image.open(f) for f in files]
w, h = ims[0].size
s = 0.5
tw, th = int(w * s), int(h * s)
rows = (len(ims) + cols - 1) // cols
sheet = Image.new('RGB', (tw * cols + 8 * (cols - 1), th * rows + 8 * (rows - 1)), 'red')
for i, im in enumerate(ims):
    sheet.paste(im.resize((tw, th)), ((i % cols) * (tw + 8), (i // cols) * (th + 8)))
sheet.save(out, quality=72)
