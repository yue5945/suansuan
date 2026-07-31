# -*- coding: utf-8 -*-
"""绘制太极鱼图标 → android mipmap 各密度 PNG + 512px 预览"""
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
RES = ROOT / "android" / "app" / "src" / "main" / "res"

BG = (14, 13, 11, 255)          # 墨黑
LIGHT = (232, 226, 212, 255)    # 米白
DARK = (26, 23, 18, 255)        # 玄黑
GOLD = (201, 162, 39, 255)      # 金

DENSITIES = {
    "mipmap-mdpi": 48,
    "mipmap-hdpi": 72,
    "mipmap-xhdpi": 96,
    "mipmap-xxhdpi": 144,
    "mipmap-xxxhdpi": 192,
}


def draw_taiji(size):
    S = size * 8  # 超采样抗锯齿
    img = Image.new("RGBA", (S, S), BG)
    dr = ImageDraw.Draw(img)
    cx = cy = S // 2
    R = int(S * 0.40)

    # 金色外环
    dr.ellipse([cx - R - S * 0.012, cy - R - S * 0.012, cx + R + S * 0.012, cy + R + S * 0.012],
               outline=GOLD, width=max(2, int(S * 0.008)))
    # 米白整圆
    dr.ellipse([cx - R, cy - R, cx + R, cy + R], fill=LIGHT)
    # 黑色右半
    dr.pieslice([cx - R, cy - R, cx + R, cy + R], start=-90, end=90, fill=DARK)
    # 黑色上鱼头 / 米白下鱼头
    r2 = R // 2
    dr.ellipse([cx - r2, cy - R, cx + r2, cy], fill=DARK)
    dr.ellipse([cx - r2, cy, cx + r2, cy + R], fill=LIGHT)
    # 鱼眼
    r3 = R // 8
    dr.ellipse([cx - r3, cy - r2 - r3, cx + r3, cy - r2 + r3], fill=LIGHT)
    dr.ellipse([cx - r3, cy + r2 - r3, cx + r3, cy + r2 + r3], fill=DARK)

    return img.resize((size, size), Image.LANCZOS)


for folder, px in DENSITIES.items():
    out_dir = RES / folder
    out_dir.mkdir(parents=True, exist_ok=True)
    draw_taiji(px).save(out_dir / "ic_launcher.png")
    print(f"OK {folder}/ic_launcher.png ({px}px)")

draw_taiji(512).save(ROOT / "icon-preview.png")
print("OK icon-preview.png (512px)")
