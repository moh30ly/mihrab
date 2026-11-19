"""Draws Mihrab's app icons (an arch on deep green) as PNGs. Run: python3 scripts/make-icons.py"""
from PIL import Image, ImageDraw
import os

GREEN = (20, 53, 43, 255)
GOLD = (230, 211, 163, 255)


def arch(size, scale=1.0, bg=True, pad_bottom=True):
    s = size * 4
    img = Image.new("RGBA", (s, s), GREEN if bg else (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    w = s * 0.44 * scale
    h = s * 0.56 * scale
    x0 = (s - w) / 2
    y1 = s * (0.5 + 0.28 * scale) if pad_bottom else s
    y0 = y1 - h
    stroke = max(4, int(s * 0.05 * scale))
    r = w / 2
    d.arc([x0, y0, x0 + w, y0 + w], 180, 360, fill=GOLD, width=stroke)
    d.line([x0 + stroke / 2, y0 + r, x0 + stroke / 2, y1], fill=GOLD, width=stroke)
    d.line([x0 + w - stroke / 2, y0 + r, x0 + w - stroke / 2, y1], fill=GOLD, width=stroke)
    d.line([x0, y1 - stroke / 2, x0 + w, y1 - stroke / 2], fill=GOLD, width=stroke)
    # a small lamp hanging in the arch
    cx, cy = s / 2, y0 + h * 0.55
    lr = w * 0.09
    d.ellipse([cx - lr, cy - lr, cx + lr, cy + lr], fill=GOLD)
    d.line([cx, y0 + stroke, cx, cy - lr], fill=GOLD, width=max(2, stroke // 3))
    return img.resize((size, size), Image.LANCZOS)


def save(img, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.save(path)


save(arch(32), "app/icon.png")
save(arch(180), "app/apple-icon.png")
save(arch(192), "public/icons/icon-192.png")
save(arch(512), "public/icons/icon-512.png")
save(arch(512, scale=0.7), "public/icons/maskable-512.png")
# Android sources for @capacitor/assets
save(arch(1024), "resources/icon-only.png")
save(arch(1024, scale=0.6, bg=False), "resources/icon-foreground.png")
save(Image.new("RGBA", (1024, 1024), GREEN), "resources/icon-background.png")
splash = Image.new("RGBA", (2732, 2732), GREEN)
mark = arch(800, bg=False)
splash.alpha_composite(mark, ((2732 - 800) // 2, (2732 - 800) // 2))
save(splash, "resources/splash.png")
save(splash, "resources/splash-dark.png")
