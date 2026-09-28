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
