# World Forger Player Context Drop-in

This pass makes World Forger use the same player data as the rest of GameForge instead of feeling like a disconnected mini-game.

## Added APIs

- `GET /api/world/context?user=<username>`
  - Returns safe account identity, display name, coins, inventory, active pet, pet roster summary, owned homes, and world flags.
- `POST /api/world/open-chest`
  - Opens a chest/pot object from a scene once per user and writes rewards to the same pet profile inventory/money store used by PetWorld and Market.

## Client behavior

`games/js/world_engine.js` now:

- Loads the real GameForge username from `GAME_CONTEXT` / `localStorage.gf_user`.
- Fetches `/api/world/context` on world entry.
- Shows player display name, coins, active pet, item count, and owned home in the world HUD.
- Refreshes context after claiming a home or opening a chest/pot.
- Sends display name / basic appearance metadata through world WebSocket presence.
- Keeps using existing estate ownership APIs for homes.

## Why this matters

World Forger should not have its own separate economy, pets, or player identity. A player entering Whisperwind should still be the same GameForge player with the same:

- Name/display name
- Coins
- Items
- Pets
- Active pet
- Owned homes
- World flags/chest rewards

## Scene authoring notes

For signs/chests/pots in Composer or scene JSON:

```json
{
  "id": "chest_tavern_alley_01",
  "asset": "PROP_CHEST",
  "x": 1000,
  "y": 900,
  "interactive": true,
  "interactionType": "chest",
  "itemId": "bait_basic",
  "quantity": 3,
  "label": "Old Chest"
}
```

For signs:

```json
{
  "id": "sign_plaza_01",
  "interactive": true,
  "interactionType": "sign",
  "text": "Welcome to Whisperwind."
}
```

For homes, keep using estate plot IDs:

```json
{
  "type": "home",
  "plotId": "riverbend_cottage",
  "neighborhoodId": "whisperwind_01",
  "targetScene": "riverbend_cottage_interior"
}
```
