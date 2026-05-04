# GameForge AI

GameForge AI is a browser-based multiplayer game hub built with Node.js, Express, and WebSockets. It combines multiple mini-games with a persistent pet system, social features, and a shared multiplayer environment designed for scalability and AAA-style gameplay experiences.

---

## 🚀 Overview

GameForge AI is designed around a central launcher that allows players to:

* Manage and grow pets
* Battle other players in real-time
* Trade and interact through a marketplace
* Communicate via a social/mail system
* Play multiple games within a unified interface

The system is built to evolve toward a fully persistent, server-authoritative multiplayer platform.

---

## 🧱 Tech Stack

* **Backend:** Node.js + Express
* **Realtime:** WebSockets
* **Frontend:** HTML / CSS / Vanilla JS
* **Data Storage (Current):** JSON files on persistent disk
* **Hosting:** Render (with persistent storage)
* **Version Control:** GitHub

---

## 📁 Project Structure

```
server.js                → Main backend server
public/
  index.html             → Main UI / launcher / social system
  admin.html             → Admin tools
  assets/                → Images (pets, items, etc.)

games/
  launcher.html          → Game launcher UI
  petworld.html          → Pet management system
  petbattle.html         → Battle system
  battlehall.html        → Public matchmaking lobby
  market.html            → Marketplace

data/
  users.json
  pets.json
  items.json
  market.json
  social.json            → Mail / friends system

games.json               → Game definitions
```

---

## 🎮 Core Systems

### 🐾 Pet System

* Pets have stats, levels, types, and growth stages
* Only **move IDs** are stored (not full move data)
* Moves are defined in `data/pet_moves.json`
* Future expansion includes traits, evolution, and bonding

---

### ⚔️ Battle System

* Fully server-authoritative design
* Battles are created through **battle instances**
* Pets are **locked on Ready** using server snapshots
* Prevents:

  * stat tampering
  * pet swapping mid-battle
  * unauthorized battle entry

---

### 🏟️ Battle Hall

* Shared multiplayer lobby
* Players sit at tables and ready up
* Once both players are ready:

  * pets are locked
  * server creates a private battle instance
  * players are moved into battle

---

### 💬 Social System (Mail + Friends)

* Thread-based mail system
* Threads grouped by:

  * participants
  * type (`chat`, `battle`, `trade`, `system`)
* Max 25 threads per user (oldest auto-deleted silently)
* Designed to support:

  * battle invites / friend challenges
  * trade requests
  * system notifications

---

### ⚔️ Friend Challenges

* Friends can challenge each other from social/friend UI surfaces
* Battle challenge notifications are delivered through battle-type mail threads
* Accepting a challenge creates a private server-locked battle instance
* The top header can show a battle-ready Join alert when a private battle is ready

---

### 🛒 Marketplace

* Player-driven listings
* Buy/sell items between users
* Server validates all transactions

---

## 🔒 Key Design Principles

* **Server is authoritative**

  * Clients send actions, not results
* **All battles use locked server snapshots**
* **No gameplay-critical logic lives on the client**
* **Data consistency across systems is critical**
* **Features extend existing systems — not replace them**

---

## ▶️ Running the Project

1. Install dependencies:

```
npm install
```

2. Start the server:

```
node server.js
```

3. Open in browser:

```
http://localhost:3000
```

---

## ⚠️ Development Rules

* Do **NOT** break:

  * login/register
  * WebSocket systems
  * marketplace APIs
  * pet APIs

* Always:

  * extend existing systems instead of rewriting
  * keep UI consistent across pages
  * comment major logic clearly
  * avoid duplicate data structures
  * update this README when a feature changes architecture, major user flow, deployment assumptions, or future-AI handoff rules

* Future AI/code assistants must read this README before making changes and maintain it as part of feature work.
* Follow `ARCHITECTURE.md` strictly for all major changes

---

## 📈 Future Roadmap

* SQLite → Postgres migration
* Battle rewards and ranking system
* Friend challenges (integrated with mail + battles)
* Inventory usage in battle prep
* Admin asset management (image uploads)
* Expanded pet evolution and trait systems

---

## 🎯 Vision

GameForge AI aims to deliver a **polished, AAA-feeling browser game experience** with:

* seamless multiplayer interaction
* persistent progression systems
* clean, responsive UI
* scalable backend architecture

---

## 🤝 Contribution Model

Development is primarily driven through:

* design-first iteration
* AI-assisted implementation
* strict adherence to architecture rules

---

## 📌 Notes

* Live battle state is stored in memory
* Persistent data is stored in JSON (temporary solution)
* Future systems will migrate to database-backed storage

---

## 🧠 Important

Before making any changes:

```
Read ARCHITECTURE.md
Do not break existing systems
```

---

This project is actively evolving toward a full-featured multiplayer platform.
