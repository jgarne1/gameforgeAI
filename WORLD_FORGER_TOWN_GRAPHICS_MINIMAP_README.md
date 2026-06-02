# World Forger Town Graphics + Minimap Drop-in

Replace these files in the repo:

- `games/world.html`
- `games/js/world_engine.js`
- `public/assets/worlds/whisperwind_village.json`
- `data/estate_neighborhoods.json`
- `server.js`

What changed:

- Replaced the weak town scene with an asset-independent canvas town engine.
- Restored a minimap with player, peers, houses, paths, lakes, and camera viewport.
- Built a custom JRPG-style town directly in code so paths, walls, water, bridges, and buildings visually fit together.
- Added multi-level town layout with an upper stone terrace, lower market plaza, residential districts, dock, lakes, stream, shop, tavern, guild hall, town board, lamps, trees, and NPCs.
- Added ten server-backed claimable houses.
- Added house release/sell-back endpoint: `POST /api/estate/neighborhoods/:id/release`.
- Kept multiplayer presence on the existing `worldJoin` / `worldMove` websocket contract.

Controls:

- WASD / Arrow keys: move
- Click: walk toward location
- E: interact
- M: toggle minimap
- Esc: close panel/dialog or leave

Notes:

- The town no longer depends on missing image assets. It draws its own coherent art so the scene should always render.
- Shop, tavern, guild, dock, and house interiors are currently working interaction hooks. The next pass should connect those hooks to full interiors, vendor inventory, furniture placement, and town projects.
