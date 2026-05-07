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

## Ember Hollow v1/v2 history
Purpose:
- First vertical slice of the living-world direction.
- Proves that PetWorld can support story, collection, discovery, companion presence, and rewards without battle spam.

v1 content:
- Ember shard collectibles.
- A scout NPC.
- A sign.
- A relic discovery.
- A hidden cache discovery.
- Return Home reward flow.

v2 expands this into a longer side-scrolling adventure with a clear goal, hazards, platforms, a root-gate puzzle, stronger story discoveries, and better reward reporting.

Do not expand into fishing, crafting, housing, or more zones until the side-scroll framework feels good.

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


## Ember Hollow v2 — side-scroll gameplay prototype
Ember Hollow has moved from a proof-of-direction prototype into a longer side-scrolling mini-adventure.

Current v2 goals:
- Give the player a clear objective: reach the Ember Tree.
- Keep the tone cozy, but add light tension through hazards.
- Add puzzle progression without heavy quest-log complexity.
- Make the pet feel present through following, alert behavior, and story reactions.
- Keep rewards server-authoritative.

Current Ember Hollow v2 content:
- Longer horizontal route.
- Clear objective text in the adventure HUD.
- Ember shard collection.
- Root Gate puzzle requiring 3 ember shards.
- Light hazard dodging with emberfalls and thorn patches.
- Platform/ledge traversal.
- Faded Ember Relic discovery.
- Hidden Root-Tucked Cache discovery.
- Ember Tree story discovery.
- Return Home reward flow with stats for goal reached, puzzles solved, and hazards hit.

Important design decision:
- The main wilderness/exploration layer should lean side-scrolling because it keeps pets readable, supports animation personality, and creates cinematic region atmosphere.
- This does not ban other modes. Short top-down RPG-like micro-adventures, shrine puzzles, indoor scenes, festivals, and special events are encouraged when they are launched as story/activity instances inside the same world.

## Adventure structure going forward
Avoid creating many unrelated mini-game files. Instead, build world activities as reusable activity instances.

Preferred layering:
1. Home/index as living player base.
2. PetWorld as companion care and world access.
3. Side-scroll regions for main exploration.
4. Activity instances for special gameplay styles:
   - fishing
   - top-down shrine puzzles
   - short RPG scenes
   - festivals
   - caves
   - memory sequences
5. Battles for rivals, tournaments, danger, and story moments.

All activities should share:
- active pet
- inventory
- discoveries
- bond/affection
- currencies
- server-authoritative rewards

## Sprite needs after Ember Hollow v2
No new sprite sheet is required immediately because Adventure v2 still falls back to the active pet image or emoji.

Recommended next sprite sheets before heavy content expansion:
```text
{stage}_idle.png
{stage}_walk.png
{stage}_jump.png
{stage}_react.png
{stage}_happy.png
{stage}_hurt.png
```

Later activity sheets:
```text
{stage}_fish.png
{stage}_dig.png
{stage}_hit.png
{stage}_cast.png
{stage}_celebrate.png
```

Do not generate all 100 pets before the contract is stable. Use a few pets first, verify the motion language, then batch-generate by release wave.

## Ember Hollow v3 — pet-first gameplay correction
Ember Hollow v3 corrects the main identity problem found during testing: the human should not be the controllable character in the main PetWorld wilderness adventure. The active pet is now the playable character.

Current v3 goals:
- Make the pet the center of control, camera focus, animation, collision, and feedback.
- Remove the human avatar from the main side-scroll adventure mode.
- Make solid platforms readable and actually landable.
- Make collectibles obvious: bright sparks collect automatically when touched.
- Make interactables obvious: signs, relics, chests, and gates glow/highlight when nearby and use E/tap.
- Improve moment-to-moment feedback with popups, particle bursts, landing squash/stretch, hazard stumble feedback, and clearer objective text.

Important gameplay readability rules added in v3:
- Decorative background objects must not look collectible.
- Collectibles should glow, pulse, and collect on touch.
- Interactables should use a clear “Use E” / nearby highlight language.
- Platforms that are gameplay surfaces should have clear orange tops, shadows, and consistent collision.
- Hazards should be visibly different from background decoration and should give immediate feedback when touched.

Current v3 content/behavior:
- Pet is directly controlled.
- No human avatar is rendered in Ember Hollow.
- Orange-topped ledges are solid and can be landed on.
- Ember sparks magnetize slightly and collect on touch.
- Root Gate puzzle still requires 3 sparks.
- Objects highlight when nearby and can be activated with E/tap.
- Hazards cause a forgiving stumble/knockback instead of death.
- Return Home still sends a compact payload to the server; server rewards remain authoritative.

Future mode note:
The main wilderness adventure should remain pet-first. A future special top-down puzzle or shrine mode may allow swapping between the human/player and pet, but that should be treated as a specific activity instance, not the default PetWorld exploration identity.
