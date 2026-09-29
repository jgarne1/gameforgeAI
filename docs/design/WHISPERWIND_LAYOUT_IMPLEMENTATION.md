# Whisperwind concept-to-town implementation plan

Target: approved expanded concept v2. The first implementation now ships as the default waterfront scene, with a separate expanded preview. Blueprint: WHISPERWIND_LAYOUT_BLUEPRINT.json; final coordinates are in the scene, authored by scripts/build_whisperwind_expanded.py.

## Implemented layout pass

The 9,200 × 7,400 map preserves 24 player plot IDs and adds six NPC residences. A hierarchy of short, mostly straight streets connects district loops, the civic square, orchard playground, fishing quay, eastern neighborhoods, lake shore and mansion approach. Local lanes and garden shortcuts offer alternate routes without imposing a full grid. Three measured stone bridges cross the river. Two matching 100-unit wall/stair assemblies include landings and side collisions. Flowers, shrubs and bank plants complement the street network. Eight adult residents follow bounded routines and show brief nearby chatter. A timber house frame, tools, supplies and open work fences mark the builders' future address; it is unavailable for purchase.

The dog peeks from the upstairs window and both pets retreat behind their window clips. Home interiors retain visible exit markers and Return to Town. Tests verify every entrance/landmark route, bridge water restrictions, stair connections, NPC routines and eight owned-home interior exits. Existing saved admin layouts remain authoritative and are not erased by this release.

Still future work: actual construction progression, new shop/casino gameplay, lake fishing catches, children and jump-rope activities, public front/back interior passages, and genuine overlapping tunnel/upper walking surfaces. The terrace artwork communicates elevation; navigation remains one walking surface.

## Size and housing

Author a 9,200 × 7,400 world (about 2.7 times the existing 6,800 × 3,700 area). Leave generous gaps between districts and widen streets where doorway approaches, stairs and pedestrians meet. Preserve all 24 existing player plot IDs and their owners/listings/interiors/residence selection; at least eight must be enterable and tested before any release. Add six separately identified NPC homes with no player plotId and no sale action. Construction is a future address, initially unavailable; it must never silently reuse an owned plot.

## Connected districts

Lower fishing quay → market lane → Commonlight Square → Lantern Hill stairs → orchard/playground. Three crossings connect west and east bank streets. Eastbank apartments and south gardens form a second loop rather than dead-end spokes. The lake shore and mansion have public exterior trails. Playground has a wide gate from the public street, a separate orchard approach, and actual upper/lower stair landings. Construction fences leave the public route open. Tree trunks block, canopies overhang without sealing paths.

The blueprint gives district bounds, landmark approaches, 24 preserved player-home locations, six NPC locations, crossing endpoints and a public route spine. Coordinates are authoring targets and must be adjusted against measured asset footprints. It is not collision-verified scene JSON.

## Layers and navigation

1. Ground materials, terrace top surfaces and water render first. Water blocks movement except inside an explicit crossing deck polygon.
2. Bank stone/bridge back rail and deck render beneath actors. Decks have measured walkable widths, continuous land approaches, and solid side rails. A generic painted path over water is never a bridge permission.
3. Buildings, tree trunks, stairs and actors share foot-anchor depth sorting. Collision footprints use ground contact, not the whole visible roof/canopy rectangle. Structure lower faces block crossing through walls.
4. Foreground rail/arch cap pieces render over actors passing behind them. Canopies are separate overhead art. Split assets must align to a common origin; no arbitrary sprite cut lines.
5. Walls and stairs form authored assemblies: lower landing → stair corridor → upper landing → raised terrace. Retaining wall segments end at the stairs; rails block only corridor sides. The stair height matches the adjacent wall face. Avoid isolated stairs on a flat lawn.
6. A true overlap between an upper walking street and a lower tunnel requires distinct movement surfaces and explicit connectors. Position alone must not switch a player between levels. Until that is supported and verified, use a non-overlapping underpass or a public interior passage with front/back doors; do not claim a depth-sorted arch alone implements two walking levels.
7. Public inn/shop passage interiors may have front/back exits returning to different exact outdoor approaches. Provide an alternate exterior route. Critical access never depends on a private player-home interior.
8. Minimap peers, player movement, NPC routes and click pathfinding must use the same physical connectivity. NPCs do not teleport through walls or crowd doorway/stair bottlenecks.

