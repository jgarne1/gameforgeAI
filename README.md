# Shadow Woods vertical slice v1.1

Patch focus:
- Fixes sprite-sheet frame slicing so the player no longer flashes/scrolls through two images at once.
- Uses the 12-row animation contract: idle/walk/fishing rows, 128x128 frame cells.
- Auto-detects whether the sheet is 768x1536 (6 columns) or 1024x1536 (8 columns) as long as each cell is 128x128.
- Adds animation-state reset when changing direction/action to prevent flicker.
- Adds `B` debug boundary overlay for walkable zones, blockers, and hotspots.
- Adds `R` reset/unstuck to return to a safe spawn.

Current controls:
- WASD / arrows: move
- Click/tap valid ground: move target
- E or Space near dock: begin fishing
- B: boundary debug overlay
- R: reset to safe spawn
- Esc: exit fishing / leave scene

Sprite contract:
- transparent PNG
- 128x128 cells
- 12 rows
- rows 1-4 idle down/up/left/right
- rows 5-8 walk down/up/left/right
- rows 9-12 fish idle/cast/reel/catch facing right
