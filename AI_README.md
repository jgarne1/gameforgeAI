# GameForge AI project entry point

## Read this first

The canonical campaign and integration blueprint is:

**[GameForge — The World Remembers: Narrative, Progression & Website Integration DDS](docs/design/GAMEFORGE_NARRATIVE_PROGRESSION_WEBSITE_DDS.md)**

Read the [repository canon/integration audit](docs/design/REPOSITORY_CANON_AUDIT.md) alongside it. The DDS covers world lore, the complete campaign, town/NPC arcs, quests, website navigation/unlock cadence, shared state contracts, a progression matrix, and the prioritized implementation roadmap.

The website shell is the persistent game host. Games and world activities consume and update the same account, inventory, coins, pets, housing, and story state through validated server services.

## Decide what to build next

1. Read DDS sections 7–10 for website/state contracts and section 11 for rules/dependencies.
2. Verify the current source and implementation status; the DDS distinguishes observed infrastructure from planned campaign work.
3. Pick the earliest unvalidated progression row and build its missing prerequisite.
4. Complete story → shell → activity → validated shared-state update → return/reload as one bounded slice.
5. Record implementation evidence and update the living design when requirements change.

At DDS publication, the next priority is the shared identity/capability/reward foundation (P0), then Whisperwind's arrival/home/companion slice (P1). Adding unrelated minigames or future towns does not resolve that dependency.

Historical editor/drop-in READMEs remain technical references. Preserve useful IDs, assets and owned player data; development placeholder text may be rewritten during its scoped content implementation. This documentation does not itself enable Story Mode or ship campaign functionality.

## Whisperwind HD artwork and scene editing

The owner approved a new original HD pixel-art town direction. Read [the asset editing guide](docs/art/WHISPERWIND_HD_ASSET_WORKFLOW.md) before changing art, animation, placement, or collision. The first pack is at `public/assets/whisperwind_hd/v1/manifest.json`; asset IDs are added to the existing World Forger catalog. Keep the DDS as narrative authority.

Open `/games/world.html?scene=whisperwind_hd_waterfront` for the art/movement proof, and `/games/world_composer.html?scene=whisperwind_hd_waterfront` to edit it. The tavern door enters `whisperwind_hd_tavern`; its exit returns to the waterfront. These are unreleased art-preview scenes, not campaign progress or housing entitlements.

Use the shared atlas renderer `games/js/whisperwind_assets.js`. Source PNGs are immutable; `sourceRect`, `displaySize`, and `placeOrigin` in the manifest/catalog select and place pieces. Do not draw the entire atlas as one object or assume generated sheets are exactly 1024px. Inspect actual image dimensions and frame bounds.

The player has four directional idle sprites and a first four-frame-per-direction walk sequence. Frame polish and outfit layers remain pending. The dog is an art sample; existing account pets stay authoritative, with pet followers deferred. Water uses the original texture plus runtime currents/shimmer. Tree canopy sway is presentation only; trunk/collision remain fixed. Town expansion must reserve generous streets and gathering areas for at least 20 players plus NPCs; this first district does not validate 20 concurrent clients.

The owner allows replacing legacy artwork. Replace references in bounded districts, then remove assets only after a repository reference audit and a fallback check. Never interpret art replacement as permission to remove pets, inventories, homes, IDs, or campaign canon.

Player grounding: `player.motion` in the manifest sets speed, distance per walking cycle, and foot-contact shadow. Frames advance from actual movement distance; stopped/blocked players must not slide or keep stepping. Walking frame rows are measured from the source, not inferred from a perfect 4×4 grid. See the asset guide before changing them.

The sidebar's Neighborhood entry is now **Hometown**, defaulting all users to this Whisperwind. Read [town expansion, NPC life and future residence routing](docs/art/TOWN_EXPANSION_AND_NPC_LIFE.md). Use the server's `hometown` projection for launch destinations; a future verified home purchase/move can change the selected residence. Authored NPC routines, protected homes and modular assets are implemented; see the town build and landscape guides for current behavior.


## Expanded Hometown implementation (2026-09-28)

Read `docs/art/TOWN_BUILD_V2.md` before editing town housing or NPCs. Read `docs/art/TOWN_ASSET_PROMPTS.md` for the matching built-in imagegen source specifications. `whisperwind_hd_waterfront` is now the expanded town, with 24 new addresses, five enterable landmarks and a distinct home template. Existing plot IDs/data are preserved.

`lib/town_routes.js` protects new housing/shop/story/skin mutations with the login session; do not reintroduce browser username authority. `lib/town_housing.js` defines owner-only listing/unlisting/decorating and validated coin transfer. Owned homes are never purchasable without a current owner listing. `town_transaction.json` must be recovered before changing balances/estate state. `home__<plotId>` HTTP and socket joins must both honor privacy. Legacy release/claim cannot bypass these rules.

NPC skins are independent from identities and routes. World Composer links to the NPC Skins tool; persistent overrides live in DATA/town_npc_skins.json. Add four-direction source frames in npc_skins.json. TownMotion handles bounded routes and player pathfinding; TownLife handles resident presentation, introductions, housing controls and ambient animal overlays. Keep scenery pets distinct from the user's saved companion.

