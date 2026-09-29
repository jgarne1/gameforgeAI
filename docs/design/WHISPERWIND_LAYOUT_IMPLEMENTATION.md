# Whisperwind concept-to-town implementation plan

Target: approved expanded concept v2. Blueprint: WHISPERWIND_LAYOUT_BLUEPRINT.json. This is the construction plan, not a completed live-town replacement.

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
- Dog/cat: verify asset window coordinates, mask retreat behind frame, keep door opening independent. This bug remains open.
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
