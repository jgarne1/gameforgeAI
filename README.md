# World Forger Polygon/Zones Restore

Drop these files into the repo root, preserving paths:

- `games/world_composer.html`
- `games/js/world_engine.js`

## Restored / upgraded editor behavior

- Restores first-class polygon tools for:
  - Walkable areas
  - Water areas
  - No-walk collision polygons
  - Fishing spots
  - General hotspots/interactives
- Polygon zones are selectable from the object list.
- Polygon vertices can be dragged directly on the canvas to reshape the area.
- Clicking inside a polygon lets you move the whole shape.
- Rectangular collision zones can be converted to polygons from the inspector.
- Water polygons can be marked as blocking walking and/or fishable.
- Fishing hotspots include fish table and water ID fields.
- Buildings still keep the object metadata from the previous upgrade: owner type, owner ID, interior scene, occupants, services, notes, and plot ID.

## Runtime upgrade

`world_engine.js` now respects:

- `scene.walkable` polygons: if any exist, the player must stay inside one.
- `scene.terrain.water` polygons: blocks walking unless `blocksWalking:false`.
- polygon `scene.collisions` entries.
- rectangular legacy `blockers` still work.

## Usage

Open World Forger Composer, then use the toolbar:

- **Walk**: adds a walkable polygon.
- **Water**: adds a water polygon.
- **Collision**: adds a no-walk polygon.
- **Fishing**: adds a fishing interaction hotspot.
- **+ Collision**: still adds a rectangular collision block for quick/simple blockers.

Drag gold vertex handles to reshape polygons.