## Immediate fixes and phased build

- Home return: visible floor exit marker and an always-available Return to Town action in interiors; return outside the correct home. Test sizes, furniture and direct interior loads.
- Dog/cat: upstairs dog placement and clipped retreat implemented; review animation during the next player walkthrough.
- First layout: district ground/water footprint, wide connected route loops and all ownership-preserving entrances. Preserve current scene as an archive; test a preview scene before switching the default.
- Crossing assemblies: integrate measured bridge/deck/abutment/rail art; verify each bridge approach and reject water shortcuts.
- Terraces: build matching walls, corners, stairs and landings as assemblies; add tunnels only after layering/navigation support is valid.
- Residents: retain Mira/Toma/Dockmaster story IDs; add workers, shopkeepers and household residents with bounded schedules. Short nearby speech bubbles do not appear in player chat. Reserve clear pause spots for pairs; respect reduced motion.
- Public building passages: front/back exits and exterior alternative paths.
- Construction and shop openings: represent future state explicitly; no fake active property sales, inventory or casino mechanics.
- Polish: benches face views or play areas, paths meet doors, roof colors vary, natural trail discoveries, play area gate access.

## Release gates

- Every one of 24 player-home approaches reachable from spawn; enter/return checks for at least eight across small/family/apartment/orchard room sizes.
- All NPC homes visibly distinct from player-owned homes, with no buy/list action.
- Reachable playground, construction-view spot, each shop, all bridge endpoints, lake pier and mansion approach.
- Both public passage exits return to the intended side; closed/private homes cannot block public routes.
- Solid banks/walls/rails/building trunks block; decks/stairs/landings pass; no stranded return spawns.
- Sustained NPC route checks and local multi-client presence/chat checks on the expanded scene.
- Browser inspection at normal and close zoom of stair-wall joins, foreground occlusion, door approaches and pet peeks.
- Saved editor overrides and home decoration survive the default-scene replacement. Do not overwrite persistent saved data without migration.

Current bridge revision: stone_bridge_integrated_v2 replaces the v1 separate apron/rail assembly. Complete bridge is one editor asset with built-in ramps. Use its measured floorPolygonLocal, centerlineLocal, railLinesLocal and thresholdAssembly offsets. Full footprint about2165 units; central depth207, toe162. North bridge center y3000 avoids home09. Both banks approach flat toes, and full artwork/canopy footprint remains clear. Flat thresholds add no collision or water permission; west uses flipX. Legacy packs stay available for existing saved scenes but must not be stacked with this bridge.

Bridge shore correction: stone_bridge_integrated_v3 supersedes v2 for default/preview scenes. V3 carries small warm cobbles in the last section of BOTH original ramps, eliminating the separate v2 threshold strips and vertical pasted seam. Preserve v2 catalog entries for saved scenes. Measured v3 floor/rail/toe coordinates come from its own metadata, not v2. Runtime scene now draws only one structures object per crossing and routes reach each flat toe.

Street revision: `planned_street` keeps useful straight runs and eases only actual corners. The hill and orchard loops, market high street, river walks, three bridge approaches and east garden ring create route choices. Door spurs stay narrow; primary streets are wider. Render verges beneath all paving before rendering the shared opaque paving pattern, so road junctions do not acquire internal shadow seams. Water crossings omit grass verges. Composer uses the same paving order. Continue to inspect road/shore, road/stair and road/door joins in the browser; saved Composer overrides remain authoritative and can intentionally differ from shipped JSON.
