# World Forger Town Engine Drop-in

This drop-in replaces the weak/hard-coded town layer with a playable first version of Whisperwind Village.

## Files changed

- `games/world.html`
  - Loads Whisperwind Village by default.
  - Boots the new `GameForgeTownEngine`.

- `games/js/world_engine.js`
  - New canvas-based playable town engine.
  - Multi-level town layout: upper Echo Hall terrace, central plaza, market/tavern lane, residential rise, and river dock.
  - WASD / arrow movement, camera follow, collision, click-to-walk, interaction prompt, NPC dialogue, shop/tavern/dock hooks, housing UI, and multiplayer world socket reuse.

- `public/assets/worlds/whisperwind_village.json`
  - Data-driven town content.
  - Contains buildings, player houses, NPCs, decorations, and interaction metadata.

- `data/estate_neighborhoods.json`
  - Expanded starter neighborhood from 6 to 8 named houses.
  - Preserves existing ownership where possible.

- `server.js`
  - Expands default estate plots to 8 named cottages.
  - Adds `POST /api/estate/neighborhoods/:id/sell` so a player can release/sell their house back to available status.

## Test path

1. Replace the files above.
2. Start the server.
3. Open the World game.
4. Walk with WASD / arrows.
5. Press `E` near NPCs, shops, tavern, homes, town board, fountain, and dock.
6. Press `H` to open the housing list.
7. Claim one available house.
8. Refresh and confirm ownership persists.
9. Open another browser/user to confirm multiplayer presence still appears.

## Current limits

- Houses open a placeholder interior panel, not a full interior map yet.
- Shop/tavern/dock are interactive hooks, not fully connected to existing inventory/fishing systems yet.
- The town is canvas-drawn with existing assets plus procedural terrain. It is intentionally playable now and DB-friendly later.

## Next best step

Build full enterable interiors for claimed houses and the tavern. The current engine already has the hooks needed for this.
