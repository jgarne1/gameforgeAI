# Construction kit v1

Ready static scenery pack: foundation, open timber wall frame, skeletal roof frame, scaffold, lumber, stone stack, wheelbarrow, tool workbench, temporary work-fence panel. Nine unchanged original PNGs generated with built-in image tool, with exact prompts, source rectangles, display sizes, placement anchors, alpha measurements and hashes in metadata.json. review.html checked over light/dark floors.

Stages use independently measured420-unit foundation footprints and common visible frontcorner origins. Entrances remain on screenright, measured anchors adjacent; actual gap is about50units, rather than the requested100. Stagegeometry is similar but not exactly pixelstable. Keep stage-specific door anchors/collisions, and do not composite multiple stages or enable automatic progression without further runtime verification.

Workfence: place two160-wide panel centers at -190 and +190 from openingcenter to retain a220-unit empty aisle. Do not place blocker across gap. Small conservative prop ground-contact ellipse proposals are supplied; scaffold platform/climbing/actorocclusion are not implemented. Tools are baked onto workbench rather than separate pickups. Stone stack is a little coarser than town walls, but reads as a small prop.

Use this as future-address construction scenery. No ownership/sale availability, enterable interior, worker animation, construction-state logic or repository modification supplied. Runtime collisions and publicroute verification belong to integration.
