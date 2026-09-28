# GameForge repository canon and integration audit

Audited 2026-09-28 against main commit `7d0a2fc350cc971410e488a37b69247068a4d726`. This is a source audit, not a claim that the application was run or its asset images visually approved. The full recursive repository tree was inspected; selected implementation/content files below were read. No repository AGENTS.md was found in that tree.

Canonical design: [GameForge Narrative, Progression & Website Integration DDS](GAMEFORGE_NARRATIVE_PROGRESSION_WEBSITE_DDS.md).

## Evidence and preservation decisions

| Source | Observed baseline | DDS treatment |
|---|---|---|
| [public/index.html](../../public/index.html) | Sidebar Home, Shadow Woods, Pet Sanctuary, Pet Battles, Game Tables, Battle Hall, Neighborhood, My House, Marketplace, Inventory, Social, Admin; multiple home/profile action buttons; iframe context delivery | Preserve hooks. Apply one capability policy to every launch surface. Add Chronicle, regional Explore, Council and later board as proposed surfaces |
| [server.js](../../server.js), publicWorldContext | Same account/pet data projected as display name, money→coins, inventory, active pet, roster, estate homes, world flags/chests | Extend this shared authority; do not create independent economies |
| [WORLD_FORGER_PLAYER_CONTEXT_README.md](../../WORLD_FORGER_PLAYER_CONTEXT_README.md) | GET world/context, POST world/open-chest, GAME_CONTEXT/localStorage identity lookup, estate link examples | Useful integration intent; username/localStorage is not proof of authentication; keep old fields compatible |
| [server.js](../../server.js), world chest handler | Reads scene/object reward definitions; stores per-user sceneId:objectId chest marker; saves profile | Preserve IDs/markers. Add eligibility, durable receipts, concurrency and atomicity during implementation |
| [server.js](../../server.js), estate claim handler | Accepts body username, checks plot availability and one plot per neighborhood, writes shared estate file | Rebind actor to authenticated identity; guarantee starter home independently of exclusive public plot |
| [data/site_settings.json](../../data/site_settings.json) | mode testing; note says unlock layer is being built | Do not turn production Story Mode on in docs task. Define fixture isolation and migration |
| [games/launcher.html](../../games/launcher.html) | Game-host access from cartridges/master item and catalog fields; guests can play without cartridge; unlocked/locked cards | Preserve host/guest distinction; add centralized eligibility and validated adapters |
| [games.json](../../games.json) | Registry includes estate, estate_house, world, petworld, petbattle, battlehall and table/solo games | Keep IDs and filenames; distinguish utilities/world activities from arcade cartridges |
| [games/js/world_engine.js](../../games/js/world_engine.js) | Shared scene/context/chest/home runtime; refresh context after world mutations | Extend common engine; no separate engine per town |
| [games/js/rpg_scene_engine.js](../../games/js/rpg_scene_engine.js), [readme.md](../../readme.md) | Object-built town direction and historical runtime/editor iterations | Tree confirms separate engine files. Active entry-point consolidation must be checked in implementation; historical README claims are not proof all revisions are active |
| [public/assets/worlds/world_scenes.json](../../public/assets/worlds/world_scenes.json) | Version 2, default whisperwind_v2_hub; lists hub, tavern interior, cottage interior | Preserve default. Forest/cave files exist but are not listed here; registry reconciliation is D9 |
| [public/assets/worlds/whisperwind_v2_hub.json](../../public/assets/worlds/whisperwind_v2_hub.json) | Districts upper_cliff, market_square, tavern_lane, residential_row, hidden_alley, dockside; tavern, Pet Center, general store, homes, arcade | Approved opening geography. Keep structures and hotspot IDs |
| Same hub NPCs | npc_mira/Mira Tavern Keeper; npc_toma/Toma Pet Guide; npc_kip/Kip Alley Kid; npc_dockmaster/Dockmaster | Keep distinct from added Mara, Tessa, Orin; do not silently rename |
| Same hub home/links | door_home_riverbend uses whisperwind_01/plot_01, riverbend_cottage_interior; Pet Center links petworld; dock links zone=fishing | Preserve active IDs. Private home and Edda's cottage need distinct instance/ownership context |
| [public/assets/worlds/shadow_woods_river_bend.json](../../public/assets/worlds/shadow_woods_river_bend.json) | Fishing sites, house entrance, hollow tree/cave links, waterfall, dock routes | Preserve useful layout/scene names; extend gates and regional consequences |
| [public/assets/worlds/shadow_woods_crystal_cave.json](../../public/assets/worlds/shadow_woods_crystal_cave.json) | Crystal clusters, underground pool, mine cart, exit to River Bend, future mine/grotto hooks | Canon-compatible scene. Future exits are unreleased hooks until targets exist |
| [games/petworld.html](../../games/petworld.html), server pet handlers | Care, egg influences, training, active pet, roster management, explore/adventure rewards, fish and quests | Reuse systems; no rare hatch/PvP/forced sale in main story |
| [server.js](../../server.js), EXPLORE_ZONES | meadow Sunny Meadow L1, tidepools L2, embercave L3, shadowwoods L4, fossilridge L5 and further optional pools | Display Sunny Meadows as region; preserve API zone IDs; distinguish training excursions from town access |
| Same server, ADVENTURE_ZONES | ember_hollow and shadow_woods region-themed adventure IDs | Preserve, explicitly map their Story Mode gates; do not confuse with embercave/shadowwoods |
| [data/shops.json](../../data/shops.json) | 11 shops; feature gates exploration/pet_battle; basic/advanced/master lab requiresUnlock fields | Preserve catalog IDs, tier keys, stock definitions. Story cadence overlays current starter defaults |
| [data/items.json](../../data/items.json) | Key/scanner/coin/pass/license/cartridge effects | Preserve useful effects and ownership; separate story proof from item purchase |
| [data/pet_species.json](../../data/pet_species.json) | Flarecub, Frostfin, Leafbun, Shadepup, Pebblet, Chompasaur, Emberwing, GPTling; personal/custom entries RareSkill/myrarepet and Amanda/amanda | Common/rare roster supports fiction. Keep all IDs and owned pets; custom text is not authority for central plot |
| [WHISPERWIND_ASSET_AUDIT.md](../../WHISPERWIND_ASSET_AUDIT.md) | Historical count 682 images; recommends Mana Seed, Pixel Lands and Village Props; warns against simple generated final art | Cite as prior count, not freshly recounted. Follow useful art direction; do not regenerate terrain merely to fill story |
| [public/assets/vendor/ASSET_USAGE_MANIFEST.md](../../public/assets/vendor/ASSET_USAGE_MANIFEST.md) | Curated crops, vendor scaffolding, custom landmark direction Echo Hall, Forge Gate, Chronicle Board, Starter Cottage, Fountain Plaza | Preserve landmark direction; DDS gives narrative roles without claiming completed assets |

