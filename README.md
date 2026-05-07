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
