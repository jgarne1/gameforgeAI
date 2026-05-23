GameForge AI - Real Multiplayer World Drop-ins

Replace these files in your project:
- server.js
- games/js/world_engine.js

What this adds:
- Real WebSocket-based multiplayer overworld rooms.
- Players join a room based on the current world scene, e.g. world:shadow_woods_dock.
- Other online players render in the same area with nameplates.
- Remote player movement is smoothly interpolated.
- Join/leave messages appear as world toasts.
- The multiplayer status badge shows online/offline state and nearby player count.
- Fishing catches broadcast to nearby players.

Important:
- This uses the existing ws dependency already in package.json, so no new install is required.
- This is the first multiplayer foundation. It syncs presence and movement, not combat authority yet.
- Future battling should build on these worldJoin/worldMove/worldEvent messages.

Test:
1. Replace the files.
2. Restart the server.
3. Open /games/world.html in two browser windows with different users if possible.
4. Move one character and confirm the other appears with a nameplate.