## Item semantics that must not be accidentally rewritten

- `shadow_key`: usable, unlock target zone/value shadow_path. Its use is an existing entitlement mechanism, not proof the player heard Edda or met Silas.
- `relic_scanner`: current effect is exploration collectible chance +15 for one action. Deterministic campaign survey mode is new behavior; implement separately or explicitly version a compatible extension.
- `ancient_coin`: currency_alt effect targeting curio_tokens. It is an item in inventory before use, not a second automatically synchronized global wallet.
- `egg_lab_pass`: unlock shop_unlock egg_lab_basic despite prose calling it “advanced.” Preserve effect; rewrite misleading presentation during a scoped implementation change.
- `battle_pass`: unlock feature ranked_pet_battle. Basic battle training remains a separate story gate.
- `market_license`: unlock feature advanced_market. Does not imply a new mandatory license purchase for basic shops.
- `gameforge_master_key`: GameForge Master Pass; explicitly described as a testing pass unlocking every table game. No campaign/admin bypass.
- `game_<gameId>`: existing cartridge convention, with explicit item unlock metadata also supported. Do not rename RuneMatch.html to lowercase on a case-sensitive host.

Shop IDs observed: snack_shack, care_clinic, egg_lab, training_dojo, toy_box, explorer_supply, curio_market, battle_shop, game_shop, tide_tackle, meadow_tackle. The DDS preserves these exact 11 IDs.

## Rewriteable placeholders, with concrete examples

Hub “Future Arcade” says it can later launch minigames; Hidden Alley says a rare merchant could live there later; NPC Mira says rumors and quests will start there. River Bend north path says it will later continue deeper into Shadow Woods; a supply crate says “Later this can hold bait, coins, or a key item.” Crystal Cave future exit notes ask the editor to assign targetScene/targetSpawn.

These describe development intent. Replace them with specific fiction when implementing those interactions. Preserve IDs, geometry, and useful scene hooks; do not pretend placeholder exits are complete. This commit changes documentation only and leaves source content untouched.

## New narrative material versus existing implementation

Approved story additions include Mara Vale, Tessa Wren, Orin/Edda Reed, Elian Moss, Kael Rowan, Lyra, Silas Veyr, Bellweather and the central memory/possibility conflict. The DDS adds a developed supporting cast, full Bellweather/World Forge resolution, the Living Accord, detailed quests, Council, Chronicle and endgame contracts.

The tree confirms existing Ember Hollow adventure support, but the DDS's full furnace town/governor chapter requires substantial new scenes and content. Tidehaven, Ironvale, Bellweather and the final Forge treatment are planned authored regions; their appearance in narrative does not imply production maps exist. Story-aware shell gating and central progression authority require implementation.

## Audit limitations and follow-up

This audit inspected source and text asset metadata, not a running server, live deployed account, image rendering, or multiplayer session. No gameplay tests were run for this documentation-only change. Future implementation must validate actual runtime entry points, account/session authentication, mutation trust, reward concurrency, scene registry coverage, and historical engine overlap.

The baseline tree includes both README.md and readme.md, distinct Git paths that collide on case-insensitive Windows checkouts. Both receive discoverability pointers via GitHub's tree API in this documentation change. Do not remove either without a separately scoped consolidation.
