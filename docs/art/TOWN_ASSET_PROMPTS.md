# Expanded town asset prompt set

Generated using the built-in imagegen tool. PNG files are copied unchanged into the pack. All extraction uses source rectangles at render time; no programmatic raster edits. The original tavern image is an architecture/style reference.

Shared instruction: original Whisperwind HD pixel-art RPG assets; warm timber, stone and brass, crisp detailed pixels, fixed elevated orthographic view showing front and right sides; full isolated silhouettes; transparent alpha; generous cell gutters; no text, landscape or spreading shadows. Inspect actual alpha, dimensions and gutters rather than assuming the displayed tool preview or equal nominal sizes.

- `buildings.png`: 2 × 2 atlas: garden cottage with green shutters; two-story blue-shutter apartment; striped-awning bakery; teal-roof Pet Center with paw sign. Final edit removes baked dog/cats from the Pet Center, reconstructing empty openings for separate animation overlays. Preserve the architecture/grid during that edit.
- `fishing_shop.png`: entire isolated two-story fishing outfitter, blue-green roof, fish silhouette sign, front doorway, nets, rods, rope and lanterns.
- `npc_mira.png`: auburn bun, sage blouse, burgundy apron, brown boots.
- `npc_toma.png`: curly dark hair, teal vest, cream sleeves, tan trousers and brown boots.
- `npc_dockmaster.png`: short dark hair, navy dock coat with gold trim and sturdy boots.
- Every NPC request: exactly 4 columns × 4 rows. Rows down/left/right/up; columns left-foot-forward / passing / right-foot-forward / passing. Consistent character proportions, complete boots, no shadow/background. Four measured alpha row bands avoid clipping. Animation is tied to traveled distance.
- `window_pets.png`: 4 × 2 atlas. Puppy row: ears peek / head+paws / jumped-up head+chest+paws / look aside. Tabby row: ears peek / eyes peek / head+paws / side look and blink. No baked window/sill; overlays are clipped to the facade opening.
- `home_furniture.png`: 3 × 2 atlas: bed, sage sofa, walnut bookcase; fern, brass-lamp writing desk, wooden chair. Final extraction edit removes all background/glow while preserving objects/grid.
- `street_props.png`: 3 × 2 atlas: park bench, street lantern, flower planter; stone fountain, roofed noticeboard, striped produce stall.

To regenerate, supply the shared instructions plus the relevant request above, inspect alpha bounds, and version the source/metadata together. Generated sizes differ; never substitute assumed 1024/1254 dimensions. `manifest.json`, the world catalog, `npc_skins.json` and scene placements are the consuming contracts.
