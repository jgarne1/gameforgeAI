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



### Pet Battle combat vision — current active design

Pet Battle is moving toward a unique, tempo-based combat identity rather than a simple RPG damage race. The intended feel is: **simple inputs, deep outcomes, no dead time, and constant pet attachment**.

Current/near-term battle pillars:

- **Stances:** Push, Brace, and Focus create readable risk/reward decisions.
- **Resources:** HP decides survival, Energy gates stronger actions, and Stamina controls move effectiveness/fatigue.
- **Care Window:** after a player acts, their controls switch into Care Mode while the opponent chooses. This keeps the waiting player engaged and creates pressure for the active player to choose quickly.
- **Lock-In Finisher:** Care Mode includes a deliberate `Lock In` choice that builds a Finisher meter instead of healing, treating ailments, or restoring stamina. This creates high-impact swing moments without making finishers passive or random.
- **Battle items:** only battle-enabled items should appear in battle. Use `battleEnabled: true`, `category: "battle"`, a `battle` tag, or a future `battleEffect` definition. Full server validation/consumption is still required before ranked or real-economy play.
- **Mobile-first controls:** Pet Battle should switch cleanly between Attack Mode and Care Mode in the same control area. Do not show both at once.
- **Live care feedback:** Care Mode should render once, then update only mini-meter widths/text every ~500ms so HP, Stamina, and Fury growth feels alive without flicker. Do not rebuild the whole control panel on every tick.
- **Impact feedback:** Damaging moves should show floating, fading damage numbers near the pet, with stronger visual treatment for finisher hits. This gives players immediate Final-Fantasy-style combat feedback beyond the log.

Care Window v1 behavior:

- Attack Mode appears only on the active player's turn.
- Care Mode appears while waiting for the opponent.
- Care choices are intentionally simple: Soothe, Treat, Steady, or Lock In.
- Care buttons should include compact live mini-meters: Soothe previews HP %, Treat shows ailment recovery/progress, Steady previews stamina %, and Lock In previews Fury/Finisher %.
- Care UI should not flicker. Render the Care panel only when the mode/action changes; timer ticks should update existing bars and labels only.
- Soothe gradually restores a small amount of HP based on how long the opponent takes.
- Treat reduces ailment duration such as burn/slow/snare.
- Steady restores stamina.
- Lock In builds Finisher charge only; it does not heal, treat, or restore resources. If the opponent waits too long, the waiting player can create a major momentum swing.
- At 100% Finisher, the next damaging move gets a large bonus and a special combat-log moment, then the meter resets. Taking damage chips away at Finisher charge, so commitment has risk.
- Battle item use is a quick Care Window action. If the player selects an item fast enough, its effect applies before the opponent's next move resolves.
- A Care Window should be capped so stalling cannot create unlimited healing or recovery.


Patch notes — Care/Finisher polish v1.4:

- Care Mode should now be compact enough to act as a bottom control bar instead of covering the pet stage. The Tend row uses four compact cards on wider screens and tight mobile sizing on phones.
- Lock In / Fury gain has been slowed by roughly 50% so Finisher moments require more commitment and do not fill from one short Care Window.
- Pet Battle clients can now request a fresh battle state while stuck in Care Mode. The server responds with the latest room or Battle Hall instance state, helping both players recover if a move broadcast is missed or delayed.
- This is still an iteration safety net, not a replacement for the future server-authoritative battle engine.

Important implementation direction:

- The current prototype may remain client-synced for iteration, but the final battle system must become server-authoritative.
- Server-authoritative battle must validate selected moves, stance changes, care choices, battle item eligibility, item ownership, item consumption, and final rewards.
- Battle items should eventually be chosen through a limited **battle pouch/loadout**, not the full inventory, to prevent spam and simplify balance.

AAA engagement roadmap for Pet Battle:

- Tune Lock-In/Finisher gain and loss until it creates memorable but fair comeback/swing moments.
- Add type-based graphical move effects and clear impact feedback.
- Expand impact feedback with floating damage/heal numbers, finisher number styling, and later type-specific hit effects.
- Add stance visual states so Push/Brace/Focus are readable without reading logs.
- Heavily expand the move library over time.
- Add items that teach stances, skills, and special moves.
- Add a skill management UI so players can choose which learned moves/stances are equipped.
- Add pet traits, bond effects, and growth-stage combat identity.
- Keep all combat readable on mobile: large buttons, clear mode changes, compact logs, and no forced scrolling during active battle decisions.

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

## Pet Battle combat v1 update

Pet Battle now uses a GameForge-specific combat direction instead of a simple first-hit damage race.

Combat v1 principles:

