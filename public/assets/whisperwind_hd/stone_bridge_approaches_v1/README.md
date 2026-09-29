# Stone bridge approaches v1 — selected short broad pair

west_source.png and east_source.png are the selected immutable alpha originals. Earlier long-strip and curbed drafts are excluded from metadata assets. Exact generation/edit prompts are saved beside the sources. Built-in image generation only; no synthetic image warping or painting.

Use measured sourceRect, displaySize, placeOrigin and scale from metadata.json. Both anchors are the center of the raised OPEN head edge. Each head's screen-y depth is190.2455worldunits to match the bridge floor band. Relative to the ORIGINAL stone_bridge_v1 near-edge origin: west head(-235,-99.1705), east head(+235,-99.1705). If the runtime origin is deck-floor center instead, heads are(-235,0)/(+235,0), and the old near-edge origin is(0,+99.1705).

Draw ramps before deck/back, then actors, then near rail. The heads deliberately overlap beneath the deck ends to hide small head-edge projection differences and side faces. Remove the old clean flat landing from the immediate join. Connect shore paths at measured toe points: west(-554.553,-42.691), east(+613.679,-13.107), relative to original bridge near-edge origin.

Measured screen runs: west319.553, east378.679. Head-to-toe screen-y grade offsets: west56.479, east86.063. Visible near-head stone-fill heights: west71.342, east77.910. These are artwork measurements, not physical3D elevation. West/east are independently scaled and not identical in run or grade. Contact endpoints and floor polygons are in metadata.

QA: review.html references adjacent stone_bridge_v1 originals and shows both joined sides on light/dark floors. Open broad head surfaces, continuous material and gradual stone aprons verified. Stone courses are not pixel-identical, but there is no baked wall, rail or step across the contact. Parent must verify actual shore/deck navigation, actor-radius insets and collisions; art alone does not implement3D ramps.
