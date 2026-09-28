# Whisperwind town build — September 28, 2026

This is an expanded playable town implementation on the recovery draft branch. The first expanded town was merged for deployment. It is not a capacity certification or the full DDS campaign. Read TOWN_CHARACTER_AND_ROOFS.md for the subsequent landscape and housing pass.

## Playable content

The existing `whisperwind_hd_waterfront` ID now holds a 5200 × 3700 hometown with residential streets, market/plaza, tavern, Pet Center, bakery, Echo Hall, fishing outfitter and river quay. Twenty-four new `town_home_XX` addresses coexist with all existing plots. Landmark doors have return points; owned homes instantiate `home__<plotId>` interiors. Click movement finds a walkable route around blocked geometry; keyboard movement remains direct. Fountain ripples, chimney smoke, lantern glow, tree sway and water provide ambient motion. Dog and cat window overlays use a separate sprite atlas and clipped openings. Reduced-motion settings stop ambient cycles.

Three distinct authored residents are Mira, Toma and the Dockmaster. Directional walk sheets are independent from identity and dialogue. `routine.points` contains bounded walking/waiting positions and facing; the runtime checks collision before every step and pauses a conversing resident. Town Guide’s Meet buttons let a resident wait while the player walks over, avoiding a chase for an introduction. These are local presentation routines, not a synchronized NPC simulation or economy.

“A Place to Begin” remembers three introductions in `profile.world.townWelcome`. It is a small belonging story consistent with the DDS, without rewards, entitlement changes, or main-campaign chapter claims. The full C0 delivery/pet/companion sequence remains separate work. The old dock hammer mark hints at the wider canon.

## Ownership and economy

`lib/town_housing.js` validates actions. One first unowned town home is a free newcomer grant per account. Further homes cost their configured price. Public address availability does not implement the DDS's future unlimited private starter-home entitlement: when all 24 new addresses are occupied, add addresses or implement that separate entitlement. Existing owned homes and pets are preserved.

An owned home is unavailable unless its owner creates a listing. Only the current owner may list, cancel, decorate or select residence. A successful sale clears the listing and transfers existing coins to the seller; a resale never uses the newcomer grant. Multiple homes are allowed. Simultaneous requests run synchronously through one transaction; `DATA/town_transaction.json` is an atomic roll-forward journal linking the estate and pet-profile writes. Recovery completes a pending transaction on startup or the next town read/action. Back up the persistent DATA folder before deployment.

These new mutations use an HttpOnly, SameSite=Strict session cookie issued by successful existing login/registration. Sessions expire after eight hours or server restart, and password changes invalidate them. Shell logout revokes the town session. Browser-supplied usernames/prices never authorize ownership or set purchase cost. Home HTTP and WebSocket access validate privacy against the session identity. Legacy estate claim/release endpoints cannot bypass ownership; they direct players to Hometown. Broader legacy API/WebSocket authority issues documented by the DDS audit remain separate P0 work.

## Customization

`games/home_editor.html?plot=<owned plot>` supports up to 80 approved furnishings, drag placement, selection, resize, quarter-turn rotation, removal, oak/walnut/stone floor, four wall colors, three exterior facade styles, four accents, a short escaped welcome sign, and visitor privacy. The server strips unapproved fields/assets and rejects entrance-center placements. Decorations are per address and persist through reload/ownership transfer. Solid furnishings now use bottom footprints through the existing object collision feature; rugs remain walkable. Keep paths to the exit clear. Exterior changes do not change lot collision or entrance position.

World Composer's **NPC Skins** button opens `games/town_npc_admin.html`. An authenticated world editor admin selects scene, resident and skin, previews four directions, and saves. `DATA/town_npc_skins.json` stores overrides independently from scene files, so changes survive a deployed asset update. Add future skins to `npc_skins.json` using the same source/frame contract; do not rename NPC IDs to change appearance.

## Fishing shop

River Tackle uses canonical `data/shops.json` prices and `data/items.json` definitions. Authenticated town purchases update the existing coin balance and inventory. Its starter assortment is collectible tackle; equipment modifiers and bait consumption are explicitly not active yet. The shop and quay lead to the recovered Shadow Woods fishing system. Catches still persist through its existing fishing API. No second fish currency is introduced.

## Validation and remaining work

26 unit/recovery tests cover parsing, source bounds, grounded movement, default hometown, housing protection/resales/grants/decor validation, every public entrance's route, and NPC collision/pause behavior. Isolated local integration checks cover authentication/spoofing, cancelled listings, two competing buyers, exact coin transfer, private HTTP/socket access, saved decoration, shop purchases, admin denial, introductions and logout. Recovery integration covers catches, geometry round trips and 27 game URLs. Browser checks cover town navigation, house claim/entry/editor save/reload, shop access, and persisted NPC appearance choices.

Still required: 20-client load validation, additional NPC activities and stories, individual equipment effects/balance, unlimited private starter-home entitlement, outfit customization, account pet followers, richer architectural variation, and a polish pass on source-frame consistency/seamless terrain. Do not report those as implemented.

