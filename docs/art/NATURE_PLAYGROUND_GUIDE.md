# Nature and playground atlas

Original GameForge artwork generated through built-in imagegen, using the existing `landscape_kit.png` only as a material/camera/style reference. No repository, player data, active player sheet or shared manifest was edited. Everyday v2 sources and QA remain preserved and inactive.

Files in this outputs directory:

- `nature_playground_source.png`: selected unchanged source, **1536 × 1024**, six isolated props.
- `nature_playground_original.png`: identical preserved generation.
- `nature_playground_prompt.txt`: exact generation prompt.
- `nature_playground_metadata.json`: measured source rectangles, solid bounds, display sizes, source anchors, normalized origins, scale and source hash.
- `nature_playground_review.html`: local display-size preview on light/dark floors. Open it alongside the source PNG; it needs no service or game code.

Layout is three columns × two rows, read left to right: reeds / rocks / pier; climbing frame / seesaw / jump rope. Fixed elevated orthographic RPG camera, upper-left light, weathered oak, limestone, natural green moss/reeds and dark iron fittings. No children, flowers, ribbons or ceremonial decorations are baked into any prop.

## Measured selections and proposed sizes

Sizes below include eight source pixels of transparent selection padding around the solid silhouette. Use JSON values for exact origins and scales; do not stretch width and height independently.

| Proposed ID | Source rectangle x,y,w,h | Display w × h | Solid target |
|---|---|---|---|
| wwhd_lake_reeds | 54,43,377,469 | 58.256 × 72.472 | 70 high |
| wwhd_shoreline_rocks | 546,216,400,302 | 98.958 × 74.714 | 95 wide |
| wwhd_timber_pier | 1017,142,488,365 | 248.136 × 185.593 | 240 wide |
| wwhd_climbing_frame | 36,569,480,399 | 175.862 × 146.185 | 170 wide |
| wwhd_seesaw | 554,667,468,245 | 150.133 × 78.595 | 145 wide |
| wwhd_jump_rope | 1111,736,369,195 | 57.493 × 30.382 | 55 wide |

Suggested origins anchor the solid silhouette bottom-center for reeds, rocks, pier, climbing frame and seesaw. The ground rope uses center-center. These are visual bounds anchors, not engineered support/pivot positions. In particular, align a seesaw interaction to its visible central support when adding future behavior. The parent handles collision, lake placement, deck walking surfaces and gameplay.

## QA and limitations

PNG alpha ranges **0–254**; **71.0449%** of pixels are fully transparent. The source genuinely contains alpha rather than a painted transparency grid. Some RGB channels retain backdrop colors in transparent pixels, and tiny residual alpha can remain in exterior pixels (for example corner alpha 1); preserve alpha and do not flatten. Metadata selections use alpha ≥128 silhouettes plus eight-pixel padding, excluding distant faint stray alpha without editing the source.

Viewed the full generated source, measured all six silhouettes, and inspected the local preview in the Codex in-app browser at the proposed world-unit sizes represented as CSS pixels, on both cream and dark green floors. Open spaces inside the climbing frame, under the pier and inside the rope display the chosen floor through genuine transparency. No solid prop is clipped, and no objects overlap in the source or preview. Visible silhouette separation is generous; nominal cell-edge margins vary, so use actual rectangles rather than exact third/half cell crops.

The reeds/rocks and rope retain fine soft edge pixels rather than a perfectly integer-locked pixel grid. The rope is recognizable at 55 units wide but its handles become small; enlarge to 65–70 units if playtesting needs more visibility. Pier supports remain one complete sprite with the deck: under-deck character occlusion and a walkable deck need explicit parent implementation, not a blanket rectangle collision. The climbing frame is static decorative art; the seesaw and rope have no motion frames or animation-ready interaction pose set. No children should be composited into the immutable source.

The pier has four large corner posts plus smaller under-deck supports, an open entrance and no rail across it. The climbing frame has end ladders and overhead rungs. The seesaw has a visible low central pivot and two handles. All objects match the practical timber/nature direction; material highlights are restrained and there is no decorative gold trim.

Suggested integration: version the PNG and metadata together; check proposed IDs against existing catalog IDs; register explicit rectangles/display sizes/origins after review; place reeds/rocks along the parent-defined lake edge; align pier entrance with an accessible shore path; keep climbing/seesaw/rope interactions separate from prop art and child identities. In-game scale, collision/occlusion, NPC interaction and mobile testing remain the parent's work.

