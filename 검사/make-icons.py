# 앱 아이콘 만들기: python 검사/make-icons.py
from PIL import Image, ImageDraw
import os
out = os.path.join(os.path.dirname(__file__), '..', 'icons')
def icon(size, mask=False):
    S = size * 4
    im = Image.new('RGBA', (S, S), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    blue, apricot, white = (31, 63, 174, 255), (240, 138, 93, 255), (255, 255, 255, 255)
    if mask: d.rectangle([0, 0, S, S], fill=blue); pad = int(S * 0.2)
    else: d.rounded_rectangle([0, 0, S - 1, S - 1], radius=int(S * 0.22), fill=blue); pad = int(S * 0.14)
    # 펼친 악보 한 장
    x0, y0, x1, y1 = pad, pad, S - pad, S - pad
    d.rounded_rectangle([x0, y0, x1, y1], radius=int(S * 0.04), fill=white)
    # 오선 다섯 줄 두 묶음
    lw = max(2, int(S * 0.012)); gap = (y1 - y0) * 0.055
    for top in (y0 + (y1 - y0) * 0.18, y0 + (y1 - y0) * 0.56):
        for k in range(5):
            y = top + k * gap; d.line([x0 + S * 0.05, y, x1 - S * 0.05, y], fill=(60, 70, 100, 255), width=lw)
    # 음표 하나 (살구색)
    r = gap * 1.05; cx, cy = x0 + (x1 - x0) * 0.42, y0 + (y1 - y0) * 0.56 + gap * 3
    d.ellipse([cx - r * 1.25, cy - r, cx + r * 1.25, cy + r], fill=apricot)
    d.rectangle([cx + r * 1.05, cy - gap * 6.5, cx + r * 1.05 + lw * 2.2, cy], fill=apricot)
    # 넘기는 귀퉁이
    c = int(S * 0.16); d.polygon([(x1 - c, y1), (x1, y1 - c), (x1, y1)], fill=blue)
    d.polygon([(x1 - c, y1), (x1, y1 - c), (x1 - c, y1 - c)], fill=(205, 214, 240, 255))
    return im.resize((size, size), Image.LANCZOS)
icon(192).save(os.path.join(out, 'icon-192.png'))
icon(512).save(os.path.join(out, 'icon-512.png'))
icon(512, True).save(os.path.join(out, 'icon-512-mask.png'))
print('ok')
