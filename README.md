# GameForge AI — PetWorld Adventure v9 Notes

## Ember Hollow v9 direction
Ember Hollow is now treated as the first connected companion-adventure region, not a single long minigame strip.

Core direction:
- Pet is still the controllable character.
- Exploration is room/area based, inspired by classic Metroid/Zelda structure but adapted to PetWorld.
- The world should feel like a place to explore, not a line of random objects.
- Random “press E” lore objects should be avoided.
- Sparks, tools, chests, discoveries, and key pickups should be touch-based when possible.
- Interaction prompts are reserved for sealed paths or major mechanisms only.

## v9 systems added/refined
- Larger connected Ember Hollow layout.
- Additional named rooms and room transition beats.
- Up/down/right passage portals for Metroid-style screen movement.
- Meaningful progression items:
  - Ember Lantern
  - Root Claw
  - Mira’s Ember Charm
- Item-gated paths:
  - Dark Root Veil
  - Root Tangle
  - Guardian Seal
- Meaningful chest/scene discoveries that trigger by touch.
- Less random E prompt clutter.
- Stronger enemy HP balance so enemies should not die in one hit.
- Move-specific combat visuals:
  - fire burst
  - root/earth impact
  - shadow blink
  - dash/strike motion
  - guard shimmer
- Enemy counterattack lunge feedback.

## Future architecture note
The next major architecture improvement should separate zone content from the engine:

```text
games/js/adventure_engine.js
games/adventures/ember_hollow.js
games/adventures/moonlit_marsh.js
```

The engine should eventually only know systems: movement, rooms, portals, combat, pickups, barriers, hazards, and completion. Zone files should define maps, enemies, pickups, story beats, and room layouts.

## Design rule for future chats
Do not add random scattered objects that only say text. Every object should do at least one of these:
- unlock a path
- give a meaningful item
- change the world
- reveal a secret
- trigger a story beat
- introduce a new mechanic
- create a memorable environmental moment


## Tide Pools + Fishing v1
Tide Pools is the second exploration pillar after Ember Hollow. It should feel calm, atmospheric, and discovery-driven rather than menu-heavy.

Implemented direction:
- Tide Pools can be launched from the PetWorld Adventure button when the Tide Pools zone is selected.
- Fishing spots are hidden in-world as water features, not map markers.
- Fishing uses a quick cast → hook → reel/ease loop.
- Rods and lures unlock possibilities, not pure stat bonuses.
- Caught fish are saved through `/api/pet/adventure/complete`.
- Common fish can be sold quickly through `/api/pet/fish/sell`.
- Inventory now separates Pets, Adventure, Fishing, and Collectibles.

Fishing design rules:
- Do not make fishing clunky or menu-heavy.
- Do not add durability, giant bait trees, or complex stat math.
- Fishing should create stories: hidden ponds, rare shadows, tide timing, and journal completion.
- Future tank/aquarium storage should be visual and limited, so rare fish feel meaningful.
- Future cooking can use fish later, but it should stay lightweight and companion-focused.

## Sunny Meadows v1 — Top-Down Quality Benchmark

Sunny Meadows is a separate region from Ember Hollow and is intended to test the newer PetWorld direction without removing the older side-scrolling prototype.

Design goals:
- top-down exploration instead of platforming
- calmer, more polished movement and camera feel
- fishing as a world system, not a single minigame
- hidden ponds and water ripples as natural discovery cues
- minimal UI and no heavy combat loop
- touch/click movement support plus keyboard movement
- completion through `/api/pet/adventure/complete` using `zoneId: sunny_meadows`

New supporting content:
- Sunny Dew collectible
- Meadow Charm key item
- Meadow Reed Rod and Honey Lure
- Sunny Meadows fish: Meadow Darter, Sun Pip, Clover Carp, Brook Blinker, Glass Gill, Honeyfin

Keep Ember Hollow intact for comparison while using Sunny Meadows as the new feel benchmark.
