# PetWorld Animation Controller v2.9

Drop-in files:
- `games/petworld.html`

Fixes:
- Feed/Play jump sprite no longer briefly blanks or partially disappears during the swap.
- Sprite existence checks now preload the exact URL used by the renderer.
- The first jump frame is painted before the still image is hidden.
- Still-image fallback remains unchanged when sprite sheets are missing.

Sprite convention remains:
- `/assets/pets/{species}/sprites/{stage}_idle.png`
- `/assets/pets/{species}/sprites/{stage}_walk.png`
- `/assets/pets/{species}/sprites/{stage}_jump.png`

Default sheet layout remains 5 columns x 5 rows / 25 frames.
