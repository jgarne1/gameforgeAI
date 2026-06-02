# Whisperwind Vertical Slice Drop-in

## What this delivers

A first playable town district assembled from existing audited assets:

- The Driftwood Tavern
- cottages / market house
- harbor/dock fishing area
- lamps, benches, trees, props
- NPCs and interaction hotspots
- water area for fishing validation
- scene registry entry
- extracted/categorized assets for the Asset Manager
- starter prefabs/stamps

## Install

Copy these folders/files into the project root:

```txt
public/assets/worlds/whisperwind_tavern_district.png
public/assets/worlds/whisperwind_tavern_district.json
public/assets/worlds/world_scenes.json
public/assets/worldkit/whisperwind/vertical_slice/*.png
data/world_asset_catalog.json
data/world_prefabs.json
games/world.html
games/js/world_engine.js
README_WORLD_FORGER.md
WHISPERWIND_VERTICAL_SLICE_README.md
```

## View it

Open:

```txt
/games/world.html?scene=whisperwind_tavern_district
```

The updated `games/world.html` also defaults to this scene.

## Important

This is not the final full town. It is the first playable visual district so we can verify scale, asset style, collision, interactions, and editor direction before expanding.
