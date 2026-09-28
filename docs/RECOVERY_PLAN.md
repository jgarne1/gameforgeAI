# GameForge recovery direction

First repair pass restores the Shadow Woods fishing engine, map arrivals, editor geometry preservation, pet destinations, return navigation, and cottage routing.

Validation: seven regression tests; local integration tests for fish persistence, scene boundary round-trip, and all 27 registered game URLs. Browser checks cover pet Games navigation, fishing readiness, inventory fish tab, game shop, neighborhood, cottage, and loading the dock in the composer. A complete successful browser fishing catch is still pending. Changes have not been deployed.

## Next pieces

1. Finish the fishing catch/reel browser loop and audit remaining battle/social/admin navigation. Resolve generic town fishing hotspots that still only show a message.
2. Build an original detailed pixel-art town asset set inspired by the atmosphere of a Final Fantasy VI HD remake. Deliver reusable street/terrain tiles, modular building facades, interiors, furniture, signs, NPC walking/idle sheets, water/light animations, and editor previews. Establish consistent grid, scale, palette, anchors, collision footprints, layers, and asset manifest before expansion. Start with one shop and apartment block; avoid relying on flattened scene backgrounds.
3. Add NPC schedules, meaningful shop interactions, and readable player destinations to the town block.
4. Replace one-plot-per-neighborhood ownership with multiple homes/apartments and a home selector. Keep ownership and occupancy separate from scene definitions.
5. Audit scene persistence on Render and consolidate incompatible world engines as the new asset workflow stabilizes.

The current artwork and single-home model do not yet meet the owner's vision. Removing inactive controls in this pass does not remove the future building or map features from the roadmap.
