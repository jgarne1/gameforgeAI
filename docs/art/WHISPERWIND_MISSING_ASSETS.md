# Whisperwind expanded concept — asset inventory and production brief

Reference: Whisperwind-Layered-Town-Concept-v2.png. This is a concept inventory, not a claim that its features are implemented. Checked the shipped world asset catalog and the asset task output folder.

## September 29 integration update

Registered and placed: nature_details_v1 (wildflowers, shrub, river plants), stone_bridge_v1 (deck, front rail, landing), terrace_kit_v1 (wall, outer corner, endcap, stairs and landing), construction_kit_v1 (timber frame, scaffold, lumber, stone, wheelbarrow, workbench and fence). Alternative construction foundation/roof stages and terrace ramp are editor choices, not automatic gameplay states. The inconsistent inner-corner draft is excluded. Playground slide, jungle gym, swings, sand and open gate are integrated. Right-facing tavern, fishing shop and inn now appear in the layout; roof variants for those originals still need separate art.

Every pack retains original alpha PNGs, measured source rectangles/anchors, exact prompt files and metadata. Full overlapping tunnel surfaces, split worker occlusion, child activity animation and future waterfront/storefront variants remain production work.

## Already available — reuse

- Cottage, apartment, bakery, pet center, fishing shop, tavern and old mansion.
- Five approved right-facing alternatives: cottage, family house, apartment/inn, fishing shop and tavern. Registered as editor choices; not yet placed across town.
- Slate/moss/plum roof alternatives for original left-facing cottage, apartment and bakery. These cannot be reused on the new right-facing roofs.
- Oak, apple, cedar, willow and swing tree; reeds, shoreline rocks, grassy ledge.
- Grass, stone street, timber floor, wall and water materials; dock, quay and small fishing pier.
- Fountain, bell tower, benches, lanterns, planters, noticeboard, basic market stall.
- Garden fence and closed garden gate; fish crates, nets and ropes.
- Rustic climbing frame, seesaw, ground jump rope.
- Three adult NPC skin families and existing dog/cat peek sources.
- Home furniture, aquarium and wardrobe; static outfit portraits.

## Generated or assigned — do not duplicate

- Playground slide source exists in the asset task outputs; metadata/QA/integration not yet confirmed.
- Sand texture and improved jungle gym were assigned previously. Finish or recover those before starting another version.
- Character/child walk prototypes exist, but contact/registration QA is incomplete. They are not replacements for the active player sprites yet.

## Missing or incomplete art — priority order

| Priority | Pack | Required pieces | Why / acceptance |
|---|---|---|---|
| 1 | Traversable bridge kit | Stone arch bridge; timber footbridge; matching bank abutments; separate foreground rail/cap where needed | Connected deck and shore approaches, readable walkable corridor, water visible underneath. Match actual camera, source rectangles and anchors. |
| 1 | Connected terrace kit | Straight retaining walls, corners, end caps; stairs matching the raised wall height; upper/lower landings; slope/ramp alternatives | Existing isolated wall/stair art is insufficient for continuous convincing elevation. All joins must be illustrated in a placement preview. |
| 1 | Tunnel / underpass kit | Matching stone arch portal, dark tunnel interior/back piece, foreground arch/cap, clear floor/exit | Must support a character visibly passing behind the arch, with identifiable opening and paths at both ends. Runtime layering remains separate work. |
| 1 | Playground completion | Finish slide, sand texture and jungle gym; standalone swing set; open fence/gate pieces | Keep sand visibly distinct; wide open entrances and a clear pedestrian aisle. Existing climbing frame/seesaw/rope remain usable. |
| 2 | House construction kit | Foundation, partial timber frame, later roof framing; scaffold, lumber, stone stacks, wheelbarrow, tools/workbench, practical work fence and opening | A future house construction site with staged visuals. No ownership/sale changes or automatic construction progression in this art task. |
| 2 | Working waterfront | Small moored rowboat, fishing boat, modest sailboat; cleats/bollards, pier corner/end/join pieces | Existing dock/pier reused; add the missing boats and connectors, with consistent scale. Water animation is runtime work. |
| 2 | Market expansion | Produce stall and fish stall variants, practical shop display props, opening-soon shutter/board with pictograms | Reuse existing bakery/tackle shop. Signs must be separate where practical; no unreadable baked lettering. |
| 2 | New storefronts / games hall | General-goods or craft shop facade; modest card-sign casino/games hall facade; separate entrance/sign props | Match timber/stone town architecture, both orientations where useful. No neon resort or wedding decor. Casino mechanics not part of asset production. |
| 2 | Residents and workers | Two distinguishable builders, merchant and fisherman idle/work poses; later verified walking sets | Short NPC conversations and schedules are code/data. Distinct roles should read at normal gameplay scale. Avoid replacing proven sprites with failed prototypes. |
| 3 | Right-facing roof colors | Compatible slate/moss/plum variants for approved right-facing building silhouettes | Original overlays do not align. Exact footprint, doorway and origin must remain unchanged across variants. |
| 3 | Lake / watercourse details | Watermill facade/wheel if adopted, waterfall rock lip/shore transitions, lilies, small reeds/rock variation | Watermill is new in expanded concept; existing mansion/lake art reused. Animated flow/spray belongs in code or separately verified loops. |
| 3 | Residential variety | Larger apartment/hotel option, selected fence corners/open entrances, clothesline and garden utility props | Reuse existing homes first; add variety rather than replacing all buildings. |

## Animation and implementation gaps — not solved by more scenery PNGs

- Horizontal walking: arms move but legs hold an extended stride. Verify alternating foot contacts/passing frames; vertical timing also needs review.
- Dog/cat peek: existing sprites need opening alignment and proper wall/frame occlusion; dog remains unresolved. Do not create another static pet on top of a baked pet.
- Home exits: clear Return to Town action and visible usable doorway; verify return outside the correct home.
- Bridges/tunnels/terraces: need runtime walkable surfaces, bank barriers, foreground occlusion and connected routes.
- NPC talk: short local speech bubbles plus pauses/facing/routines, not player-chat impersonation.
- Construction stages and new shop openings: need explicit state rules; concept art must not imply active sale availability.
- Fountain/water animation: use existing source art and clipped effects where appropriate.

## Asset task delivery requirements

Use built-in image generation, referencing the existing shipped art and expanded concept. Preserve generated originals and alpha; do not overwrite working files. Deliver each bounded pack with exact prompts, source sizes, measured source rectangles, display sizes, placement/door/deck anchors, proposed collision/opening notes and a light/dark-floor visual review. Separate foreground and background parts where occlusion demands it. Do not edit repository, saved layouts, player data, active sprites or deployment. Mark animation failures explicitly and keep rejected variants out of integration folders. Finish one priority pack at a time and report it for integration. Production-ready art does not mean route/collision verification is complete.
