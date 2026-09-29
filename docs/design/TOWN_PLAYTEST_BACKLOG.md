# Town playtest notes

## September 29 completed layout pass

Expanded default town with curved routes, three river crossings, connected wall/stair landings, large square, accessible playground/lake/mansion, varied home placement, flowers and construction scenery. Preserved 24 player addresses; six separate NPC homes and eight roaming residents. Dog moved upstairs with clipped retreat; both interior return mechanisms remain available. Historical observations below are retained; true tunnels, children/playground activities and future shop/construction gameplay remain open.

## Next batch — observations being collected

- The dog animation looks awkward against the Pet Center's open doorway. Try moving it to the upstairs window, or having it peek around one side of the door. Leave the current animation in place until this batch is addressed.

## Current pass — finish before starting the next batch

- Replace the regular street grid with winding paths, hillside steps and distinct neighborhood gathering places.
- Add more trees and reusable landscape assets.
- Add smaller and larger homes, apartments, an enterable inn and roof-color choices.
- Give the home approach paths a softer stone finish.
- Apply the existing collision settings consistently to solid objects.
- Put benches in deliberate resting places, clear of paths and doors.
- Verify admin town editing and preserve saved layouts across deployment.

## Additional observations for the next batch

- Paths overlap poorly and look sloppy at intersections and home approaches. Clean up joins and vary widths, with wider main routes.
- Create a large central town square with space for community events.
- Write a coherent town layout story first, then arrange neighborhoods, elevation changes and stairs to match it. Current stairs feel random and disconnected.
- If the dog peeks around a doorway, mask it behind the door or wall so the hidden portion cannot show through. Review the cat's window masking and motion; it currently seems to disappear.
- Give selected houses fenced private yards that belong to the home owner. Keep other homes open; avoid fencing every property.
- Preserve the cozy backyard feeling and varied houses while improving the surrounding paths.

These observations are queued for a single later pass. Do not implement them individually during collection.

- Keep the second layered retaining wall: its depth works well. Improve how stairs meet the upper terrace, lower path and adjoining wall, with continuous landings and aligned edges so the elevation feels believable. Screenshot reference: codex-clipboard-2ca71b24-eab2-42e4-88fd-97684a7b09ca.png.

- Create animated fountain assets: flowing water, basin ripples and gentle splashes, matching the town art. Preserve a solid collision footprint around the fountain.
- Asset creation may continue while observations are collected; the user authorized adding more reusable assets throughout. Keep reported layout and behavior fixes grouped for the later batch.

- Smooth Toma and Mira's walking animation and movement timing; preserve the lively feeling their routines bring.
- Add a playground with children playing and jumping rope, with matching reusable character, playground and rope animation assets.
- Children can visit the park when their schedules leave them free, and wander naturally between activities.
- Make jumping rope a shared activity: an available child or player can claim it, and leaving releases it for someone else. Show when it is occupied and avoid simultaneous claims.
- Let the player jump rope for fun after an NPC leaves the activity.
- Limit park occupancy and activity slots; children choose another activity or destination when the park is full. Keep the town from bunching all children into the playground.
- These gameplay and layout additions remain queued with the collected batch; asset creation can continue separately.

- Pet Center approach: the path curves look smooth, but the approach does not align with the door. Connect paving directly to the entrance threshold while preserving the smooth curves.
- Pet Center bench: placement is awkward, though its appearance is acceptable. Put it in an intentional resting area off the walking route, with a sensible view and clearance.
- Town center art direction: fancy, grand and ornate. Expand the event square into a generous civic plaza with cohesive decorative paving, fountain framing, lamps, landscaping and deliberate seating. Keep room for gatherings and movement.
- Screenshot reference: codex-clipboard-14c8248f-e20c-4c47-bc46-74fe1543e06a.png.

## Layout inspiration requested

- Study Final Fantasy VI town maps (especially Narshe, South Figaro and Jidoor) for district structure, landmarks, purposeful elevation and approaches to important buildings.
- Study Stardew Valley's Pelican Town for everyday community life, readable destinations, civic gathering spaces, playground placement and NPC schedules.
- Proposed design synthesis: grand JRPG civic square plus cozy, lived-in neighborhoods and fishing waterfront. Write the town's settlement history and district purpose before revising the layout; connect stairs to meaningful terraces, entrances to clean paths, and activities to believable daily routines.
- Build original GameForge layouts and assets using these games as reference inspiration.
- FFVI reference map collection: https://fantasyanime.com/finalfantasy/ff6/ff6maps.htm
- Stardew reference: https://stardewvalleywiki.com/Pelican_Town

## Delegated asset work

- Character and outfit asset production assigned to Codex task 01a0e95f-cc73-7652-859f-c58b8af6ecd3: main-character base, everyday/fishing/event clothing, and two child NPC designs. That task produces images and an integration guide only; town code and manifest changes stay with this task.

- Home page: show a static full-character image wearing the player's currently equipped outfit. Use the same saved outfit selection as the in-game character.
- Owned home: provide a wardrobe where the owner can store collected outfits and change their equipped outfit. Preserve outfit ownership and selection across sessions.
- Character asset pack needs a consistent static portrait/standing image for each clothing set, matching the playable character. Include wardrobe furniture art and plan for modular outfit expansion.

