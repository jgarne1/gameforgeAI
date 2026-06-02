# World Forger Direction — Approved

Whisperwind is the reference town, but the goal is to build the **World Forger Kit** first so future towns can reuse the same engine, asset rules, editor tools, and prefab/stamp system.

## Current Direction

Do **not** generate random concept town art as game assets. Asset work must produce real importable files:

- PNG or WebP assets
- transparent background where appropriate
- fixed grid where appropriate
- no labels
- no UI
- no poster layouts
- no decorative borders
- no mixed camera angles

## Camera / Art Angle

The art angle is locked. The gameplay camera is not.

Approved:

- fixed 2.5D RPG art perspective
- about 35° downward view
- zoom in/out allowed
- panning allowed
- cinematic landmark fly-to allowed

Rejected for now:

- camera rotation
- multiple perspectives for the same asset
- true 3D town asset requirements

## Visual Style

Whisperwind style language:

- painterly fantasy RPG
- Final Fantasy VI town feeling
- Octopath / Sea of Stars warmth and density
- blue roofs
- warm gold windows
- gray stone
- emerald foliage
- turquoise water
- purple flowers
- coastal cliffs and waterfalls

## Asset Production Order

1. Terrain Foundation
2. Structures
3. Buildings
4. Props
5. Interiors
6. Lighting / Effects
7. NPCs / Characters

## Editor Philosophy

The editor should become prefab/stamp based.

Users should place:

- Market Corner
- Residential Block
- Dock Segment
- Garden Corner
- Tavern Entrance
- Bridge Crossing

not individual rocks and flowers one at a time.

## New Tool in This Drop-In

This package adds:

- `games/world_asset_manager.html`
- server routes under `/api/admin/world-assets/*`
- `data/world_asset_alignment.json`
- `data/world_asset_catalog.json`
- starter real asset sheet: `/assets/worldkit/whisperwind/terrain_foundation_01.png`

The Asset Manager is used to inspect real assets and sprites, test animation frame alignment, drag offsets, tune scale/origin/hitbox, preview movement, and save metadata.


## 2026-06-02 Fix: Asset Manager Storage Rules

The Asset Alignment Lab stores files in these exact locations:

- Approved asset catalog: `data/world_asset_catalog.json`
- Alignment/tuning metadata: `data/world_asset_alignment.json`
- Real imported world assets: `public/assets/worldkit/whisperwind/`

Do not store generated concept/poster images in the approved catalog. Only add importable sheets that are grid-aligned, game-readable, and intentionally mapped by asset ID.

Server storage note: this project uses `DATA`, not `DATA_DIR`. Any World Forger JSON runtime file should be joined from `DATA` so Render persistent disk behavior matches the rest of GameForge AI.

Current approved starter sheet:

- `WF_TERRAIN_01`
- File: `public/assets/worldkit/whisperwind/terrain_foundation_01.png`
- Catalog: `data/world_asset_catalog.json`
- Alignment metadata: `data/world_asset_alignment.json`

Rejected/candidate art rule: a generated sheet with a visible background, non-exact cell layout, labels, poster framing, or inconsistent tile sizes is not production-ready. Keep it as reference only.
