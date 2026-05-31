# World Editor + Animation Fix v3

## Files changed
- `games/world_editor.html`
- `games/js/world_engine.js`
- `public/assets/worlds/shadow_woods_dock.json`
- `public/assets/worlds/world_scenes.json`
- `README.md`

## What this fixes
- Idle animations now use the correct idle rows instead of walking rows.
- Right-facing walk now uses the correct walk_right row.
- Fishing hotspots are JSON-driven instead of hardcoded.
- The engine reads browser-saved scene drafts from localStorage for fast testing.

## Editor workflow
Open:

`/games/world_editor.html`

You can now:
- draw walkable polygons
- draw blocker polygons
- draw foreground/fade polygons
- add draggable fishing zones
- add draggable NPC/dialogue zones
- add draggable chest zones
- add draggable exit zones
- edit text/dialogue/title fields
- drag fishing stand point and cast target separately
- Save Browser Draft for quick testing
- Download JSON when ready to replace the GitHub file

## Fast test workflow
1. Open `/games/world_editor.html`.
2. Load `Shadow Woods Dock`.
3. Move/edit zones.
4. Click `Save Browser Draft`.
5. Refresh PetWorld and test the scene.

The game engine checks localStorage first:

`gfWorldSceneDraft:shadow_woods_dock`

So you can test without committing JSON every time.

## Commit workflow
When the map feels right:
1. Click `Download JSON`.
2. Replace:
   `public/assets/worlds/shadow_woods_dock.json`
3. Commit and deploy.

## Sprite sheet contract
The engine expects:
- 128 x 128 frame cells
- 6 columns x 12 rows
- canvas: 768 x 1536
- transparent PNG

Rows:
1. idle_down
2. idle_up
3. idle_left
4. idle_right
5. walk_down
6. walk_up
7. walk_left
8. walk_right
9. fish_idle_right
10. fish_cast_right
11. fish_reel_right
12. fish_catch_right

## GameForge RPG Scene Engine Direction

GameForge is moving toward a website + RPG-world hybrid. The website shell should remain responsible for login, sidebar navigation, account state, chat, admin tools, and iframe hosting. The shared RPG scene engine in `games/js/world_engine.js` should become the reusable walk-around layer for Shadow Woods, fishing scenes, neighborhoods, homes, shops, guild halls, and future Echo Game social spaces.

Current first-pass RPG scene features:

- Data-driven scene loading from `public/assets/worlds/world_scenes.json`.
- Walkable polygons, blockers, hotspots, exits, ambient effects, and scene transitions.
- Lightweight WebSocket multiplayer presence per scene using `worldJoin`, `worldMove`, `worldLeave`, and `worldEvent` messages in `server.js`.
- Remote players with name tags above their heads.
- Appearance payload support reserved for upcoming clothing/avatar customization.
- Estate test scene: `whisperwind_village`, launched by `games/estate.html`.

Design rules for future AI/code work:

1. Do not create separate one-off engines for fishing, housing, towns, shops, or guild halls unless there is a strong reason. Extend the shared RPG scene layer instead.
2. Neighborhoods should behave like RPG town scenes: plots, doors, signs, shops, and homes are scene data and interactables.
3. Housing should use real placement rules: floor grid, wall slots, tabletop anchors, and yard zones. Avoid arbitrary free placement that will become hard to validate.
4. Multiplayer visibility should be considered part of the MVP for shared neighborhood/town scenes.
5. Testing Mode and Story Mode are stored in `data/site_settings.json` through Admin → Site Settings. Testing Mode keeps features easy to test; Story Mode will later allow unlock/teaser rules without removing the feature from code.
6. Admin-only tools should stay permission-gated. The main UI should only show Admin navigation when the logged-in user is an admin.

### Estate / Neighborhood MVP Notes

`Whisperwind Village` is the first test neighborhood. It is intentionally small and uses the existing shared scene engine so movement, transitions, player presence, and future housing ownership can be tested early.

Future neighborhood plot states should include:

- `empty`
- `for_sale`
- `reserved`
- `owned`
- `public`
- `friends_only`
- `private`

A plot should visually change based on state, and the door/sign hotspot should determine whether the visiting player can enter, request access, purchase, or simply read that it is unavailable.

## Whisperwind Object-Built Town Direction

Whisperwind Village is now intended to be a large scrollable RPG town assembled from reusable objects, not one pre-rendered background image. This keeps housing, plots, NPCs, shops, docks, portals, seasonal changes, and editor tools expandable.

Core files:

