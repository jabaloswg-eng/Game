from PIL import Image
import numpy as np
from scipy import ndimage

img = np.array(Image.open("goblin-user.jpg").convert("RGB")).astype(np.int16)
corners = np.concatenate([
    img[:40, :40].reshape(-1, 3), img[:40, -40:].reshape(-1, 3),
    img[-40:, :40].reshape(-1, 3), img[-40:, -40:].reshape(-1, 3),
])
bg = np.median(corners, axis=0)
fg = np.abs(img - bg).sum(axis=2) > 55

# the floor glow is near-white and colorless; the skull mask is warm beige
brightness = img.min(axis=2)
sat = img.max(axis=2) - img.min(axis=2)
glow = (brightness > 195) & (sat < 30)
fg &= ~glow

labels, n = ndimage.label(fg)
sizes = ndimage.sum(fg, labels, range(1, n + 1))
mask = labels == (1 + int(np.argmax(sizes)))
mask = ndimage.binary_closing(mask, iterations=3)
mask = ndimage.binary_fill_holes(mask)

ys, xs = np.where(mask)
y0, y1, x0, x1 = ys.min(), ys.max(), xs.min(), xs.max()
print("bbox:", x0, y0, x1, y1)

crop = img[y0:y1 + 1, x0:x1 + 1].astype(np.uint8)
crop_mask = mask[y0:y1 + 1, x0:x1 + 1]
comp = np.where(crop_mask[..., None], crop, np.full_like(crop, 127))
ch, cw, _ = comp.shape
side = int(max(ch, cw) / 0.85)
canvas = np.full((side, side, 3), 127, dtype=np.uint8)
oy, ox = (side - ch) // 2, (side - cw) // 2
canvas[oy:oy + ch, ox:ox + cw] = comp
Image.fromarray(canvas).resize((512, 512), Image.LANCZOS).save("goblin-prepped.png")
print("saved")
