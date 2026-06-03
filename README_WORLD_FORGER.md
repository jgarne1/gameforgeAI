# World Forger v2 Hub Drop-in

This drop-in is the first pass at turning Whisperwind from a backdrop/prototype into a layered, object-based hub.

## Test links

- `/games/world.html`
- `/games/world.html?scene=whisperwind_v2_hub`
- `/games/world.html?scene=whisperwind_tavern_interior`
- `/games/world.html?scene=riverbend_cottage_interior`
- `/games/world_composer.html`
- `/admin.html` → World Tools / Composer

## What changed

- Adds `whisperwind_v2_hub.json`, an object/layer/district based hub map.
- Adds a real enterable tavern interior.
- Adds a real enterable/claimable starter house interior.
- Adds stair hotspots that move the player between lower, middle, and upper districts.
- Adds a hidden alley, dock hook, arcade hook, and Pet Center hook.
- Replaces the old experience of a painted backdrop with collision polygons with structured world data.
- Replaces Composer with a more usable v3 tool: drag objects, lock objects, level assignment, hotspot creation, object list, inspector, layer visibility, local/server save.

## Important design decision

Do not build the town by drawing giant brown polygons. Use:

1. soft paths,
2. building objects,
3. props,
4. door/hotspot data,
5. district stamps.

The concept target is a place that reveals itself through stairs, alleys, interiors, docks, shops, homes, and hidden corners.

## First hub features

- Driftwood Tavern: enterable.
- Riverbend Cottage: enterable and claimable through existing estate API.
- Pet Center: links to PetWorld.
- Hidden Alley: discovery space behind the tavern/market area.
- Dockside: hook for fishing/travel.
- Arcade: future minigame hub hook.

## Composer v3 basics

- Select / Drag: click and drag objects.
- Lock: select object and press `L`, or use the inspector checkbox.
- Delete: select object/hotspot and press Delete.
- Duplicate: use inspector button or Shift+D.
- Active Level: Lower, Tavern Terrace, Upper. New placed objects inherit this level.
- Hotspot tool: click to add a new interaction circle, then edit type/target in inspector.
- Save Draft: local browser storage only.
- Admin Save: posts scene JSON to `/api/admin/world-forger/save`.

## Known limitations

- Visual quality still depends on the existing asset packs. This pass focuses on world structure and usable tools.
- Interiors are data-drawn starter rooms, not final art interiors.
- Stair movement is currently a teleport between positions, not a full physics elevation system.
- Pet Center and arcade are hooks; they do not yet have custom interiors.
