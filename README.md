# Shadow Woods Sprite + Editor Fix

Changed files:
- `games/js/world_engine.js`
- `games/world_editor.html`
- `public/assets/sprites/wanderer_sheet.png`
- `public/assets/worlds/world_scenes.json`
- `public/assets/worlds/shadow_woods_dock.json`
- `README.md`

## What this fixes
- Uses the new wanderer sprite sheet as `public/assets/sprites/wanderer_sheet.png`.
- Normalizes sprite slicing to 128x128 cells, 6 columns x 12 rows.
- Reduces visible character scale so the player feels like they belong in the world.
- Keeps collision foot-point based so the sprite can be visually pretty without making movement too bulky.
- Includes the scene editor with scene selector, browser save/localStorage workflow, and JSON download/export.

## Runtime controls
- WASD / Arrow Keys: move
- Click/tap: move to point
- E or Space near dock: begin fishing
- B: boundary/debug overlay
- R: reset to safe spawn
- Esc: cancel fishing / leave

## Editor workflow
Open:
`/games/world_editor.html`

Use the scene selector to load Shadow Woods. Edit polygons, then use:
- Save Browser Copy: saves locally in your browser
- Export JSON / Download JSON: download the file

Replace this file in GitHub when ready:
`public/assets/worlds/shadow_woods_dock.json`

For now, GitHub/Render cannot be edited directly from the browser safely, so the editor exports a replacement JSON file.
