# World Forger Asset Audit Sprint v1

## Bottom line

The project already contains **682 image assets** in the inspected asset folders. The problem is not a lack of assets. The problem is that they are not organized, tagged, sliced, or surfaced in the editor in a way that helps build Whisperwind.

## Important correction

Do **not** make more AI-generated terrain sheets right now. The generated/procedural sheets were useful only to test the asset pipeline. They are not good enough as town-building art.

## Asset counts by group

- Terrain cutouts (Mana Seed seasonal forest): 547
- Characters / avatar layers: 35
- Worldkit core placeholder assets: 17
- Shop/NPC portraits and banners: 17
- Effects: 15
- Current generated Whisperwind assets: 12
- Mana Seed source sheets: 12
- Prefab previews/assets: 11
- Backgrounds / scenes: 7
- Village props sheets/effects: 5
- Pixel Lands Village sheets: 4


## What looks most promising

### 1. Mana Seed seasonal forest assets
Use these first for terrain, cliffs, water, waterfall, and forest material.

Key paths:

```txt
public/assets/vendor/mana_seed/seasonal_forest/spring_tiles.png
public/assets/vendor/mana_seed/seasonal_forest/spring_waterfall.png
public/assets/vendor/mana_seed/seasonal_forest/spring_water_sparkles.png
public/assets/worldkit/terrain/mana_spring/*.png
```

Problem: the extracted catalog pieces are mostly 16x16, so the editor should not make you browse them like large town objects. They need to be handled as tiles/stamps.

### 2. Pixel Lands Village assets
Use these first for village buildings, walls, roofs, doors, and basic house construction.

Key paths:

```txt
public/assets/vendor/pixel_lands_village/premade_buildings_demo.png
public/assets/vendor/pixel_lands_village/walls_roofs_doors_demo.png
public/assets/vendor/pixel_lands_village/objects_demo.png
public/assets/vendor/pixel_lands_village/ground_demo.png
```

These are much more relevant than the simple generated cottages.

### 3. Village Props
Use these for props, chests, flames, and detail dressing.

Key paths:

```txt
public/assets/vendor/village_props/tx_village_props.png
public/assets/vendor/village_props/tx_tileset_ground.png
public/assets/vendor/village_props/tx_fx_flame.png
public/assets/vendor/village_props/tx_chest_animation.png
```

### 4. Existing GameForge backgrounds/effects
These are useful as the visual quality target and for animated water/waterfalls.

Key paths:

```txt
public/assets/backgrounds/shadow_woods_fishing_scene.png
public/assets/backgrounds/shadow_woods_river_bend.png
public/assets/effects/waterfall_cascade_v3_sheet.png
public/assets/effects/river_current_v3_sheet.png
public/assets/effects/living_water_v3_sheet.png
```

## What to stop using as final art

The following are acceptable prototype markers, but not final Whisperwind assets:

```txt
public/assets/worldkit/cottage_blue.png
public/assets/worldkit/cottage_red.png
public/assets/worldkit/shop_general.png
public/assets/worldkit/whisperwind/*.png
```

They are too flat and simple compared with the approved concept direction.

## Recommended next build step

Build a **Tavern Street Prototype** from existing assets.

Do not build the full town yet.

Prototype contents:

```txt
1 tavern/building candidate
2 cottages
1 stone path segment/stamp
1 grass/foliage border
1 lamp/sign/fence group
1 crate/barrel detail group
1 water or dock edge if available
```

Success test:

```txt
Would Jeremy want to keep building with these assets?
```

If yes, expand into Market District and Docks. If no, the selected asset source/style is wrong.

## Editor implications

The editor needs to prioritize:

```txt
1. Contact-sheet browsing by asset source
2. Tagging/categorization
3. Slicing full sheets into named assets
4. Stamps/prefabs instead of individual tiny tiles
5. Usage preview: where an asset is used in a map
```

The editor should not force browsing hundreds of 16x16 terrain pieces one by one.

## Included contact sheets

See the `contact_sheets/` folder in this package.

Most useful first:

```txt
contact_sheets/mana_seed_sheets.jpg
contact_sheets/pixel_lands_village.jpg
contact_sheets/village_props.jpg
contact_sheets/worldkit_core.jpg
contact_sheets/whisperwind_generated.jpg
```
