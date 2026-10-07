"""Turns a board photo into the images the analysis sends: python -I -X utf8 prepare_images.py <photo.jpg>

Writes par_imgs/0.jpg (whole photo at the model's 2576 px maximum) and 1-4.jpg (2x2 crops of 58% per
side at full resolution), plus par_imgs/geometry.json, which maps crop pixels back onto the photo.
Mirrors what the app uploads, so results here predict results in the app.
"""
import json, os, sys
from PIL import Image, ImageOps

MAX_EDGE = 2576  # Opus 5.5's image limit; coordinates come back 1:1 in pixels up to this size
SHARE = 0.58

im = ImageOps.exif_transpose(Image.open(sys.argv[1]))
W, H = im.size
os.makedirs('par_imgs', exist_ok=True)
geo = {'photo': [W, H], 'images': []}
s = min(1.0, MAX_EDGE / max(W, H))
ov = im.resize((round(W * s), round(H * s)), Image.Resampling.LANCZOS)
ov.save('par_imgs/0.jpg', quality=90)
geo['images'].append({'file': '0.jpg', 'x0': 0, 'y0': 0, 'scale': s, 'size': list(ov.size)})
cw, ch = int(W * SHARE), int(H * SHARE)
for i, (x0, y0) in enumerate([(0, 0), (W - cw, 0), (0, H - ch), (W - cw, H - ch)], 1):
    c = im.crop((x0, y0, x0 + cw, y0 + ch))
    sc = min(1.0, MAX_EDGE / max(cw, ch))
    if sc < 1:
        c = c.resize((round(cw * sc), round(ch * sc)), Image.Resampling.LANCZOS)
    c.save(f'par_imgs/{i}.jpg', quality=90)
    geo['images'].append({'file': f'{i}.jpg', 'x0': x0, 'y0': y0, 'scale': sc, 'size': list(c.size)})
json.dump(geo, open('par_imgs/geometry.json', 'w'), indent=1)
print('photo', W, H, '->', [g['size'] for g in geo['images']])
