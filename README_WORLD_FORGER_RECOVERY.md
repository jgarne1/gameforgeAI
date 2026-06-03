# World Forger Recovery Sprint

This drop-in consolidates the World Forger work after the tavern-district prototype.

## Current decision

The old approach of drawing large filled road/path polygons is rejected. It makes the town look like stacked rectangles and exposes the editor construction. Final Fantasy-style towns hide construction through tiles, objects, edges, clutter, terrain transitions, and landmarks.

## What changed

- `/games/world.html` now loads the recovery composer scene by default.
- `/games/js/world_engine.js` was replaced with a smaller, more reliable object/composer renderer.
- `/games/world_composer.html` is the new primary editor/tool.
- `/games/world_editor.html` and `/games/world_forger.html` redirect to the Composer.
- `/public/assets/worlds/whisperwind_composer_recovery.json` is the new test scene.
- `world_asset_catalog.json` and `world_prefabs.json` are consolidated and copied to both `data/` and `public/assets/worlds/` for server/editor compatibility.
- Admin World Tools now point to the Composer and Asset Manager.

## Design rules

- Do not use giant filled brown path polygons for final scenes.
- Build with soft paths, object placement, stamps, and curated districts.
- Existing vendor/extracted assets are the primary source for now.
- Weak generated placeholder assets are prototype-only.
- Houses/buildings may be usable, but the surrounding terrain must be rebuilt with better composition.

## Test links

- Game: `/games/world.html`
- Recovery scene: `/games/world.html?scene=whisperwind_composer_recovery`
- Composer: `/games/world_composer.html`
- Asset Manager: `/games/world_asset_manager.html`
- Admin: `/admin.html`

## Next work

1. Use Composer to arrange the recovery slice.
2. Create/adjust prefabs for Tavern Front, Market Nook, Cottage Lot, Harbor Dock.
3. Replace weak water/dock/terrain assets with stronger curated assets or extracted chunks.
4. Add interiors after the exterior composition is believable.
