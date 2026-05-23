# Shadow Woods Sprite Render Fix v1.2

Changed files:
- `games/js/world_engine.js`
- `public/assets/sprites/wanderer_sheet.png`

Fixes:
- Cleans the baked checkerboard out of the sprite sheet transparency.
- Keeps rendering locked to one 128x128 sprite frame.
- Prevents adjacent frame bleed/scrolling by using integer frame math.
- Slows animation FPS slightly so walking looks less frantic.
- Uses smoother velocity interpolation for walking.
- Renders the explorer a bit smaller so the scene scale feels better.

Controls remain:
- WASD / Arrow keys = move
- Click/tap = move to point
- E or Space near dock = fish
- B = boundary overlay
- R = reset to spawn
