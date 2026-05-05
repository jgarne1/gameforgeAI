# GameForge AI — AI Maintainer Contract

This README is for AI/code assistants. Treat it as the project contract before changing files. The user commits and deploys; AI writes drop-in files, plans risky changes first, and preserves working systems.

## Current stack

- Backend: `server.js` using Node, Express, and WebSockets.
- Frontend: vanilla HTML/CSS/JS.
- Hosting: Render.
- Version control: GitHub.
- Current persistence: JSON files in `data/`.
- Long-term direction: move JSON persistence to a database. New code should avoid hard-coding file-specific assumptions into UI/game logic and should keep data access patterns DB-migration-friendly.

## Project structure

```txt
server.js                  Main Express/WebSocket server and API layer
public/index.html          Main GameForge shell, home, nav, social/mail/friends, iframe host
public/admin.html          Admin tools and live home announcement editing
public/assets/             Pet/item/game art assets

games/launcher.html        General multiplayer room/table launcher
games/battlehall.html      Public Pet Battle matchmaking hall
games/petbattle.html       Locked Pet Battle gameplay screen
games/petworld.html        Pet care/growth/home system
games/market.html          Marketplace and shops
games/inventory.html       Player inventory/backpack page
games/*.html               Other mini-games loaded by launcher/index iframe

data/users.json            Login/account data
data/admins.json           Admin access
data/social.json           Friends/mail/social data
data/items.json            Item definitions
data/shops.json            Shop definitions
data/pet_species.json      Pet species definitions
data/pet_moves.json        Pet move definitions
data/announcements.json    Home/admin team announcement board
data/game-meta.json        Game metadata/cache-style info if present
```

## User collaboration rules

- Provide full drop-in files or a zip containing only changed files whenever practical.
- Ask for the current file before generating replacements unless the user says the uploaded zip is current.
- The user prefers step-by-step collaboration: discuss design before coding when systems are unclear or risky.
- Push back on weak design or implementation choices when they would hurt AAA polish, mobile usability, security, or future maintainability.
- Do not flood the user with many unrelated next steps. Keep scope tight.
- When changing architecture, major flows, or AI handoff rules, update this README.

## Absolute “do not break” rules

Do not break or remove:

- Login/register/logout.
- Admin access.
- WebSocket rooms/seats/chat/game iframe loading.
- Launcher room lifecycle.
- Marketplace APIs.
- Pet APIs.
- Social/friends/mail systems.
- Battle Hall matchmaking.
- Server-locked Pet Battle instances.

If a change touches one of these systems, trace the current code first and keep the public contract compatible.

## UI/UX direction

The game should feel polished, accessible, immersive, and playable in a normal browser and Tesla browser passenger use.

General UI principles:

- Avoid duplicate buttons that do the same thing in too many places.
- Favor clear hierarchy over adding more panels.
- Main experience should be center stage; supporting panels should not dominate.
- Keep core actions visible and tappable.
- Design desktop and mobile intentionally; do not simply shrink desktop layouts.
- Use mobile-specific stacking, sticky inputs, drawers, or compact panels when needed.
- Test major flows mentally or locally on phone-sized widths.

Mobile must be considered for:

- Home.
- Play launcher.
- Pet World.
- Battle Hall.
- Mail/Friends.
- Marketplace.
- Pet Battle result/forfeit/exit flows.

## Main shell and iframe contract

`public/index.html` is the main shell. It hosts games inside `#gameFrame` and launcher inside `#launcherFrame`.

Important shell rules:

- `Play` loads `/games/launcher.html`; launcher owns general table/game-list UI.
- Pet World, Marketplace, Inventory, Pet Battle, and Battle Hall may be loaded as direct iframe pages.
- Child games may receive context with:
  - `GAME_CONTEXT`
  - `GAME_PLAYERS`
  - `GAME_MY_SEAT`
- Iframe games may post `parent.postMessage({type:'move', data}, '*')` for launcher-wrapped multiplayer games.
- Pet/market/inventory pages should post `parent.postMessage({type:'petUpdated'}, '*')` after actions that change pets, coins, inventory, eggs, or related account state.
- Every full-screen or modal game state must provide a safe path back to the hub/home.

## Pet system rules

- Pets have stats, levels, type/species, rarity, growth stage, and possible future traits/bonds.
- Pet records should store move IDs only, never full move definitions.
- Move definitions come from `data/pet_moves.json` or server fallback defaults.
- Future pet systems should support growth/evolution, bonding, care history, and battle-relevant but fair progression.
- Avoid client-authoritative stat changes. The server must validate gameplay-affecting changes.

## Item, inventory, and shop rules

- Item definitions belong in data-backed structures such as `data/items.json` and `data/shops.json`.
- Do not hard-code long-term item lists directly into server route logic or frontend screens if avoidable.
- Future DB migration should be easy: keep item lookup and inventory mutation centralized.
- Battle Hall inventory is currently view-only for fairness. Using items in battle prep requires careful server snapshot timing.