- Battles should last several meaningful turns, not two hits.
- Players choose a stance before each move: Push, Brace, or Focus.
- HP remains the survival resource.
- Energy controls move availability and prevents strong-move spam.
- Stamina controls move effectiveness and punishes reckless attacking.
- Brace reduces incoming damage and drains attacker stamina when struck.
- Focus builds energy and stamina but is risky if the opponent catches it with damage.
- Push increases damage but costs more stamina.
- Mobile UI should keep pets readable side-by-side and keep stance/action buttons large enough for touch.

Future battle changes should preserve the stance/resource identity and avoid drifting into a Pokemon-like type-and-four-move clone.

### Pet Battle combat v1.1 mobile/stance update

This drop-in adds two follow-up fixes to Combat v1:

- Phone battle layout now explicitly keeps both pets side-by-side, with the status card and battle log placed below the two pet cards.
- The old unused `.battleArena` / `.petCard` mobile patch was removed because Pet Battle uses `.arena`, `.side`, and `.center`.
- Stance changes now have an intentional cost during the player's active turn: `-1 energy` and `-5 stamina` when switching to a different stance.
- Stance button labels now show the shift cost so the mechanic is visible to players.
- Very small phones keep two-column moves, shrink pet stages, and hide secondary move descriptions to preserve tap-friendly combat controls.


### Pet Battle combat v1.5 turn-mode sync fix

This update fixes a client-side Attack/Care mode issue seen during two-player testing.

Observed behavior:

- The defending player received the updated battle state enough for Care/Fury progress to stop.
- Their controls could remain stuck on the Care screen instead of switching to Attack Mode.

Cause:

- Some launcher/Battle Hall setup paths can provide `mySeat` as a string while `state.turn` is numeric.
- The battle UI used strict seat comparison in several places, so `"1" !== 1` could incorrectly keep a player in Care Mode even when it was actually their turn.

Fix:

- Pet Battle now normalizes local seat and turn values before comparing them.
- A shared `isMyTurn()` helper controls Attack/Care mode switching.
- Incoming battle states force a normalized turn, battle shape validation, and a full control-mode invalidation before redraw.

Future note:

- Before live/ranked play, battle authority should continue moving toward server-owned validation for turn order, item consumption, and final combat results.

### Pet Battle combat v1.6 live resource + arena polish

This update tightens the Care Window after playtesting:

- Soothe, Steady, Lock In, and battle-item effects should visually update the main pet panels, not only the Care cards.
- HP previews are clamped to the pet's max HP so healing cannot display above 100%.
- Stamina, Energy, and Finisher/Fury previews are clamped to their valid ranges and reflected in the top/main resource area while Care Mode is active.
- The Care panel remains compact and should not dominate the arena.
- Pet stage backgrounds were reduced with responsive sizing so the blue/pink battle stages stay inside their player panes instead of crowding the control area.

Design note: Care Mode is intended to feel live without flicker. The panel should render once, then update existing bar widths/text/resource displays on the timer tick.

### Pet Battle combat v1.7 Guard + manual Fury Finisher update

This update adds the next high-impact battle layer while keeping the current Attack/Care flow intact.

Implemented direction:

- Care Mode now includes **Guard** as a prediction action.
- Guard is primarily intended to counter an expected Fury/Finisher attack or other large incoming hit.
- Guard does **not** skip the defender's next attack turn. Instead, it reduces the next incoming hit and spends stamina when triggered.
- Current Guard tuning:
  - Normal guarded hit: roughly 50% damage taken and about 12 stamina spent.
  - Fury/Finisher guarded hit: roughly 65% damage taken and about 22 stamina spent.
- Guard should feel useful when the player makes the right read, but it should not fully erase an enemy's offensive moment.
- Fury/Finisher is now manually selected instead of automatically consuming the next attack.
- When Fury is ready, the attacking player sees a clear **FINISHER** button in Attack Mode.
- Both players should see a clear aura/glow around a pet when its Fury/Finisher is ready.
- Soothe healing should be slow and capped as actual healing, not just as a UI preview. Current intent is a max of about 5% HP per Care Window.

Future owner-skill note:

- Pet owner skills should eventually provide small, lightly meaningful boosts to care and item efficiency.
- These boosts should be subtle edges, not battle-swinging passives.
- Example future boosts: slightly stronger Soothe, slightly faster Treat, slightly better Guard stamina efficiency, minor battle-item effectiveness bonuses.
- Owner skills should enhance player identity and progression while keeping combat primarily skill/read driven.

Future balance notes:

- Guard should be monitored closely. If it becomes too dominant, increase stamina cost or reduce reduction slightly.
- If Fury/Finisher feels too easy to counter, slightly improve the finisher-vs-guard damage scale or add secondary effects later.
- Clash mechanics are still a future candidate after Guard/Fury are stable.
