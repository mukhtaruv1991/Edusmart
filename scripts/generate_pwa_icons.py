from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public"
OUT.mkdir(parents=True, exist_ok=True)

for size in (192, 512):
    image = Image.new("RGBA", (size, size), "#0f766e")
    draw = ImageDraw.Draw(image)
    radius = int(size * 0.25)
    draw.rounded_rectangle((0, 0, size - 1, size - 1), radius=radius, fill="#0f766e")

    cx = size // 2
    top = int(size * 0.22)
    left = int(size * 0.18)
    right = size - left
    middle = int(size * 0.46)
    bottom = int(size * 0.70)

    draw.polygon([(cx, top), (right, middle), (cx, int(size * 0.61)), (left, middle)], fill="#ffffff")
    draw.polygon(
        [(int(size * 0.30), int(size * 0.55)), (cx, int(size * 0.67)), (int(size * 0.70), int(size * 0.55)), (int(size * 0.70), bottom), (int(size * 0.30), bottom)],
        fill="#ccfbf1",
    )
    stroke = max(3, int(size * 0.028))
    draw.line((right, middle, right, int(size * 0.78)), fill="#ffffff", width=stroke)
    draw.ellipse((right - stroke * 2, int(size * 0.78), right + stroke * 2, int(size * 0.78) + stroke * 4), fill="#fbbf24")

    image.save(OUT / f"pwa-{size}x{size}.png", optimize=True)
