# Hometown expansion and authored NPC life

Owner direction, 2026-09-28: grow the original Whisperwind art into a larger walkable hometown for at least 20 players plus NPCs. Residents should enact small recognizable moments of life, rather than wander randomly. This is the next art/content slice; routines and the full town are not implemented by this note. Narrative identities, quest order and server-authorized effects remain governed by the DDS.

## Assets and layout

Expand from the existing waterfront/tavern proof into connected market, companion-care, residential, garden and upper-cliff blocks. Build reusable shop/apartment/cottage facades, doors, windows, roofs, stairs, fences, lamps, benches, planters, stalls and indoor furniture. Add terrain transitions and garden edges before filling every space with props. Keep entrances independent from visual facades and private interior instances independent from street addresses.

Reserve streets roughly 120–200 world units wide around the 80-unit player scale, with broader squares and passing space near doors. These are layout targets to review in-game, not capacity evidence. Plan residential addresses and apartment units for at least 20 players while keeping starter-home entitlement independent of occupied public plots. Actual multiplayer testing is still required.

## NPC routines

Use small named activity zones and authored waypoints. Each resident alternates between walking, short waits, facing/idle, and a specific work/social pose. Examples: Mira tends the tavern and greets a visitor; a shopkeeper checks crates and returns to the counter; a courier stops at several doors; neighbors walk between a bench and their garden. Preserve Mira, Toma, Kip and Dockmaster identities; add DDS cast through explicit content placements.

- Give each route a bounded home zone, speed below player walking pace, valid walkable segments and fixed interaction positions. No unconstrained random roaming.
- Keep people away from water, walls and doorway approach points. NPCs should not physically trap players or block a crowded street.
- Pause and face the player during interaction; resume safely afterward. Main-quest NPCs must have reachable appointment/interaction variants, so players never wait for a real-time schedule.
- Keep visual routines separate from validated dialogue, quest events and rewards. A walking route must not grant progress or overwrite another player's story.
- Prepare four directional idle/walk sets and a few task poses per resident. Review foot contact and stride at gameplay scale before producing a large cast.
- Prefer a shared routine definition/seed for visible movement and personal dialogue variants. Do not build a second world engine or a new NPC economy.

First routine acceptance: a resident completes its bounded route without crossing blocked geometry, can be approached and paused, resumes correctly, stays reachable after reload, and remains harmless to a second player passing through.

## Hometown routing and future moves

The sidebar's Neighborhood entry is now Hometown. Its default is `whisperwind_hd_waterfront`. The duplicate town entry was removed; the PetWorld shortcut uses the same resolver.

`publicWorldContext` projects a `hometown` destination through `lib/hometown.js`. `public/js/hometown.js` consumes that projection in the shell and PetWorld. No residence selection defaults every new and existing user to Whisperwind without rewriting existing saves.

Future trusted purchase/move handlers may persist `profile.world.residence = {neighborhoodId, plotId}` after validating the transaction and ownership. Owning multiple houses alone must not silently choose a new hometown. The resolver verifies the selected plot still belongs to the user and that the neighborhood's `hometownSceneId` (or `sceneId`) is available. Missing/released/invalid residences fall back safely to Whisperwind. Purchasing and moving UI are still future work; there is no new client-writable residence endpoint in this slice.
