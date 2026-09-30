"""Draw local wheel backgrounds. Sector zero starts at twelve o'clock."""
from pathlib import Path
from PIL import Image, ImageDraw
import math

dest = Path(__file__).resolve().parents[1] / 'miniprogram/assets'
dest.mkdir(parents=True, exist_ok=True)
colors = ['#DCEBE5', '#FFF0DA', '#DBE9F0', '#EAE2F2', '#F5E2D7', '#E8EFD9', '#F6E8D5', '#E2E6F3']
for count in range(1, 9):
    image = Image.new('RGBA', (840, 840))
    draw = ImageDraw.Draw(image)
    bounds = (8, 8, 832, 832)
    for index in range(count):
        start = -90 + index * 360 / count
        draw.pieslice(bounds, start=start, end=start+360/count, fill=colors[index])
    if count > 1:
        for index in range(count):
            angle = math.radians(-90+index*360/count)
            draw.line((420, 420, 420+412*math.cos(angle), 420+412*math.sin(angle)), fill='#FFFFFF', width=4)
    draw.ellipse(bounds, outline='#FFFFFF', width=8)
    image.resize((420, 420), Image.Resampling.LANCZOS).save(dest/f'wheel-{count}.png', optimize=True)
print('Generated eight local wheel backgrounds.')
