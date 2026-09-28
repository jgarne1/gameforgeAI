# A town with a heart

The second layout replaces the paving grid with curved neighborhood lanes. Start near the fountain and Chronicle Board, with the tavern above, the Pet Center beneath the old swing tree, a clustered bakery market to the southeast, and a working fishing quay below. Lantern Hill has a retaining wall with a walkable stair break. The orchard bank has a smaller flight of steps. All 24 home IDs and saved owners remain unchanged when an address moves.

## Editing the landscape

`public/assets/worlds/whisperwind_hd_waterfront.json` contains placement, `paths`, `paint.terraces`, `blockers`, and `guidePlaces`. Terrace `height` draws the stone face; this is a 2D map, not a 3D terrain simulation. Retaining-wall faces have blockers, while the stair gap remains walkable. Match any moved wall to its blocker. Rerun the route test for every home and public entrance after editing.

The reusable `landscape_kit.png` atlas is registered in the manifest and World Composer catalog: limestone stairs, a flowered retaining wall, a grassy knoll ledge, a tree with a rope swing, fish crates and nets, and a hammer shrine. Sources are preserved unchanged; rectangles select objects. The built-in image tool created it using the street-prop atlas as a style reference. Its prompt requested six separated transparent sprites in a 3-by-2 grid, south-facing stairs, flowered pale limestone, mossy ledges, a swing tree, fishing clutter, and a small wayside shrine.

## Roof choices

Home exterior `roof` is independent of `style` and `accent`, permitting `original`, `slate`, `moss`, or `plum`. Missing values preserve the original roof. Alternate roofs use complete sprite variants so tile shading stays detailed and stone walls are not tinted. Do not change IDs, ownership, or doors to change appearance. The owner editor saves roofs through the authenticated decoration route.

The built-in roof-generation prompt used the building atlas as an architecture/style reference, requesting a transparent 3-by-3 atlas: cottage, apartment and market-house rows; river-blue slate, moss-green and heather-plum columns; original stone, timber, flowers and golden windows retained.

NPC identities and scripts stay separate from appearance. Door return spawns and pet-window offsets must follow a building when it moves. Guide destinations come from the scene, not a second hardcoded layout.

## Housing sizes and the inn

The 24 addresses include six compact cottages, six family houses, eight apartments and four larger orchard houses. `roomScale` adapts scene size, walking bounds, furniture positions and the exit together; decoration remains stored in the shared 1200-by-900 editor coordinate system. The saved layout does not change when the owner switches facade or roof. The original town IDs, owners and decorations remain authoritative. A public Lantern Inn lobby and a fourth resident, the Innkeeper, are available; booking overnight rooms is not implemented.

`town_trees.png` adds four reusable species: oak, apple, cedar and willow. The built-in image prompt used the landscape kit as a style reference and requested four isolated transparent trees in a 2-by-2 atlas, with no scenery or turf squares. Their individual measured gutters are recorded as source rectangles. More than sixty trees are placed in clusters, with tree-root collisions and gentle canopy sway. They must not obstruct door approaches or NPC routes.

## Story-led exploration pass

Read DDS section 4's Whisperwind local history before placing scenery. Commonlight Square is the civic heart; Reedwater Quay, Lantern Hill and Orchard Gardens have specific daily purposes. The eastern extension contains Orchard Lake and an inspectable abandoned mansion. These flavor interactions grant no campaign progress. Lake fishing and the mansion quest are planned. Town scene size is now 6800 by 3700.

Roads use one opaque world-aligned paving pattern, avoiding stripes and shadows that cut across joined paths. `plazas` defines the square's filled footprint. Home approaches meet their existing door hotspots; plot IDs and ownership remain intact. The original steps are adjusted to terrace height, and selected addresses include fenced front garden boundaries tagged with `plotOwnerId`. The yard belongs conceptually to that address; outdoor decoration permissions remain future work.

`river_civic_kit.png` contains the weathered fountain, ferry belfry, fern planter, timber fence/gate and bench. `old_mansion.png` is the lakeside landmark. Both are built-in imagegen sources preserved unchanged, with measured alpha source rectangles in the catalog. The civic prompt requested weathered limestone/timber/bronze, an elevated RPG camera and six separated sprites; a background-extraction follow-up retained all objects and removed the backdrop. The mansion prompt requested a boarded timber-and-stone manor with worn slate, ivy and one warm attic window. Ornate wedding-like prototypes were rejected and are not catalog assets.

`home_furniture_v1.png` adds twelve movable owner-editor furnishings: sofa, armchair, dining table/chair, bed, bookcase, dresser, bedside cabinet, plant, floor lamp, rug and aquarium. A separate wardrobe source is also approved furniture. The built-in prompt requested a transparent 4-by-3 atlas, detailed HD pixel art, elevated front camera, teal upholstery/warm timber and generous gutters. Furnishings currently decorate the home; wardrobe outfit storage and aquarium collection display are future interactions.

## Persistent admin editing

Whisperwind HD scenes saved with Composer's Save Server use `/api/town/admin/scene` and require an authenticated world-editor admin. Overrides are atomic JSON files under persistent `DATA/town_scenes`, used by public scene reads and the scene list; shipped repository files remain fallback sources. Back up that directory with other persistent data. Reloading the server does not discard these layouts. A saved override intentionally takes precedence over future deployed scene changes; compare/export it before adopting a revised shipped layout.

The Composer previews the same paving pattern and square footprint. Move the matching entrance hotspot, return spawn, approach and any attached ambient effect when moving a building; these are separate editable scene records. Walls have explicit blocker rectangles. Keep stairs' gap free and rerun entrance routes after edits. NPC appearance edits remain separate persistent skin overrides.

## Character prototype pack

`public/assets/whisperwind_hd/character_prototypes/v1` preserves the delegated character/outfit/child sources and explicit frame metadata. Read ASSET_GUIDE.md. Standing outfits are coherent; walking sheets have repeated side contacts and require cleanup. Do not replace active walking sprites merely because a sheet exists. Outfit storage, equipped selection and home-page portraits are planned account integration.

