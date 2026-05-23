# Shadow Woods Fishing Dock Vertical Slice

This build introduces the new reusable painted-scene world engine direction for PetWorld.

## Changed files
- `games/js/world_engine.js`
- `games/petworld.html`
- `public/assets/backgrounds/shadow_woods_fishing_scene.png`
- `public/assets/sprites/wanderer_sheet.png`
- `README.md`

## Current playable slice
Shadow Woods is intentionally a small vertical slice:
- one beautiful fishing pond/dock scene
- path and dock walking only
- no pet follower in this scene
- player-controlled wanderer sprite
- clean terrain background with UI rendered by code
- animated fireflies, water glow, motes, mist
- dock fishing interaction

## Controls
- WASD / Arrow Keys: move
- Click/tap valid ground: walk there
- E or Space near dock: begin fishing
- Hold/release Space or mouse: cast / reel
- Esc: cancel fishing or leave

## Engine rules going forward
1. Background art is environment only: no baked HUD, no baked character, no baked prompts.
2. UI is always rendered by the engine.
3. Player and fishing pole are sprite/engine layers.
4. Regions are painted scenes plus collision/hotspot configs.
5. Build one beautiful playable slice before expanding map size.
6. Fishing should feel atmospheric first, system-heavy later only if needed.

## Sprite sheet note
`wanderer_sheet.png` is processed from the user-provided sprite sheet with black background removed. It is usable for prototype testing, but a clean transparent 768x1536 sheet with 128x128 frames remains preferred later.
