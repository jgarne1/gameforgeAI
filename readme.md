# GameForge AI — PetWorld Living Adventure Notes

## Current direction
PetWorld is evolving from a simple companion/battle screen into a living pet-life adventure experience.

Core design pillars:
- Pets are companions first, battle units second.
- Battle is important, but it should be about tournaments, danger, rivals, and story moments — not the main grind.
- Progression should come from multiple valid paths: care, bonding, scouting, interactive adventure, collections, discoveries, future fishing, crafting, story, and social systems.
- Activities should feel like locations and events inside the same world, not disconnected mini-games.
- Prefer reusable systems over one-off feature files.

## Current PetWorld files touched by this milestone
- `games/petworld.html`
- `games/js/adventure_engine.js`
- `server.js`
- `data/items.json`
- `readme.md`

## Adventure vs Scout split
PetWorld now supports two related exploration styles:

### Scout Zones
The older quick exploration system is intentionally preserved as **Scout**.
- Pet goes alone briefly.
- Burns energy.
- Uses `/api/pet/explore-zone`.
- Gives light server-authoritative rewards.
- Good for daily play and quick stamina use.

### Interactive Adventure
The new Adventure mode starts with **Ember Hollow**.
- Player and pet enter a small interactive zone together.
- Client handles movement, collectibles, interactions, and feel.
- Server owns final rewards through `/api/pet/adventure/complete`.
- Rewards currently include coins, XP, bond/affection, discoveries, and `ember_shard` materials.
- This is the foundation for future fishing, caves, ruins, platformer-like zones, story quests, and seasonal areas.

Important: Adventure is not a separate room game. It is a PetWorld mode powered by a reusable engine.

## Adventure Engine v1
File:
- `games/js/adventure_engine.js`

Responsibilities:
- Render an immersive adventure overlay.
- Support player movement, jumping, pet following, collectibles, interactables, prompts, and return-home flow.
- Return a compact payload to PetWorld when the player completes the activity.

Non-responsibilities:
- Do not permanently mutate profile data client-side.
- Do not grant final rewards directly.
- Do not become a disconnected mini-game launcher.

Server endpoint:
- `POST /api/pet/adventure/complete`

The server validates and caps rewards. Client-reported collectibles are treated as requests, not truth.

## Ember Hollow v1
Purpose:
- First vertical slice of the living-world direction.
- Proves that PetWorld can support story, collection, discovery, companion presence, and rewards without battle spam.

Current content:
- Ember shard collectibles.
- A scout NPC.
- A sign.
- A relic discovery.
- A hidden cache discovery.
- Return Home reward flow.

Do not overbuild Ember Hollow before the framework feels good.

## Items added
- `ember_shard`: common material from Ember Hollow.
- `ancient_fragment`: reserved story/crafting material for future adventure discoveries.

## Long-term pet scale
Target scale is around 100 total pets, released over time through story/world updates.

Do not design this as 100 hard-coded creatures. Design species as data-driven companions with shared systems.

Future species data should eventually support ideas like:
- `id`
- `name`
- `type`
- `rarity`
- `biome`
- `temperament`
- `movementStyle`
- `idleStyle`
- `explorationTraits`
- `favoriteActivities`
- `evolutionRules`
- `discoveryRegion`
- `releaseWave`

Pets should be ecological. New pets should enter through regions, events, discoveries, eggs, fishing, or story waves — not random patch dumps.

## Future release philosophy
Release pets in world/story waves.

Examples:
- `The Marsh Awakening`: adds Moonlit Marsh, fishing, swamp eggs, glowing fish collection, marsh-native pets.
- `The Frozen Tide`: adds icy shoreline, frozen relics, winter fishing catches, cold-native pets.
- `The Crystal Deep`: adds cave adventure routes, mining, crystal pets, relic crafting.

This keeps collection tied to the story.

## Sprite and animation philosophy
The old sprite convention was useful but is not permanent. It can change if the new structure is better.

Current supported/fallback behavior:
- PetWorld still supports current still images and existing sprite sheets.
- Adventure v1 gracefully falls back to still pet image or emoji.

Preferred future sprite contract to discuss before mass-generating pets:

```text
/assets/pets/{species}/sprites/
  baby_idle.png
  baby_walk.png
  baby_jump.png
  baby_happy.png
  baby_sleep.png
  baby_react.png
  young_idle.png
  young_walk.png
  young_jump.png
  young_happy.png
  young_sleep.png
  young_react.png
  adult_idle.png
  adult_walk.png
  adult_jump.png
  adult_happy.png
  adult_sleep.png
  adult_react.png
```

Optional future activity-specific sheets:

```text
  {stage}_fish.png
  {stage}_dig.png
  {stage}_hit.png
  {stage}_cast.png
  {stage}_celebrate.png
  {stage}_hurt.png
```

Do not require every pet to have every animation immediately. Use graceful fallback.

## Behavior personality direction
Pets should look and feel different through shared behavior modifiers, not hard-coded unique engines.

Separate:
- Animation state: idle, walk, jump, happy, sleep, react, fish, hit.
- Behavior state: curious, playful, timid, lazy, protective, energetic.

This allows 100 pets to feel varied without requiring 100 custom code paths.

## UI philosophy
- PetWorld should stay pet-first.
- Avoid piling important gameplay into scroll-only panels.
- The main stage should feel alive.
- Activities should open as immersive overlays or world spaces, not disconnected button spam.
- The home/index level should eventually become a living player base, not just navigation.

## Pushback rules for future chats
Future assistants should push back when a request would:
- make battle the only meaningful grind;
- add disconnected mini-games instead of reusable activities;
- hard-code a pet-specific system that should be data-driven;
- bury core actions in cluttered menus;
- break server-authoritative progression;
- preserve old README rules only because they existed.

The README is a living architecture document. Edit or delete old sections when the game direction improves.
