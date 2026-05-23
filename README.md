# World Editor + Animation Fix v3

## Files changed
- `games/world_editor.html`
- `games/js/world_engine.js`
- `public/assets/worlds/shadow_woods_dock.json`
- `public/assets/worlds/world_scenes.json`
- `README.md`

## What this fixes
- Idle animations now use the correct idle rows instead of walking rows.
- Right-facing walk now uses the correct walk_right row.
- Fishing hotspots are JSON-driven instead of hardcoded.
- The engine reads browser-saved scene drafts from localStorage for fast testing.

## Editor workflow
Open:

`/games/world_editor.html`

You can now:
- draw walkable polygons
- draw blocker polygons
- draw foreground/fade polygons
- add draggable fishing zones
- add draggable NPC/dialogue zones
- add draggable chest zones
- add draggable exit zones
- edit text/dialogue/title fields
- drag fishing stand point and cast target separately
- Save Browser Draft for quick testing
- Download JSON when ready to replace the GitHub file

## Fast test workflow
1. Open `/games/world_editor.html`.
2. Load `Shadow Woods Dock`.
3. Move/edit zones.
4. Click `Save Browser Draft`.
5. Refresh PetWorld and test the scene.

The game engine checks localStorage first:

`gfWorldSceneDraft:shadow_woods_dock`

So you can test without committing JSON every time.

## Commit workflow
When the map feels right:
1. Click `Download JSON`.
2. Replace:
   `public/assets/worlds/shadow_woods_dock.json`
3. Commit and deploy.

## Sprite sheet contract
The engine expects:
- 128 x 128 frame cells
- 6 columns x 12 rows
- canvas: 768 x 1536
- transparent PNG

Rows:
1. idle_down
2. idle_up
3. idle_left
4. idle_right
5. walk_down
6. walk_up
7. walk_left
8. walk_right
9. fish_idle_right
10. fish_cast_right
11. fish_reel_right
12. fish_catch_right
