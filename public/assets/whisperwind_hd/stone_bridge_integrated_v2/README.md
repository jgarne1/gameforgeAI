# Integrated stone bridge v2

bridge_source.png is one complete placeable bridge with both built-in shallow ramps and uninterrupted stone paving. No separate apron or square approach mats are needed. A separate narrow shore_threshold_source.png blends a tidy stone border into small warm cobbles and loose pebbles; use reflected west and regular east instances.

metadata.json contains catalog-style assets, hashes, crops, uniform display scale, origin at the clear central deck center, measured inset floor polygon, four-point centerline, side rail lines and shore toe anchors. Proposed threshold placement is separate from the inset navigation toe anchor. Its narrow strip is ground detail, not a collision wall or a navigation grant.

At bridge scale 1.01 the central corridor is 207 units deep and 745 units long. Toes narrow to 162 units. The complete footprint is about 2165 units wide because the integrated ramps are long. The transparent arch gap near the bottom is measured at 439 source pixels, about 443 units; higher points within the arch are narrower. These are screen-plane measurements, not physical Z dimensions. Runtime river and road placement must account for the complete footprint.

The far parapet, low near rim and front arch face are baked into the single original. No independent rail has been generated. Keep actor feet inside the inset polygon and behind the rim. Precise occlusion outside this safe route needs a runtime mask.

Local browser light/dark canvas inspection passed continuous paving, transparent arch, floor polygon and centerline placement. Runtime navigation and road-material blending remain the main project's responsibility. Exact generation and correction prompts are preserved in the pack. narrow_draft.png and threshold_halo_draft.png are excluded from assets metadata.

All original image pixels and generated alpha are preserved. The threshold has near-transparent noise outside the solid stones; its measured crop excludes the broad surroundings. Do not sample hidden RGB as a background texture.

The original threshold remains catalog-selected after alpha-composite verification. shore_threshold_final_cutout.png is retained as an unselected variant: reducing negligible exterior noise from21to14pixels atalpha1/255 was not a material improvement. The broad brown hidden RGB is alpha0 and does not render.
