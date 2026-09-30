# Lantern Run visual revision

Both PNGs are original transparent HD pixel-art sprites. Keep the source images intact and edit their world placement through `scene.attractions.coaster` in `scripts/build_whisperwind_expanded.py`.

- `lantern_cart.png`: 1536×1024 RGBA. The car points right in source art. The renderer draws it at 160×108 world units and rotates it to the projected track tangent. Rider art is counter-rotated to stay upright.
- `grotto_side.png`: earlier one-mouth experiment, retained as source art. The active scene uses `fairground_v3/two_mouth_grotto.png` so both tunnel ends are visible.

The active ride follows one continuous, non-crossing sampled circuit. Incline-based segment weights slow the uphill section, accelerate descents, and brake near the station. After editing, regenerate both scene JSONs with `build_whisperwind_expanded.py` and `promote_whisperwind_layout.py`; test boarding, cave occlusion, and return at normal zoom.
