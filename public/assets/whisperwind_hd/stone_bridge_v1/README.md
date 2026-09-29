# Stone bridge v1 — ready art assembly

Three immutable PNGs: deck/back with integrated bank piers, independent near rail, flat approach landing. Exact generation/edit prompts and metadata.json are adjacent. Generated using the built-in image tool.

The stone span is610 world units across screen x. Clear main floor band is190.2455 units deep in screen y, from -194.2933 to -4.0478 relative to the common origin. Origin is the near/front deck edge center. Deck source anchor[768,640], rail anchor[768,591]; use their distinct crop origins and display sizes from metadata, but give BOTH placements the exact same world position. Sources share canvas dimensions but their generated rail baselines differ; metadata corrects this.

Place landing centers at(-420,-99) and(+420,-99) relative to bridge origin, below deck and actors. Each landing is400 units wide, overlaps an outer deck end and has about200units screen-depth of paving. Main bridge side exits remain open. The stone bank piers are integrated in the deck, not an extra detached pier image.

Render landing then deck/back then crossing actors then near rail. Foreground rail belongs only to this crossing surface so unrelated actors below the bridge are not incorrectly covered. Rail collision follows foot/baseline, not raised painted silhouette. Explicit deck polygon may override water blocking; source PNG alpha must never grant crossing permission by itself. Inset polygon for actor radius and join it to real bank approach polygons. Do not block the whole arch rectangle or implement a lower underpass surface from this art.

QA: light and dark assembly preview checked in review.html, including paving joins, true transparent arch, baseline alignment and sample actor occlusion. Alpha0-254 preserved. Independently generated rail courses do not match deck stones pixel-for-pixel. Initial narrow drafts are excluded from this ready pack. Actual runtime bank connectivity, collisions, water shortcuts and occlusion membership remain unverified.