Home editor decorations accept only approved catalog IDs and constrained coordinates/scales/rotations. Exterior facade changes keep fixed door/collision positions; use local facade customization rather than replacing plot identities. New shop products are collectible tackle; equipment effects remain future work. The introduction story is not the full DDS C0 campaign. Twenty-player capacity remains unverified.

## Town landscape and roofs

Read [Town Character and Roofs](docs/art/TOWN_CHARACTER_AND_ROOFS.md) before editing the hillside layout, landscape sprites, guide destinations or home roof colors. Keep plot IDs and saved ownership stable.

The story-led town pass extends DDS section 4 with Whisperwind's history and named district purposes. See docs/art/TOWN_CHARACTER_AND_ROOFS.md for clean path joins, the event plaza, lake/mansion landmarks, new movable furnishings and persistent Composer overrides. Character prototype sources have explicit limitations; wardrobe functionality, lake fishing and playground gameplay remain planned.

### Town HUD and fountain editing
The World Forger HUD lives in `games/js/world_engine.js`. Keep navigation inside the initially collapsed `#wfTools` menu; the minimap is top left. Controls appear for five seconds after the first scene finishes loading and can be recalled from Controls / Help. Location names appear briefly at top center without a subtitle. Escape dismisses a modal/backpack or toggles the menu; Return to Home Page is the explicit exit.
The River Town Fountain ambient effect in `games/js/town_life.js` derives its basin position from the fountain object and catalog display size. Its sprite already includes falling streams: do not add unaligned duplicate streams. Animated ripple marks are clipped to the visible basin ellipse. When replacing the fountain art, remeasure that ellipse against the new source rectangle and visually verify the front rim stays dry.

### Town chat and player presence
`games/js/town_social_ui.js` renders a compact town chat and player list. It sends the existing websocket `chat` packet and renders message text with textContent. `server.js` routes that packet to scene peers when a socket has joined a world, otherwise it retains existing room chat. `lib/world_social.js` bounds ephemeral scene histories to 50 messages and assigns account colors; histories reset on server restart. Chat requires a current authenticated town session, derives author identity from its cookie, and throttles sends. A scene change replaces peers/history; disconnect clears stale dots. Scenes, including interiors, have separate chat channels. Minimap colors and list swatches use the same server-issued color. Test via `tests/world-social.integration.js` on isolated localhost only; tests create disposable local accounts.

### Right-facing building pack
Five intact originals and measured metadata live in `public/assets/whisperwind_hd/buildings_right_v1`, registered in `public/assets/worlds/world_asset_catalog.json` as right-facing editor choices. Read `BUILDINGS_RIGHT_GUIDE.md` before placing them. Their door/approach offsets differ from left-facing buildings; roof colors are baked and existing roof overlays are incompatible. Current owned homes have not been replaced. Move doorway hotspots, return spawns and collisions together when adopting a building, then verify routes and stepping/occlusion.

### Expanded town construction
Read `docs/design/WHISPERWIND_LAYOUT_IMPLEMENTATION.md` and the adjacent JSON blueprint before rebuilding the town. Preserve all 24 player plot identities; separate NPC-only homes. World water stays blocked except explicit `terrain.crossings[].points` deck polygons; crossing rails and bank blockers still apply. A `foreground` object layer renders over actors for split rail/arch assets. These pieces alone do not implement overlapping navigable elevations: distinct surfaces/connectors are required for true upper/lower walking overlap. Interiors now expose a Return to Town button and draw an EXIT marker at the authored hometown-return hotspot; use its targetSpawn, not a generic plaza teleport.

### Playground completion pack
The immutable originals and measured rectangles live in public/assets/whisperwind_hd/playground_completion_v1. Registered props are static scenery; no climbing, slide riding or swinging gameplay is implemented. Place entrance arms separately with 160 units of clear aisle. Ground patches use scene.groundPatches polygons plus material.src/tileSize and render in both runtime and Composer. Use small structural support collisions; never block the entire transparent cage or swing image. Keep child occlusion/climb masks as future work. Interior exit hotspots render a visible doorway and keep a Return to Town fallback button.
# Expanded town authoring — September 29

The default public/assets/worlds/whisperwind_hd_waterfront.json is layoutVersion 2, 9200×7400. Author with scripts/build_whisperwind_expanded.py, then scripts/promote_whisperwind_layout.py. Preview: whisperwind_hd_expanded.json. Legacy geometry is archived in docs/design/archive/whisperwind_waterfront_v1.json for existing fixture tests. Never delete persistent town_scenes overrides or ownership data to activate an update. Preserve all 24 plot IDs; NPC residences and construction scenery have no buyable plotId.

