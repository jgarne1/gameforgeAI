# World Forger art direction

The owner approved an original detailed HD pixel-art Whisperwind direction on 2026-09-28, replacing the previous vendor-first artwork policy. Read [the editing workflow](docs/art/WHISPERWIND_HD_ASSET_WORKFLOW.md) and [AI_README.md](AI_README.md).

- Fixed elevated orthographic JRPG view; no camera rotation.
- Warm stone, dark timber, terracotta/burgundy roofs, amber windows, teal water and green foliage.
- Use independent transparent objects/atlases, explicit source rectangles, consistent world scale and upper-left lighting.
- The first original pack lives at `public/assets/whisperwind_hd/v1/manifest.json`; shared atlas rendering is in `games/js/whisperwind_assets.js`.
- Review assets in actual gameplay, not just full-resolution generation previews. Animation frames, alpha edges and texture seams require review.
- Replace legacy artwork by district after reference checks. Preserve account data, owned pets/homes and stable story/content identifiers.
- Full town layout must support at least 20 players plus NPCs across connected districts. The first waterfront is a prototype, not a capacity benchmark.
