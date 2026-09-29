# Terrace kit v1

Ready art assembly: retaining-wall straight, outer corner, short end/termination module, five-riser stairs, reusable flat landing, and long smooth ramp alternative. PNGs are immutable built-in image-tool originals; exact prompts and measured metadata are adjacent. Landing source is unchanged reuse from stone_bridge_v1.

review.html illustrates wall → upper landing → stairs → lower landing, corner and end joins, on light/dark ground. Visible wall height is100worldunits including cap depth; stair risers sum approximately100units at the supplied scale. Gap300, conservative stair middle220wide. Floor anchors differ323.843screen-y units; this screen run must not be confused with physical height.

Apply assembly offsets from metadata relative to the stair lowerlanding origin. Retaining walls stop at the stair gap; cheeks overlap wall ends. The outer corner uses its measured left connector with10units overlap. Masonry courses are independently generated, so joins are continuous but not pixel-identical.

Block wall ground faces and corridor sides only. Landings and stair center require explicit connected runtime surfaces and actor-radius insets. Near stair cheeks need authored occlusion masks for actors inside; no pre-split cheek PNGs supplied. Do not turn entire PNGs into rectangular blockers or infer automatic levels from depth sort.

The end piece is262units wide at matchingheight, rather than the requested80unit stub. Ramp is a long alternative with220wide narrowtop and533.5unit floor screenrun; it needs its own assembly offsets, wall gap and landings. It is not a drop-in stair replacement and was reviewed as a source only. The innercorner draft has inconsistent returnheight and is explicitly excluded from metadata assets; do not integrate that draft.

Visual assembly verified; actual runtime collisions, height surface transitions, routes and NPC access remain untested here.