- `games/estate.html` loads the Estate neighborhood shell.
- `games/js/rpg_scene_engine.js` is the lightweight shared RPG scene engine for the new object-built town approach.
- `public/assets/worlds/whisperwind_village.json` defines the scene size, paths, water, objects, plots, NPCs, decorations, and portals.
- `public/assets/worldkit/` contains reusable town objects such as houses, trees, signs, lamps, docks, and the town board.
- `data/estate_neighborhoods.json` stores neighborhood plot ownership/state.
- `/api/estate/neighborhoods/:id` returns neighborhood state.
- `/api/estate/neighborhoods/:id/claim` claims a test plot.

Design rules:

- Do not turn the town into a single giant painted background. Use placed objects and scene JSON.
- Important world items should be objects with depth, collision, and optional interaction.
- Keep prompts subtle: `[E] Talk`, `[E] Enter`, `[E] Claim`, `[E] Fish`.
- Use the WebSocket `worldJoin/worldMove/worldLeave` messages for multiplayer presence.
- Keep the scene editor-friendly: when adding a house, NPC, sign, portal, tree, or plot, define it in scene JSON first.
- The current art kit is a functional first pass. Future art should replace individual assets in `public/assets/worldkit/` without changing the engine.


## Whisperwind Visual Object Kit Pass

Whisperwind is now intended to be a large scrollable object-built town, not a single painted background. The scene should be edited through `public/assets/worlds/whisperwind_village.json` until the visual editor is expanded. Keep future villages built from reusable objects: buildings, paths, trees, fences, lamps, plots, docks, boards, NPCs, portals, and interactable hotspots. Avoid baking critical gameplay objects into one background image.

Visual target: cozy Final Fantasy VI/SNES town readability with modern painted/pixel clarity. The map should feel like a real place players can walk through, with depth sorting, collision, and subtle prompts only when near interactables.

## Whisperwind Production Scaffold Update

Whisperwind now uses organized vendor asset packs as atlas sources rather than a single painted background. See `public/assets/vendor/ASSET_USAGE_MANIFEST.md`.

## Whisperwind Asset Brush Editor

A new editor-first workflow is available at `/games/world_asset_editor.html` and from Admin → World Scene Tools → Open Asset Brush Editor.

Use this tool for RPG town visual tuning:

- curated asset catalog from uploaded packs
- selected-object thumbnail preview
- object paint brush
- scatter brush
- rectangle fill for grass/terrain
- select/drag/tune objects
- export scene JSON for GitHub

Catalog file: `public/assets/worlds/world_asset_catalog.json`.

Large terrain fills are saved as `tilePaints`, which the RPG scene engine renders before water, paths, objects, NPCs, and players.


## Asset Brush Catalog Pass

The world editor now uses a curated/cropped asset catalog instead of forcing designers to paint raw sprite-sheet chunks. The source art packs are stored under `public/assets/vendor/`, while editor-ready crops are stored under `public/assets/worldkit/catalog/` and indexed by `public/assets/worlds/world_asset_catalog.json`.

When improving Whisperwind, use the Asset Brush Editor first:

- Open `/games/world_asset_editor.html`.
- Choose a category such as Curated Starter, Mana Seed Terrain, Pixel Lands Buildings, or Village Props Objects.
- Use the visible thumbnail preview before painting.
- Use Fill Rectangle or Fill Whole Map for grass/terrain instead of placing tiles one by one.
- Use Scatter Brush for trees, flowers, rocks, and clutter.
- Select placed objects to tune position, size, collision, and depth.
- Download the scene JSON and replace the matching file under `public/assets/worlds/`.

The asset packs are scaffolding. GameForge-specific landmarks such as Echo Hall, Forge Gate, Starter Cottage, Chronicle Board, and Fountain Plaza should be custom assets over time.

## World Forger Editor Direction

The old asset-brush workflow has been replaced by **World Forger** at `/games/world_forger.html`.

World Forger is intentionally closer to an RPG mapping workflow than a raw asset browser:

- **Terrain mode** paints a grid-based terrain layer such as grass, path, water, dirt, and flowers.
- **Path/water edge treatment** is handled by the renderer so the user paints areas instead of manually choosing every edge/corner tile.
- **Object mode** places complete objects such as cottages, Echo Hall, shop, lamps, and signs.
- **Event mode** places interaction markers such as NPCs, portals, inspect spots, and fishing spots.
- **Collision mode** is only for manual corrections and should not be the primary way to build a scene.
- The palette is deliberately small and curated in `/assets/worlds/world_forger_palette.json` so the editor does not load hundreds of thumbnails at once.

The full uploaded asset packs remain stored under `/assets/vendor/`. Do not expose every raw asset at once in the editor; curate small palettes and add better finished objects as GameForge art direction matures.

World Forger can save scenes through `/api/admin/world-forger/save` for full admins, or export JSON for manual commit.
