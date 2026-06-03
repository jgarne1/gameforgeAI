# World Forger Composer v3 Drop-in

This pass focuses on making the World Forger tool usable for building Whisperwind by hand.

## Replace / add these files

```txt
games/world_composer.html
games/js/world_engine.js
public/assets/worlds/world_asset_catalog.json
public/assets/worlds/world_prefabs.json
public/assets/worlds/whisperwind_v2_hub.json
README_WORLD_FORGER_COMPOSER_V3.md
```

## Test Links

```txt
/games/world_composer.html
/games/world.html?scene=whisperwind_v2_hub
```

## Composer v3 Features

- Drag asset cards directly onto the map.
- Click placed objects to select them.
- Drag selected unlocked objects to move them.
- Lock/unlock objects with the inspector or `L` key.
- Delete selected objects with `Delete`.
- Duplicate selected objects with `Shift+D`.
- Edit object X, Y, Z/level, scale, layer, visibility, lock state, type, name, and tint.
- Turn any object into an interactive object.
- Interactive object types: message, sign, chest, pot, door, home, link.
- Sign/message objects support editable text.
- Chest/pot objects support item id/name and quantity.
- Door/home objects support target scene.
- Hotspots still work for doors, stairs, links, home claim zones, and messages.
- Existing admin save endpoint is used: `/api/admin/world-forger/save`.

## Important Direction

World Forger should not rely on giant filled road polygons. Use object composition, district stamps, path strokes, buildings, props, and interaction metadata.

The next design step is to use this tool to build a real hub:

- enterable tavern
- enterable player home
- stairs and upper/lower levels
- hidden alleys
- arcade hook
- pet center hook
- player housing row

## Notes

The game engine was updated so interactive placed objects work in-game, not only hotspot circles.
