# Sunny Meadows v3 — Painted Map Gameplay Polish

This pass keeps Ember Hollow intact and upgrades Sunny Meadows as the new top-down painted-map benchmark region.

## Changed direction
- Sunny Meadows uses a handcrafted illustrated world map as the actual playfield.
- The walking character is now a small human explorer and the active pet follows as a companion.
- The pet is no longer forced to be the walking avatar in this region.
- Fishing is now integrated into the world instead of being a separate menu-only activity.

## Gameplay improvements
- Tuned invisible collision zones for water, cliffs, fences, tree trunk, ruins, cave rocks, ocean edge, and bridge rails.
- Added canopy/leaf overlay zones that become semi-transparent when the player walks under them.
- Added animated fireflies near trees, cave edges, and pond/tree areas so the map feels alive.
- Fishing spots are more readable with ripple rings, fish shadows, and proximity labels.
- Fishing interaction is now more skill-based:
  - Cast timing: release in the green zone.
  - Bite timing: press when the float dips.
  - Reel control: hold to reel, release to reduce tension.
  - Fish can slip away if the line is too tight or too slack.

## Design rules for future explorable regions
- Use illustrated world maps as the primary environment layer when possible.
- Place simple invisible collision zones over non-walkable art instead of pixel-perfect collision.
- Only block meaningful obstacles: deep water, cliffs, fences, buildings, trunks, ruins, caves, and hard boundaries.
- Let decorative flowers, grass, small rocks, and soft scenery remain walkable.
- Add animated overlays separately from the background: fireflies, water ripples, leaves, shadows, fish movement.
- Keep UI minimal. The world should communicate where to go and what is interesting.
- Fishing should be discoverable through visible water behavior, not big markers.
- Each region can have fishing, but each region’s fish/water mood should feel different.