## Highest priority — town exploration

The user's highest priority is a beautiful town to explore, rich in nature, surprises and reasons to see it all. Use this to rank the entire backlog. Prioritize a coherent story-led layout, attractive scenery, clear walking routes, memorable districts, tucked-away gardens and waterfront places, and discoveries that reward curiosity. Give each district a visual landmark and something worth finding, with glimpses of destinations that invite continued exploration. Keep the grand event square as the civic heart, balanced by intimate natural spaces. Character outfits, wardrobe and other home features remain supporting work after the town experience. Asset production can continue alongside town work. This changes priority; it does not end the current feedback-collection phase or authorize applying each observation immediately.

- Add an attractive lake beyond Orchard Gardens, with natural banks, a sheltered fishing shore and a clear walking approach. Integrate optional fishing through the existing validated catch system; do not invent a separate fish ledger or pretend fishing is active before integration.
- Add a mysterious rundown mansion, partly concealed by trees and reached by a quieter path, as an exploration landmark for a later quest. Keep that quest planned until its dependencies exist; provide an in-world reason for any inaccessible entrance.

- Art-direction correction: current look feels too wedding-like. Reduce floral symmetry, ornamental ceremony and pristine matching decorations. Favor weathered civic stone, timber, lived-in market details, fishing gear and natural greenery. Grandeur should come from scale, architecture and a strong town identity.

## Reviewable update — September 28

Local preview now includes the DDS-led civic square and flavor discoveries, seamless paving and wider routes, varied roofs/homes and inn, a wooded lake/mansion extension, weathered civic assets, shoreline reeds/rocks, playground scenery, selected fenced garden edges, updated fountain motion, solid scenery/furniture footprints, and expanded owner furnishing palette including a wardrobe. Composer layouts save persistently and have matching paving/terrain previews.

Validated: 32 unit/recovery checks, isolated town integration, fishing recovery integration, browser lake route, and Composer save/reload. GitHub review: https://github.com/jgarne1/gameforgeAI/pull/2.

Still pending: lake catch gameplay, mansion quest, playground children/activity claiming and occupancy, wardrobe outfit storage/equipping, home-page character outfit display, final walking-frame refinement, full terrace/door/pet animation visual polish, and multiplayer capacity verification. Continue prioritizing beautiful exploration over secondary features.

## Town HUD — next playtest pass

- Onscreen controls occupy too much of the exploration view. Reduce the HUD footprint.
- Automatically hide the walking/control instruction banner a few seconds after the town finishes loading; retain an accessible Controls/Help entry to recall it.
- Study Rise of Kingdoms' expandable menu interaction as inspiration for a compact collapsible menu. Keep primary exploration controls accessible; place secondary destinations and editor/account tools in the expanded menu.
- Move the minimap to the top left, with a compact title or district label that does not overlap it.
- Proposed Leave treatment: put an explicit Return to Home Page action inside the expandable menu. Keep exit easy to find while removing the large persistent Leave button from the view. Keyboard Escape can open the menu; avoid leaving automatically on Escape.
- These observations are queued with the playtest feedback; do not apply them individually until the next pass begins.

- Location overlay: briefly show the town/district name on arrival, then fade it out. Remove the unnecessary descriptive subtitle (such as the layered hub / doors / stairs / homes text). Keep the location available in the menu or map if needed. Queued for the HUD pass.

- Fountain animation bug: added water streams extend below the basin and spill visually over its stone exterior. Align stream outlets and endpoints to this fountain sprite, keep splash/ripple effects inside the actual water surface, and clip water behind the front basin rim. Check at different zoom levels. Screenshot: codex-clipboard-0b8309e1-eaf1-4dd8-8350-89467cffc48d.png.
- Refine the location-title direction: much smaller and less prominent, near the top center, with subtle translucent styling and minimal/no panel background. Briefly appear on arrival then fade away. Remove the descriptive subtitle entirely. Do not keep the current large opaque top-left card.

## HUD and fountain batch — local preview ready
- Collapsed menu with Return to Home Page; Escape toggles menu or dismisses overlays.
- Minimap top left; controls fade after five seconds and return through Help.
- Small translucent centered location name fades; subtitle removed.
- Duplicate leaking fountain streams removed; basin ripples clipped to water.
- 32 existing checks passed. Browser verified menu expansion, Help recall, clean play area and fountain. Awaiting player feedback before deployment.
- Right-facing buildings assigned to the asset task; integration pending asset review.

## Next town layout pass
- Playground: sand surface, slide, jungle gym; retain room for shared rope activity.
- Explore tunnels beneath an actual raised second level with correct occlusion and routes.
- Rework stair placement into connected terraces and believable upper/lower landings; current connections still feel rough.

- Walking: horizontal models glide with one foot extended; vertical frames close but change too slowly. Review actual alternating contacts/passing frames and distance-to-frame cadence together.

- Side-facing walking clarification: arms animate, legs mostly hold the same pose.

September 29 side-walk update: main player now uses opposite foot contacts and passing poses in both horizontal directions. Browser-tested left/right crossing; 50 targeted checks pass. Slight generated body-shape variation remains; NPC/outfit animation matching is still open.
