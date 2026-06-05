# World Forger Unified Editor All-Fix Drop-in

This drop-in fixes the World Forger issues called out after the v2/v3 hub work.

## Files included

```txt
server.js
games/world_composer.html
games/js/world_engine.js
README_WORLD_FORGER_UNIFIED_EDITOR_ALLFIX.md
```

## What changed

### Composer / Editor

- Adds a real server scene list: `/api/world-forger/scenes`.
- Loads any JSON scene from `public/assets/worlds` including legacy fishing scenes such as `shadow_woods_dock` and `shadow_woods_river_bend`.
- Adds accurate mouse-to-world coordinate mapping with pan/zoom.
- Adds true drag/drop from the asset panel onto the map.
- Click to select objects, hotspots, and boundaries.
- Drag selected objects/hotspots/boundaries to move them.
- Adds lock/unlock support. Locked objects remain selectable but cannot be moved.
- Adds right-side properties panel for X, Y, Z, scale, layer, visibility, tint/color, interaction settings, sign text, chest/pot contents, target scenes, and target spawn locations.
- Adds non-walkable/collision toggle and Auto Collision button for trees/buildings.
- Adds boundary rectangle tool for old-style blocker/boundary editing.
- Adds hotspot tool for signs, doors, homes, stairs, links, fishing, pet center, arcade, chests, and pots.
- Adds scene-level ground skin selection to start moving away from plain flat grass.
- Adds Save Local and Save Server. Server save sends the current GameForge username as admin identity.

### World Runtime

- Adds backpack button and `I` key inventory UI.
- Sorts inventory into tabs: All, Consumables, Materials, Fishing, Pets, Quest, Misc.
- Uses a grid layout so hundreds of items do not crowd the HUD.
- Improves player sprite rendering for 128x256 frame sheets, fixing the “flying/gliding/cropped” look from the prior 128x128 assumption.
- Adds collision checks for scene `collisions` and legacy `blockers`, in addition to object-level collision.
- Adds support for scene `groundSkin` and optional background image rendering.

## Test links

```txt
/games/world_composer.html
/games/world.html?scene=whisperwind_v2_hub
/games/world.html?scene=shadow_woods_dock
/games/world.html?scene=shadow_woods_river_bend
```

## Important notes

- The Composer is now the primary tool. Old editor pages should be treated as legacy unless they are redirected later.
- For trees/buildings, select the object and turn on `Non-walkable / Collision`, or press `Auto Collision`.
- For signs, set `Interactive`, choose interaction type `sign`, and enter text in `Sign Text / Message`.
- For chests/pots, set `Interactive`, choose `chest` or `pot`, then set item ID, quantity, and/or coins.
- For doors/homes, set `Interactive`, choose `door` or `home`, then set target scene and target spawn.
