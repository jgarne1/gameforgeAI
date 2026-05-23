# World Boundary Editor v2

Adds a practical visual editor for map boundaries.

Open: `/games/world_editor.html`

Workflow:
1. Click **Load Shadow Woods**.
2. Edit polygons/circles directly over the map.
3. Drag white vertices to reshape.
4. Click **Export JSON** or **Download**.
5. Replace `public/assets/worlds/shadow_woods_dock.json` in GitHub.

Notes:
- Render/GitHub cannot be directly edited by the browser, so the editor exports/downloads JSON.
- The engine now loads `public/assets/worlds/shadow_woods_dock.json`, so future maps can be tuned without editing engine code.
- Use generous walkable polygons and small blockers. This keeps movement from feeling sticky.
- In the game, press `B` to show boundaries and `R` to reset to spawn.
