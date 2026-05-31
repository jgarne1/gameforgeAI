# GameForge Asset Usage Manifest — Whisperwind Production Scaffold

This drop-in organizes the uploaded free/sample packs into stable GitHub paths so the RPG scene engine can use them as object atlases instead of one painted background.

## Vendor asset roots

### Mana Seed seasonal forest sample
Stored in:
`public/assets/vendor/mana_seed/seasonal_forest/`

Used for:
- grass tile base
- large trees
- flower clusters
- water supporting visuals

Files included:
- `spring_tiles.png`
- `spring_water_sparkles.png`
- `spring_waterfall.png`
- `README.txt`

### Pixel Lands Village Demo
Stored in:
`public/assets/vendor/pixel_lands_village/`

Used for:
- premade building atlas
- town board/sign props
- lamps/props
- future modular building assembly

Files included:
- `ground_demo.png`
- `objects_demo.png`
- `premade_buildings_demo.png`
- `walls_roofs_doors_demo.png`
- `INFO.txt`

### Pixel Art Platformer — Village Props
Stored in:
`public/assets/vendor/village_props/`

Used for:
- dock scaffold
- barrels/crates/props
- future ground props

Files included:
- `tx_village_props.png`
- `tx_tileset_ground.png`
- `tx_fx_torch_flame.png`
- `CHANGELOG.txt`

### Mana Seed Farmer Sprite Free Sample
Stored in:
`public/assets/vendor/mana_seed_farmer/`

Used for:
- layered avatar prototype
- body/shoes/pants/shirt/hair layers

Files included under `layers/`:
- `body_human.png`
- `shoes.png`
- `longpants.png`
- `shortshirt.png`
- `hair_dapper.png`
- `hair_bob.png`
- `cowboy_hat.png`

## Engine convention

Objects in `public/assets/worlds/whisperwind_village.json` can reference either full image files or atlas source rectangles:

```json
{
  "asset": "/assets/vendor/pixel_lands_village/premade_buildings_demo.png",
  "src": [16, 192, 292, 128],
  "x": 3300,
  "y": 1320,
  "w": 760,
  "h": 335
}
```

This keeps the map editable and lets us replace individual landmarks later without redrawing the entire town.

## Art direction note

These are scaffolding assets, not the final GameForge identity. Custom assets should replace the highest-identity pieces first:
1. Echo Hall
2. Forge Gate
3. Starter Cottage
4. Chronicle/Town Board
5. Fountain Plaza

Supporting assets like rocks, flowers, barrels, and fences can remain vendor-based longer.
