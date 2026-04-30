const express = require("express");
const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(__dirname, "public")));

const gamesDir = path.join(__dirname, "games");
const rooms = {}; // roomCode -> { gameId, clients: Set<WebSocket> }

function listGames() {
  return fs.readdirSync(gamesDir)
    .filter(f => f.endsWith(".html"))
    .map(f => ({
      id: f.replace(".html", ""),
      name: f.replace(".html", "").replace(/-/g, " ")
    }));
}

function roomCode() {
  return Math.random().toString(36).slice(2, 6).toUpperCase();
}

app.get("/api/games", (req, res) => {
  res.json(listGames());
});

app.post("/api/create-room", (req, res) => {
  const { gameId } = req.body;
  const gamePath = path.join(gamesDir, gameId + ".html");
  if (!fs.existsSync(gamePath)) return res.status(404).json({ error: "Game not found" });

  const code = roomCode();
  rooms[code] = { gameId, clients: new Set() };
  res.json({ roomCode: code, gameId });
});

app.get("/api/room/:code", (req, res) => {
  const room = rooms[req.params.code.toUpperCase()];
  if (!room) return res.status(404).json({ error: "Room not found" });
  res.json({ roomCode: req.params.code.toUpperCase(), gameId: room.gameId });
});

app.get("/game/:id", (req, res) => {
  const gamePath = path.join(gamesDir, req.params.id + ".html");
  if (!fs.existsSync(gamePath)) return res.status(404).send("Game not found");
  res.sendFile(gamePath);
});

const server = app.listen(PORT, () => {
  console.log(`GameForge wrapper running at http://localhost:${PORT}`);
});

const wss = new WebSocket.Server({ server });

wss.on("connection", ws => {
  ws.on("message", raw => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    if (msg.type === "join") {
      const code = String(msg.roomCode || "").toUpperCase();
      const room = rooms[code];
      if (!room) return ws.send(JSON.stringify({ type: "error", message: "Room not found" }));
      ws.roomCode = code;
      ws.playerName = msg.playerName || "Player";
      room.clients.add(ws);
      broadcast(code, { type: "system", message: `${ws.playerName} joined`, players: room.clients.size });
    }

    if (msg.type === "move" && ws.roomCode) {
      broadcast(ws.roomCode, {
        type: "move",
        data: msg.data,
        from: ws.playerName || "Player"
      }, ws);
    }
  });

  ws.on("close", () => {
    if (ws.roomCode && rooms[ws.roomCode]) {
      rooms[ws.roomCode].clients.delete(ws);
      broadcast(ws.roomCode, { type: "system", message: `${ws.playerName || "Player"} left`, players: rooms[ws.roomCode].clients.size });
    }
  });
});

function broadcast(code, payload, except) {
  const room = rooms[code];
  if (!room) return;
  const text = JSON.stringify(payload);
  room.clients.forEach(client => {
    if (client !== except && client.readyState === WebSocket.OPEN) {
      client.send(text);
    }
  });
}
