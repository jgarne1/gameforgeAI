# Two-mouth grotto

`two_mouth_grotto.png` is original transparent pixel art for the Lantern Run tunnel. It has a distinct right entrance and left exit, joined by one rocky ridge. The artwork is drawn at 600×295 world units around the tunnel anchor in `scripts/build_whisperwind_expanded.py`. Its mouth anchors are x=4400 and x=4820 with projected rail height y=465. The short approach rails draw in front of the rocky facade, while the cart is clipped at those mouth edges and passes behind the grotto. Keep the mouth anchors and track heights together when editing. Use `spawn=cave` in the expanded scene to inspect the alignment in game.

The station approach and BOARD marker are also authored by that script. Keep the returning track east of the station's roof, the dock at its right platform edge, and the boarding hotspot on the public road. Regenerate the expanded and default scene JSONs after changes and verify boarding from the fair spawn in the browser.
