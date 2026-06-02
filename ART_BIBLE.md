# World Forger Art Bible

## Hard Rules

Every production asset must follow these rules:

1. No labels or text inside the asset image.
2. No UI panels, frames, borders, or poster composition.
3. Use the locked 2.5D RPG art angle.
4. Use consistent lighting direction.
5. Keep scale compatible with a 64px-tall player.
6. Use transparent background for standalone objects and sprite sheets.
7. Use exact grid dimensions for tiles/sprites.
8. Keep object feet/doors/origins aligned to the same baseline rules.
9. Save alignment metadata in the Asset Manager.
10. Reject assets that look like a different game.

## Scale Rules

- Player height: 64px
- Door height: about 88–104px
- Small house: about 160–220px tall depending on roof
- Tavern/shop: larger footprint, readable entrance, warm windows
- Terrain tile: 128x128 for first kit
- Sprite sheet cells: explicit frame width/height saved in metadata

## Current Asset ID Families

- Txxx = Terrain
- Sxxx = Structures
- Bxxx = Buildings
- Hxxx = Housing
- Pxxx = Props
- Ixxx = Interiors
- Exxx = Effects
- Nxxx = NPCs

## First Real Sheet

`/assets/worldkit/whisperwind/terrain_foundation_01.png`

This is a real importable 1024x1024 PNG using 8 columns x 8 rows of 128x128 cells. It is a starter technical sheet to validate the workflow and the Asset Manager, not the final beauty-pass sheet.