## Marketplace rules

- Marketplace transactions must be server-validated.
- Never trust client-supplied price, ownership, quantity, or seller/buyer identity without server checks.
- Marketplace and shops should show item images when available.

## Battle system rules

The battle system must be server-authoritative.

- Battles are created as battle instances.
- Pets are locked using server snapshots when players ready/start through the approved flow.
- Prevent pet swapping, stat tampering, unauthorized entry, and replaying stale battle results.
- Battle endings are server-finalized for locked battle instances.
- Forfeit is a battle event, not a simple UI exit.
- Results should display to both players.
- Rewards must be granted by the server.
- Forfeit rewards should scale by progress so early quitting cannot be farmed.

## Battle Hall rules

`games/battlehall.html` is the public matchmaking lobby for Pet Battle.

Current intended flow:

1. Player enters Battle Hall while logged in.
2. Player chooses a battle-eligible pet.
3. Player sits at a public table.
4. Player clicks Ready.
5. Server locks the selected pet snapshot.
6. When both seats are ready/locked, either player can start.
7. Server creates a private Pet Battle instance.
8. Both players receive the private battle URL and join the locked battle.

Battle Hall UX goals:

- Battle tables are the main “arena floor.”
- Chat is a right-side lobby console replacing the old Battle Rules panel; rules should not consume persistent screen space.
- Desktop should fill the iframe/screen with no dead black space.
- Mobile should stack into a usable one-column flow with large tap targets.
- Chat must support button send and Enter-to-send, show more than one line/history on desktop, and remain reachable on mobile.
- Hall chat is temporary lobby ambience and coordination, not permanent mail/history.
- Do not re-add a large permanent Battle Rules panel; if rules are needed later, use a compact help affordance/modal.

## Social/friends/mail rules

- Social data lives in `data/social.json` for now.
- Mail is thread-based and grouped by participants and type (`chat`, `battle`, `trade`, `system`).
- Max 25 threads per user; oldest are auto-deleted silently.
- Users should be able to mail anyone by typing a username.
- Friends list should show online status and support profile view + mail button.
- Live battle challenges are WebSocket-driven and temporary; permanent battle mail is optional history only.

Friend challenge expectations:

- A user can have only one outgoing and one incoming live challenge at a time.
- Live challenges expire after 60 seconds.
- Challenge is blocked if either player is already in battle.
- Accepting a challenge creates a private server-locked battle instance.
- Incoming challenge should open a modal immediately, while header alert remains available if dismissed.
- Challenger waiting state should show in the top header and allow cancel.
- Accepting should auto-load both players into the created battle instance.

## Admin and announcement board rules

- Admin tools should be usable by non-coding admins/artists.
- The Home Team Note / announcement board is stored in `data/announcements.json`.
- Admin announcement editing should not require code/repo knowledge.
- README can be aggressively rewritten to help future AI; it is not user-facing product documentation.

## Current known design direction / roadmap

Near-term priorities:

- Polish Battle Hall into a premium public lobby.
- Fix and standardize game launcher + individual game integration.
- Improve Pet Battle pacing, item usage, rewards, and result handling.
- Add friends list, online status, profile view, and mail integration.
- Build admin-friendly asset assignment/upload workflows.

Future roadmap:

- SQLite/Postgres migration.
- Ranked/unranked Pet Battle.
- Spectating or active-duel panels.
- Battle invites and friend challenges deeply integrated with social.
- Pet growth/bond/evolution systems.
- Backpack limits and battle-prep item choices.
- Artist/admin asset tooling.


### Battle Hall polish note — compact side rail

The Battle Hall right rail should prioritize live multiplayer awareness over static instructions.

Current side rail direction:

- `Your Status` should stay compact. It is a quick personal summary, not a large dashboard.
- Remove filler/explainer copy under `Your Status`; the global shell already provides account context.
- The attendee list should be labeled `Battle Hall Attendees`, not `Online Battlers`, because it represents presence in this specific lobby.
- Attendees should show lightweight activity status when possible: `Browsing`, `Seated`, or `Ready`.
- Chat remains the primary right-side panel and should have enough visible message history to feel like a live lobby console.
- Do not re-add a large persistent rules panel. Rules/help can become a compact tooltip, modal, or help button later.

## Admin Game Editor UX Notes

- Keep the Game Editor lightweight unless explicitly asked for a larger schema redesign.
- Game metadata fields should include visible labels and short helper text because admins may not know the difference between display names, ids/slugs, file names, seats, and unlock prices.
- The Current Games list should scroll independently so the Game Details and Upload HTML panels stay visible while admins browse existing games.
- Do not add aggressive validation or change the game metadata contract unless requested; current goal is clarity without breaking the existing game creation flow.
