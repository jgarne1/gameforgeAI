# Right-facing building alternatives

Five original matching building candidates generated with the built-in imagegen tool. Main entrance façades face **screen-right**, with stairs and approach space extending diagonally **down-right**. This is an entrance-facing description for the fixed RPG camera, not a real-world compass heading. Sources remain intact; no repository files, active player sprites, manifests, player data or deployment were changed.

Existing `buildings.png`, `roof_variants.png`, `fishing_shop.png` and `tavern.png` were visually inspected alongside the art documentation and manifest. The new cottage used `buildings.png`; the family house used that atlas plus the new cottage orientation; apartment used the original atlas plus new family house; shop and tavern used their original sources plus the new family house. Exact full prompts and reference names are in `buildings_right_prompts.json`.

## Sources and measured rectangles

Each PNG is one complete isolated building, rather than an atlas. Eight source pixels of selection padding surround the alpha ≥128 silhouette. Display sizes preserve aspect ratio and include that padding. Solid world widths target cottage360, family400, apartment380, shop430 and tavern520.

| Source file | Actual PNG | Source rectangle x,y,w,h | Display w × h | Upper-doorstep anchor in source pixels |
|---|---|---|---|---|
| cottage_right_source.png | 1351 × 1164 | 188,102,989,974 | 365.920 × 360.370 | 940,955 |
| family_house_right_source.png | 1286 × 1223 | 98,73,1092,1038 | 405.948 × 385.874 | 925,960 |
| apartment_inn_right_source.png | 1222 × 1287 | 98,101,1046,1042 | 385.903 × 384.427 | 867,998 |
| fishing_shop_right_source.png | 1316 × 1195 | 82,46,1209,1066 | 435.767 × 384.225 | 980,990 |
| tavern_right_source.png | 1279 × 1230 | 93,61,1139,1115 | 527.409 × 516.296 | 900,1035 |

`buildings_right_metadata.json` is authoritative for exact rectangle/origin/scale values, hashes, alpha measurements, source-space door anchors, door coordinates normalized to selected rectangles, and local world offsets. Proposed asset IDs append `_right` to each type; check the parent catalog for ID collisions before registering.

Placement origin is the bottom-center of the solid silhouette, normalized within its padded selection rectangle. For a building placed at `(x,y)` with these display sizes, add `door.thresholdOffsetWorld` to get its proposed upper-step door point. Add `door.approachOffsetWorld` for the proposed clear exterior approach. If scaling the entire building, scale both offsets with it. Never reuse the original left-facing building's doorway offset.

Door points were visually estimated and checked with markers in the display-size preview; allow approximately ±5 world units for final adjustment. The approach vector is +72,+64 world units from the threshold, extending beyond the stone stairs. These are **visual placement proposals, not verified navigation/return-spawn coordinates**. Use the parent scene's actual terrain, blockers and neighbor spacing before adopting them. Door hotspots, exterior return spawns, guide destinations, fences, pet-window overlays and effects must follow the chosen building together.

## QA and limitations

All five PNGs have genuine alpha spanning 0–255 and complete visible roof, chimney, walls and steps. Each has its entrance on a screen-right façade and no competing left-side door. The cottage uses a right-hand entrance gable; the larger buildings use broad right-facing fronts. Warm stone, weathered timber, amber windows, muted shutters and upper-left highlights remain coherent. The shop has fish-pictogram identity and practical tackle beside its display; the tavern has a tankard pictogram. No pets, people, flower boxes, garlands or ceremony decorations are baked in. Small brass highlights remain on the tavern sign hardware.

Viewed every source at source scale, measured dimensions/bounds/alpha, and reviewed each at its proposed world size represented as CSS pixels in the Codex in-app browser, on cream and dark green floors. Doorways and steps remain readable. Transparent margin around silhouettes survives rendering, including the gaps in sign brackets; source rectangles do not clip solid pixels. `buildings_right_review.html` provides the same local review, threshold/approach markers, floor switch, and a click-to-read source-coordinate aid. The PNGs remain unchanged when using that aid.

The requested uniform 80-pixel border was not achieved everywhere: fishing shop has 33px at the right sign edge and 54px above the chimney; tavern has 55px at right, 62px below and 69px above. Other buildings have at least80px solid clearance on every side. These are still isolated single-building sources with no neighboring sprite bleed, and no solid clipping. Fine warm edge fringes and faint distant stray alpha remain, as in the established generated pack; metadata excludes distant faint alpha through silhouette measurement and padding. Do not flatten away transparency.

Proportions are new alternatives, not exact pixelwise mirrored replacements. Cottage solid height is354.45 world units versus the existing cottage's roughly311-unit display height; it needs review for neighboring roofs and door-scale feel. Family solid height379.926, apartment378.524, shop378.458 and tavern508.887 remain close to their intended sizes. Family and apartment have similar silhouettes but different shutters and residential details. Front openings are stylized; player/door scale and walk-through behavior require in-game review rather than inference from image generation.

These are complete facades with baked roof colors, not modular roof overlays. Original roof variants cannot be placed over them without a separately authored compatible set. Roof/chimney detail, ground footprints and door positions differ from the old sources. Parent must create matching collision around physical walls, leave stairs/door approach free, test camera occlusion and rerun entrance routes. No collision, multiplayer, mobile, runtime editor, doorway round-trip or gameplay traversal testing was done in this asset-only task.

## Integration handoff

Version sources and metadata together in a new directory. Register explicit measured rectangles, padded display sizes and placement origins. Select an alternative asset while preserving the home/public-building identity and ownership records. Move its entrance hotspot and approach/return spawn according to the reviewed offsets, then validate routes against the existing town. Keep original left-facing art available until scene placement and collision checks pass. Parent handles repository inclusion, placement, HUD/fountain work and deployment.
