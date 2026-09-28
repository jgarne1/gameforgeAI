# Whisperwind HD asset workflow

The project owner approved the warm, detailed pixel-art town concept on 2026-09-28 and authorized replacing legacy art. This is the original GameForge pack, inspired by classic JRPG atmosphere, with no copied franchise locations or characters. The narrative DDS remains canon. Existing player accounts, pets, homes, and inventory are not art assets to delete.

## First delivered slice

Seven original PNG sources live in `public/assets/whisperwind_hd/v1/`: waterfront atlas, companion/idle atlas, walking atlas, water texture, tavern exterior, furniture atlas, and four ground materials. `manifest.json` declares actual dimensions, source rectangles, display sizes, placement origins, animation directions, and unfinished work. Assets are registered in `public/assets/worlds/world_asset_catalog.json` under stable `wwhd_` IDs.

Play `/games/world.html?scene=whisperwind_hd_waterfront`. Edit `/games/world_composer.html?scene=whisperwind_hd_waterfront`. Enter the tavern from the front door and return through its interior exit. These scenes are an art/movement proof, not an enabled campaign chapter or an ownership grant. The current district is intentionally smaller than the eventual connected town.

## Art rules

- Fixed elevated orthographic JRPG camera, no rotation. Warm stone, terracotta/burgundy roofs, dark wood, teal river, green foliage, amber windows. Light comes from upper left.
- Layout grid is 32 world units, with free placement for organic decoration. Player visual height is 80 world units. Buildings and props have explicit display sizes independent of PNG resolution.
- Use transparent individual sprites or atlases for reusable objects. Water is opaque. Do not flatten the full town into one background; collision, doorway, foliage, furnishings, and residents need independent objects.
- Preserve fine material detail but test at the actual gameplay scale. A full-resolution source screenshot alone is not quality evidence.
- Generated sheets do not reliably follow requested canvas dimensions or perfect grids. Inspect actual dimensions and alpha/frame bounds; never assume 1024px or copy sourceRect values from a different generation.
- The first walk cycle needs further frame cleanup. It must not be described as polished production animation. Directional idle sprites are separate from walk frames. Clothing/hair layers and existing pet followers remain later tasks.

## Editing assets safely

1. Read this guide, the manifest, the catalog entries, and the consuming scene before editing.
2. Use the approved town concept and current sprite as references. Generate one bounded asset or sheet with the same perspective, palette, light, proportions, and transparent margins. Preserve identity across directions and animation frames.
3. Save an immutable source PNG under a versioned path. Do not silently overwrite a sheet; existing source rectangles would become invalid.
4. Inspect the PNG's dimensions, true alpha, cell separation, stray pixels, edge clipping, repeated texture seams, and frame silhouettes. The first sheets contain slight edge fringes and are prototypes; cleanup is still required.
5. Define `sourceRect: {x,y,w,h}` in source pixels, `displaySize: {w,h}` in world units, and `placeOrigin: {x,y}` normalized to the selected rectangle. Placement uses the object's x/y anchor. Default origin is bottom-center. Ground tiles use center-center.
6. Add/update the same asset entry in the pack manifest and the shared catalog. Keep IDs stable across compatible art updates. New IDs use `wwhd_` snake case. Catalog tags include `whisperwind-hd` for editor search.
7. Place scene objects by asset ID. `x`,`y`,`w`,`h`,`scale`,`originX`,`originY`,`rotation` are respected by the shared atlas renderer. Scale affects draw size and object-local collision. Do not draw the entire atlas as a sprite.
8. Define collision around the physical footprint, not the roof/canopy rectangle. `collide:[dx,dy,w,h]` is local to the object's anchor before scale. Leave front-door approach space reachable. Ground and dock surfaces are not blockers.
9. Test stage thumbnails, selection bounds, scene save/reload, world display, moving behind objects, and door round trips. Run `node --test tests/whisperwind-assets.test.js` plus the recovery checks before updating the review branch.
10. Replace legacy art in bounded districts. Before removing a file, audit references across scene JSON, catalog, runtime strings, CSS/HTML, and documentation. Remove unused art only once the replacement scene works. The first pack does not yet replace every old district.

## Animation contracts

`games/js/whisperwind_assets.js` is the shared atlas renderer used by the world runtime and Composer. Runtime source rectangles also power thumbnails; no image extraction is needed.

The player manifest maps down/left/right/up to an idle asset ID and four walking source rectangles. Walking frames advance by actual distance traveled, not wall-clock time: 72 world units per cycle, at 144 units/second outdoors and 128 indoors (8 fps at normal outdoor pace). Motion settings are in `player.motion`. Stop immediately when input ends; do not add inertial gliding to this walking character. Place the small contact shadow at the feet. Walking source rectangles follow observed row gaps rather than an assumed equal grid; preserve complete soles. Frames are selected only while moving; idle returns to the facing direction. The prototype shares one base model with peers. This is not outfit customization, an authoritative multiplayer avatar service, or proof of 20-client performance.

Water uses the generated `water.png` with slow texture drift and bounded warm shimmer. It clips to scene water polygons. `waterMaterial` sets `src`, `tileSize`, and `speed`. Respect reduced-motion preference. Verify repeated edges in gameplay; generated textures may require a targeted seamless revision. Water collision stays in `terrain.water`, separate from rendering.

Trees marked `sway:true` move the top 70% very slightly; the lower trunk and collision remain stationary. Sway is visual, never a reason to move blockers. A future separately authored canopy/trunk asset can improve the join. Do not regenerate entire trees for every frame.

Doors use stable hotspot IDs, `type:door`, `targetScene`, and a named `targetSpawn`. Interior exits return to a safe named street spawn. New art must not overwrite story identities such as Mira/Toma/Kip or existing estate IDs.

## Next work and acceptance

Polish the walking cycle and paving joins; add terrain transitions, garden edges, lamps and independent shop/apartment/cottage modules. Expand connected districts for at least 20 players plus NPCs with generous streets, gathering areas, readable entrances and residential capacity. Add matching NPC variants and dialogue only with the DDS's foundation/gating requirements. Existing pet species and roster stay intact; following and pet walking sheets are later adapters.

Production acceptance requires full direction/frame review, believable terrain transitions, keyboard/pointer traversal, interior return/reload, mobile/touch review, and actual 20-client testing. None of those may be inferred from a generated concept or a source file count.

## Generation provenance

Artwork was made with the built-in image-generation tool, using the owner-approved Whisperwind concept as a style reference. Prompt recipes: isolated warm-stone/timber tavern with transparent background; 2×2 dock/quay/paving/tree atlas; 4×2 player/dog directional-idle atlas; 4×4 matching player walking atlas; opaque teal repeatable water texture; 2×2 bar/table/fireplace/rug atlas. All requests specify detailed crisp pixel clusters, fixed elevated JRPG view, consistent upper-left light, no scene backdrop, labels, text, or franchise copies. Actual image dimensions and selected rectangles are authoritative in the manifest, not the requested prompt dimensions.


Expanded town pack: see TOWN_BUILD_V2.md and TOWN_ASSET_PROMPTS.md for architecture, three NPC animation sheets, window animal overlays, street props, furnishings, and ownership-safe customization.
