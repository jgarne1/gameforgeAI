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

## PetWorld World Engine v1 Direction

PetWorld is moving toward a reusable top-down painted-map world engine. Ember Hollow remains available as a prototype region, but future explorable areas should be built on `games/js/world_engine.js` when possible.

### Core Rules
- Do not build one-off region engines unless absolutely necessary.
- A region should be config-driven: map image, dimensions, start position, collisions, canopy layers, fireflies/particles, fishing spots, story spots, pickups, and exits.
- The world image is the region. Gameplay is layered on top with invisible collision, hotspots, animated overlays, and lightweight UI.
- Keep UI minimal. The world should communicate through art, movement, particles, water ripples, and companion reactions.
- Fishing is a world-wide system, not a single minigame. Each region can define its own fishing spots and fish tables.
- Build beautiful spaces first, then systems. Avoid cluttering screens with markers, buttons, or quest spam.

### Shadow Woods v1
`world_engine.js` introduces Shadow Woods as the first reusable engine vertical slice:
- Painted map background: `/assets/backgrounds/shadow_woods_map.png`
- Smooth top-down movement with keyboard and click/tap-to-move
- Human explorer controlled by player
- Active pet follows as companion
- Foreground canopy layers fade when walking beneath trees
- Fireflies and drifting motes animate over the map
- Collision zones block water, dense trees, ruins, and boundaries
- Fishing hotspots use cast timing, bite timing, and reel tension
- Server reward completion uses `/api/pet/adventure/complete` with `zoneId: shadow_woods`

### Asset Guidance
For future maps, prefer one large illustrated top-down background. Do not bake moving details like fireflies or fish ripples into the background if they should animate. Put those in engine overlay layers.

Recommended region art prompt:
“Top-down hand-painted fantasy game map, readable walkable paths, clear water edges, distinct landmarks, atmospheric lighting, no characters, no text, no UI, designed as an explorable game background.”