The north fairground and southwest wildlife garden are authored in `scripts/build_whisperwind_expanded.py` under `scene.attractions`, then rendered by `games/js/town_attractions.js` in both the world and Composer. The Lantern Run cart follows the sampled track on a shared wall-clock schedule: 8 seconds stopped for boarding, 23 seconds moving, then return to the same station. Players press E at the boarding marker during the stop and E again after the cart docks; walking input is suspended during the ride. Keep `station`, `board`, `exit`, `queue`, track, visual rails and collision blocks aligned when editing. The zoo signs are interactable; animal care and enclosure entry are not implemented. The fair reserves open space for later attractions. Artwork, dimensions, and source rectangles for the station and wildlife sheet are documented in `public/assets/whisperwind_hd/fairground_v1/README.md`.

New reusable catalogs: nature_details_v1, stone_bridge_v1, terrace_kit_v1, construction_kit_v1 under public/assets/whisperwind_hd. Keep immutable PNGs; use each pack's metadata sourceRect, displaySize and placeOrigin. Do not resample/crop originals or infer collision from the full transparent canvas. Construction foundation/frame/roof are alternative full stages, not layers to stack; no automatic progression exists.

Bridges use an explicit terrain.crossings floor polygon, thin separate rails and measured deck/front-rail origins. Structures draw under actors; foreground front rails share actor foot-depth sorting. stone_bridge_approaches_v1 supplies independently measured west/east shallow aprons: head anchors at floor-center x±235, shore toes offset -319.553/+56.479 and +378.679/+86.063 from their heads. Aprons draw before deck, replace immediate square landings, and block only side edges; never block the head/toe. Generic pavement grants no water access. Terrace walls have 100-unit visible height, 300-wide breaks, matching stair corridors and upper/lower landings. Stair screen run is not true 3D elevation. Terrace ramp is an editor alternative; inconsistent inner corner is excluded. Genuine underpasses require separate navigation surfaces before release.

The engine builds a per-scene spatial collision index; replace/reload the scene after structural edits so the index rebuilds. Ground/water tiling intersects the actual transformed canvas viewport while keeping world tile origins stable; offscreen sprites are culled. Do not restore whole-map texture loops. Player outdoor speed is 170, interior 144, cycle distance 64. Composer merges collisions and legacy blockers without losing walls, supports foreground and fits large maps down to .05 zoom. Dog is in Pet Center's upper window; pet rise/retreat is clipped and hidden between peeks. Nearby NPC chatter stays out of player chat.

Validation: node --test tests/expanded-town.test.js tests/town.test.js tests/recovery.test.js tests/whisperwind-assets.test.js tests/world-social.test.js tests/hometown.test.js (50 checks). Expanded suite covers routes, bridge/ramp limits, stair landings, roaming residents, eight owned homes including safe outdoor returns, pet clipping and immutable pack hashes. Rendering checks cover viewport tile counts and cached minimap at fractional display density. Lake catches, children/jump rope, construction progression and casino mechanics are future work.

### Player side walking
`public/assets/whisperwind_hd/player_side_walk_v3` supplies selected left/right poses in contact A, passing A, contact B, passing B order. Only the first two cells of each initial row are used; the repeated-contact cells are excluded. Manifest direction frames can specify their own src, sourceRect, displaySize and placeOrigin; the engine preloads these sources. Preserve immutable PNGs and metadata hashes. Use uniform scale, measured head landmarks and sole baseline y=0; do not stretch individual frames or normalize all crop heights. Small generated torso/arm differences remain, so review changes at normal gameplay speed. Up/down and idle retain existing artwork. NPC and outfit cycles need their own approved matching poses before adoption.

### Integrated bridges supersede separate approaches
The current town uses `stone_bridge_integrated_v3`: one complete bridge with both ramps and warm small-cobble shore transitions baked into the original. Place it as ONE structures object, centered on its measured deck origin. Do not add the old v1 deck, separate near rail, square landing, approach aprons, or v2 shore threshold. Read the pack README/metadata: the complete footprint is about 2162 units wide, central floor depth 206, toe depth 161. Its long ramps require clear bank space; north crossing moved to y3000 to avoid home09. Trees and shrubs stay outside the complete footprint plus canopy clearance.

Town streets use `planned_street` in `scripts/build_whisperwind_expanded.py`: connected district loops, shorter turns and narrow door spurs instead of a single winding spine or an all-over grid. Keep the hill/park, market/quay and east garden circuits connected to all three bridges. `drawPaths` in both the runtime and Composer lays subtle earth/grass verges first, then one world-aligned paving pass across junctions; do not put a verge across water crossings or draw per-road borders over intersections. Regenerate preview, verify all entrances/crossings, then promote to default. Existing admin-saved `DATA/town_scenes` layouts override shipped JSON and must be reviewed separately before altering them.

Author water permission from assembly.floorPolygonLocal and narrow side blockers from railLinesLocal, not transparent image bounds. Keep ramps, both shore routes, crossings and blockers together when moving an assembly in Composer. Baked near rim renders below actors; inset floor and rail collisions keep feet behind it. This does not create a lower walkable tunnel. V2 remains cataloged for saved scenes, but never stack its shore threshold over v3: the small cobbles are already part of v3's immutable PNG. Validation covers each full bank-to-bank centerline, solid ramp rails and immutable sources.
