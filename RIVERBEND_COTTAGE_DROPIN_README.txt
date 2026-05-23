Riverbend Cottage Interior Drop-In

Copy these files into your project, preserving folders.

Adds:
- public/assets/backgrounds/riverbend_cottage_interior.png
- public/assets/worlds/riverbend_cottage_interior.json
- public/assets/worlds/shadow_woods_river_bend.json
- public/assets/worlds/world_scenes.json
- public/assets/effects/fireplace_flame_sheet.png
- public/assets/effects/warm_dust_motes_sheet.png

What it does:
- Adds Riverbend Cottage Interior as a selectable scene in the admin/editor scene list.
- Attaches the River Bend house/cottage exit to riverbend_cottage_interior.
- Adds a return exit from the cottage back to the River Bend spawn id from_house.
- Adds first-pass walkable/blocker areas.
- Adds fireplace flame, fireplace glow, door lantern glow, window light, and dust motes as separate objects/effects so the room can feel alive.

Preload rule:
- The scene JSON includes preloadScenes.
- The updated River Bend JSON includes riverbend_cottage_interior in preloadScenes.
- Your current smart preload engine should preload this scene when the player is in River Bend.
