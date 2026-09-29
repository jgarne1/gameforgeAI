# Playground completion v1

Ready for static scenery integration. Original PNGs are unchanged; exact prompts are adjacent *_prompt.txt files. metadata.json supplies measured source rectangles, display sizes, bottom-center ground origins, alpha measurements, SHA-256 hashes, and collision/layering notes. review.html renders props over light/dark floors and repeats sand 4 by 3.

Visual QA: slide, cubic jungle gym, empty swing and open entrance pieces remain legible at proposed sizes, with clean transparent backgrounds. Sand repeats without a conspicuous straight join at 256 units; its edges are not pixel-identical, so exact seamlessness is not certified. Entrance arms have slightly different heights; these are independent placements, not a seamless fence module.

Place the entrance arms separately at -115 and +115 world units from the entrance center. Each solid arm is 70 units wide, leaving a measured 160-unit central aisle. Never use the combined source as a single scaled entrance.

Use small structural ground contacts only for prop blockers; keep the gym interior, swing approach, ladder approach and chute landing clear. The metadata does not contain tested runtime collision polygons. Slide and jungle gym require authored near/far silhouette masks for child occlusion and separate climb/interaction logic. No pre-split layers, rider poses or animation are supplied. Do not infer a walkable roof from overhead gym rungs.

This pack supplies static art only. The integrating repository owns final collision footprints, occlusion masks, route verification and publishing.
