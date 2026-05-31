# GameForge Asset Usage Manifest

This folder contains third-party/free sample packs uploaded for GameForge visual prototyping. These assets are used as **scaffolding** for the editable RPG scene engine. Custom GameForge landmarks should gradually replace the most important pieces while the generic environmental pieces can remain until final art is created.

## Source Packs Stored

### Mana Seed Seasonal Forest Samples
Stored under:

`public/assets/vendor/mana_seed/seasonal_forest/`

Included normalized files:
- `spring_tiles.png`, `summer_tiles.png`, `autumn_tiles.png`, `winter_tiles.png`
- seasonal water sparkles and waterfall sheets

Primary use:
- grass/terrain variants
- natural edges
- water/waterfall references
- seasonal terrain planning

### Pixel Lands Village Demo
Stored under:

`public/assets/vendor/pixel_lands_village/`

Included files:
- `ground_demo.png`
- `objects_demo.png`
- `premade_buildings_demo.png`
- `walls_roofs_doors_demo.png`

Primary use:
- temporary buildings
- town props
- modular wall/roof/door references
- early Whisperwind layout scaffolding

### Pixel Art Platformer - Village Props
Stored under:

`public/assets/vendor/village_props/`

Included files:
- `tx_tileset_ground.png`
- `tx_village_props.png`
- flame/chest/effect sheets

Primary use:
- town clutter
- barrels, crates, signs, lamps, fences, props
- extra ground/path tile options

### Mana Seed Farmer Sprite Free Sample
Stored under:

`public/assets/vendor/mana_seed_farmer/layers/`

Primary use:
- layered avatar reference system
- body, hair, shirt, pants, shoes, hat, etc.

## Generated GameForge Catalog

The actual editor-friendly crops live under:

`public/assets/worldkit/catalog/`

The brush editor reads:

`public/assets/worlds/world_asset_catalog.json`

That catalog contains named/cropped entries grouped by category. This prevents the editor from exposing raw sprite sheets directly and allows the user to paint with clear names and previews.

## Current Catalog Categories

- `curated_starter` — hand-picked starter set for quick painting
- `terrain_mana_spring`
- `terrain_mana_summer`
- `terrain_mana_autumn`
- `terrain_mana_winter`
- `terrain_pixel_lands`
- `terrain_village_props`
- `buildings_pixel_lands`
- `objects_pixel_lands`
- `modular_pixel_lands`
- `objects_village_props`
- `effects_references`
- `avatar_layers_reference`

## Design Guidance

Use asset packs for:
- grass
- water
- trees
- flowers
- generic props
- temporary houses

Replace with GameForge originals first:
- Echo Hall
- Forge Gate
- Chronicle/Town Board
- Starter Cottage
- Fountain Plaza
- Order/Guild landmarks

Do not go back to simple generated placeholder graphics for production scenes unless it is clearly marked as a debug object.
