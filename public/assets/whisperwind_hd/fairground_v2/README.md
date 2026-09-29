# Lantern Run visual revision

Both PNGs are original transparent HD pixel-art sprites. Keep the source images intact and edit their world placement through `scene.attractions.coaster` in `scripts/build_whisperwind_expanded.py`.

- `lantern_cart.png`: 1536×1024 RGBA. The car points right in source art. The renderer draws it at 160×108 world units and rotates it to the projected track tangent. Rider art is counter-rotated to stay upright.
- `grotto_side.png`: transparent wide mound with its opening on the right. The scene draws it at 650×340 world units, aligning the opening at `tunnel.x,tunnel.y`; the cart is hidden briefly inside the mouth. The image is a foreground overlay while the rails and cart use the same sampled route.

The loop is generated as 40 samples inserted into the east crest. Incline-based segment weights slow the uphill section, accelerate descents, and brake near the station. After editing, regenerate both scene JSONs with `build_whisperwind_expanded.py` and `promote_whisperwind_layout.py`; test boarding, cave occlusion, and return at normal zoom.
