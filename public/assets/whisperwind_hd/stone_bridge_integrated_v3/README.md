# Integrated stone bridge v3

One complete bridge_source.png for the Composer. Both outer ramp toes contain warm small interlocking cobbles within the bridge paving itself. Do not draw the separate v2 shore threshold strips or large square approach mats.

The edit preserves the long shallow ramps, central broad deck, baked far parapet and low near rim, and transparent central arch. The generated central pixels are visually faithful but not bit-identical to v2. True alpha is preserved. No road or background is baked around the bridge.

metadata.json supplies catalog id/file/sourceRect/displaySize/placeOrigin/sha256, the inset walkable floor polygon, four-point route centerline, rail segments and shore toe anchors. Origin is the clear deck center. Uniform display scale is 1.01. The central safe corridor is 206.04 units deep and 777.7 long; toes narrow to about 160.59. The complete solid footprint is about 2162.41 units wide. The arch opening near source y600 is 445 source pixels, or 449.45 units. These are 2D screen-plane measurements, not physical elevation.

The last approximately 200 source pixels of each ramp are smaller stones. Keep feet within the inset floor polygon, and use the built-in low near rim. There is no separately generated near rail. Runtime must join the town road at the clear flat toe and verify actor occlusion, navigation, and material blending.

Local light/dark browser canvas inspection passed floor alignment, both built-in toes and transparent arch. Exact built-in imagegen edit prompt is in prompt.txt. This pack is handed off for runtime integration; it does not modify or push the main project.
