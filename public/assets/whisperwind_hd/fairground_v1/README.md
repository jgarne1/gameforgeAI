# Lantern Run and wildlife garden assets

These original transparent PNGs are used by the north fairground and southwest wildlife garden in Whisperwind. The scene data is authored in `scripts/build_whisperwind_expanded.py`; run it and then `scripts/promote_whisperwind_layout.py` after editing placements. `games/js/town_attractions.js` draws the art and coaster animation in both the game and World Composer.

- `lantern_run_station.png`: 1536×1024 RGBA. Rendered at world x=3650, y=1045, width=720, height=475. It contains the ticket booth, roof and queue railings. The board marker and structural collision are independent scene data, so move them with the art.
- `wildlife_animals.png`: 1774×887 RGBA. Deer source rectangle (0,0,590,887); capybara (590,0,591,887); owl (1181,0,593,887). Their positions and rendered sizes are in `scene.attractions.zoo.pens` and `games/js/town_attractions.js`.

Keep both images transparent and do not stretch individual animal cells. Recheck the platform edge, boarding marker, fences and path approaches at normal game zoom after changing art. The coaster track and cart are drawn in code; its tunnel intentionally hides the cart while it passes through. The current zoo interaction is reading the enclosure signs; animal animation and care gameplay are future additions.
