# GameForge character asset pack

Original artwork generated with the built-in imagegen tool on 2026-09-28. Sources are copied unchanged. No game code, shared manifest, player data, ownership records, or repository files were edited. Style references were the existing Whisperwind HD player and home-furniture sheets; all five art guides and the sprite manifest were read.

## Deliverables and layout

| File | Layout | Intended use |
|---|---|---|
| main_base_source.png | 4 columns × 4 rows, 1254 × 1254 | Fully clothed neutral customization foundation |
| outfit_everyday_source.png | Same | Teal town waistcoat, russet scarf, brown trousers |
| outfit_fishing_source.png | Same | Moss fishing vest, ochre scarf, slate cuffed shorts, tall boots |
| outfit_event_source.png | Same | Burgundy waistcoat, teal tie, ivory sleeves, charcoal trousers |
| child_sunflower_source.png | Same | Curly-haired child, sunflower shirt, teal overalls |
| child_plum_source.png | Same | Freckled child, auburn pigtails, plum pinafore, mustard leggings |
| standing_outfits_source.png | 4 columns × 1 row, 1774 × 887 | Front-facing standing base / everyday / fishing / event |
| wardrobe_source.png | One isolated sprite, 1024 × 1536 | Closed wooden home wardrobe |
| wardrobe_opaque_original.png | Original first wardrobe generation | Preserved provenance; use the transparent version above |

Walking row order is **down, left, right, up**. Requested column phases were left-foot contact, passing, right-foot contact, passing. Generated passing phases are imperfect and must not be treated as verified authored cycles. Standing sprites have both feet together, relaxed arms, and match the clothing and identity of the corresponding walking set.

Exact full prompts, including the wardrobe transparency edit, are in `exact_prompts.json`. References: `main_base_source.png` for adult variants and child style; all four adult walking sheets for standing outfits; existing `home_furniture.png` for the wardrobe. The base was generated without image inputs, using the visually inspected current player as descriptive style guidance.

## Rectangles, scale and anchors

`frame_measurements.json` records actual PNG dimensions, transparency, observed row bands, individual source rectangles, solid bounds, source-space foot anchors and normalized placement origins. Rectangles surround alpha ≥128 silhouettes with six source pixels of padding. Very faint stray alpha outside that padding is deliberately excluded from suggested rectangles, while PNG sources retain every original pixel. These are measured selection proposals, not a shared runtime manifest.

Do not divide the sheet into equal 313.5-pixel rows: the children and adult sheets have different observed gaps. Use the explicit rectangles. Columns are identified by four proportional horizontal regions, then bounded by the observed silhouette. No solid silhouette reaches a horizontal region boundary.

`integration_metadata.json` provides proposed display sizes and outfit mapping. Adult walking sprites use one fixed scale per sheet based on median solid height, targeting 80 world units; children target 64. This avoids independently stretching each walking frame to an identical height. A small natural height change remains. Standing figures are all 644 solid source pixels tall, with a shared sole baseline at source y=773. Their target world height is 80, or use 160 CSS pixels for a larger home-page presentation. Apply one common multiplier to both dimensions for UI enlargement.

Origins anchor the midpoint of solid silhouette width at the bottom of the solid soles, approximately bottom-center. They are automated visual proposals, not hand-authored planted-foot points; hand/foot swings can shift the width midpoint. Check them in playback before adopting. Draw a separate small contact shadow using the existing renderer. Wardrobe placement is bottom-center; use aspect-preserving 170-unit solid height, with width derived from the actual silhouette rather than forcing 115 units.

## Inspection and limitations

All character sources have real alpha transparency and fully visible heads and soles. Horizontal gutters are broad. Vertical adult gaps are comparatively narrow, around 20–30 source pixels between solid rows; the generated sheets did not honor the requested large gutters or canvas size. Source dimensions above are authoritative.

Adult identity, palette and clothing are coherent across directions, and all four standing figures share measured height and baseline. Fine facial and costume details still drift between the larger standing drawings and walking drawings. These are complete dressed sprites, not separate compositable clothing/hair/skin layers. Outfit-level selection is usable; mixing tops, bottoms or arbitrary hair requires further authored layer extraction and registration. The neutral base is modestly clothed, with a fixed skin tone and hairstyle, rather than a complete avatar customization system.

Across all six walking sheets, side-view columns repeat similar extended strides and do not reliably alternate opposite leg contacts. Columns 2 and 4 are often near-duplicates rather than proper passing poses. Front/back poses alternate more clearly, but direction-to-direction gait parity is not proven. The adult right-facing fourth frame has a 2–4-source-pixel sole-height difference; child plum side frames have 1–2-pixel differences. Child plum head/dress width and pigtail shapes vary slightly. At 64 world units the children will be shorter than the adult, regardless of their similar source height.

Fine reddish/yellowish edge fringes and faint stray alpha remain around some silhouettes. Generated pixel clusters contain soft edge pixels and are not a strictly locked integer pixel grid. These files are **reviewable prototype assets, not production animation-ready sheets**. No in-game playback, gameplay-scale browser test, mobile review, or clothing-layer overlay test has been performed. Preserve the raw sheets when creating a cleaned version.

The wardrobe edit has real alpha (0–254), with transparent tested exterior points and about 49.8% completely transparent pixels. Its RGB channels retain background colors even in transparent pixels; do not flatten or discard alpha. Faint edge alpha remains, so check on light floors. `wardrobe_edit_attempt.png` preserves the same edited source as `wardrobe_source.png`.

## Suggested integration

1. Version these sources into a new asset directory after parent review. Keep existing art and IDs intact until replacement is tested.
2. Save one validated `equippedOutfitId` using the proposed IDs in the metadata. Resolve both `walking` and `standing` from that same ID; do not maintain a second home-page outfit field. Keep ownership of outfits separate from the display mapping.
3. Use the standing atlas rectangle for the home-page avatar and four directional rectangles per frame for world walking. Do not use a contact walk pose as a static standing image. Directional stationary side/back sprites remain a future authored task; these standing images face front only.
4. Register the wardrobe as furniture and let the parent implement its interaction, owned outfit storage, and authenticated equip change. The art grants no inventory items or ownership and contains no interaction behavior.
5. Before enabling movement animation, author true passing/opposite-contact phases, clean fringes, lock head/hip/sole registration, and preview each direction at 80/64 world-unit height on light and dark floors. Check stop/idle transitions and equipment changes without silhouette jumps.
6. Retain the existing distance-based walking contract (72 units per cycle, 8 fps equivalent at 144 units/sec) only after corrected frames play smoothly. Keep child NPC identities and dialogue separate from their skin IDs; these two designs have no canon names or quest bindings.

