World Forger Editor Overhaul v6

Drop these files into the repo root, preserving folders.

Files included:
- games/world_composer.html
- games/js/world_engine.js
- server.js

Main changes:
- Reorganized editor into clean left workspaces: Scene, Paint, Assets, Zones, World, Validation.
- Top bar now focuses on loading, saving, duplicating, deleting, playing, fit, and grid.
- Right panel remains context-sensitive for selected object/zone/building properties.
- Boundaries/zones are first-class tools with their own Zone workspace.
- Zone list shows what each boundary is for: Walkable, Blocked, Water, Fishing, Trigger, Teleport.
- Zone visibility checkboxes let you hide/show each zone type; Solo Fishing helps debug fishing setup.
- Polygon vertex dragging and whole-polygon movement are preserved.
- Scene size, day/night mode, fixed time, brightness, fog, tint, music, ground skin, and background path are saveable scene fields.
- Runtime world engine renders saved day/night lighting overlay and supports teleport hotspots.
- Fishing spots no longer silently require water unless their requiresWater flag is enabled. The editor links a fishing spot to a water polygon when placed inside one and validation reports fishing spots that are not on water.

Notes:
- The Layers checkboxes are now labeled as editor visibility only. They hide/show map categories while editing and do not delete anything.
- Fishing zones are hotspots with type=fishing. Water polygons are optional unless you enable Require Water in the fishing hotspot properties.
