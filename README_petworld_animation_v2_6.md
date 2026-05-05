# PetWorld Animation Controller v2.6

Drop-in file:
- `games/petworld.html`

## Behavior change
- Autonomous sprite behavior now only chooses between `walk` and `idle`.
- `walk` is most common, controlled by `PET_ANIM.behavior.walkChance`.
- `idle` is occasional, controlled by `PET_ANIM.behavior.idleMinMs` and `idleMaxMs`.
- `jump` no longer happens randomly.
- `jump` is only a player reaction for Feed and Play.

## Sprite paths
Optional sprite sheets still use:

```text
/assets/pets/{species}/sprites/{stage}_idle.png
/assets/pets/{species}/sprites/{stage}_walk.png
/assets/pets/{species}/sprites/{stage}_jump.png
```

If a sheet is missing, PetWorld falls back to the existing still-image look.

## Tuning knobs
Look for `var PET_ANIM` near the top of the script:

```js
behavior:{walkChance:.78,idleMinMs:1800,idleMaxMs:3400},
reactionMs:{jump:950,feed:2700,play:1200}
```

Increase `walkChance` if pets idle too much. Lower it if they walk too constantly.
