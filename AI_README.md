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
