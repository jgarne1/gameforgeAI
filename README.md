# World Boundary Editor

Adds `games/world_editor.html`, a standalone editor for tuning map boundaries.

## How to use
1. Drop these files into the project.
2. Open `/games/world_editor.html` in the browser.
3. Load the Shadow Woods sample JSON.
4. Draw or edit polygons over the background.
5. Export JSON and save it as a region file under `public/assets/worlds/`.

## Controls
- Click points to create a polygon.
- Enter = finish polygon.
- Escape = cancel polygon.
- Drag white handles to reshape.
- Right-click a vertex to delete it.
- Delete/Backspace = delete selected shape.

## Recommended region data model
- `walkable`: areas the player may stand in.
- `blockers`: hard obstacles such as water, trees, rocks, fences.
- `hotspots`: fishing spots, exits, discoveries.
- `foreground`: canopy/fog/fade zones that render above the player.

This lets future maps be tuned by JSON instead of hard-coding boundaries into the engine.
