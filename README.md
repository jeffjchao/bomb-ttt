# 💣 Bomb Tic-Tac-Toe

A strategic twist on classic Tic-Tac-Toe. Each turn, one player secretly plants a bomb while the other places their mark. Land on the bomb and you lose instantly. Get three in a row to win — if you survive.

**[Play it live →](https://bomb-ttt.vercel.app)**

## How It Works

Bomb Tic-Tac-Toe follows the same goal as classic Tic-Tac-Toe — get three marks in a row on a 3×3 grid. The twist is that before each move, the opposing player secretly rigs one empty cell with a bomb. If the moving player happens to place their mark on that cell, they lose immediately.

Each turn has two phases:

1. **Bomb phase** — the defending player secretly picks an empty cell to rig. The moving player can't see where it's placed.
2. **Move phase** — the attacking player places their mark (X or O) on any empty cell.

If the mark lands on the bomb, game over. Otherwise, the bomb is revealed, roles swap, and the next turn begins. In multiplayer, both actions happen simultaneously — the bomber and mover lock in their choices at the same time.

### Ways to Win

- 🏆 **Three in a row** — line up three marks horizontally, vertically, or diagonally
- 💥 **Bomb hit** — your opponent steps on the bomb you planted

> Note: draws are technically impossible. On the final turn only one cell remains, so the bomber always knows where the mover will play — guaranteed detonation.

## Game Modes

### 🤖 vs AI

Four difficulty levels with distinct play styles:

| Difficulty | Move Strategy | Bomb Strategy |
|---|---|---|
| **Easy** | Mostly random | Random placement |
| **Medium** | Plays "perfect" Tic-Tac-Toe | 60% chance of predicting your winning move |
| **Hard** | Fork detection + varies opening moves | Evaluates best and second-best targets, splits between them |
| **Extreme** | Same as Hard | Learns your patterns across games and adapts bomb placement to punish habits |

The Extreme AI tracks where you play on each turn number across multiple games. After 3+ games of data, it builds a probability model of your tendencies and shifts its bomb placement to target your most common cells. If you adjust your strategy, it adjusts with you.

### 👥 Multiplayer

Create a room and share a 4-letter code with a friend. Both players act simultaneously each turn — no waiting for sequential phases. Powered by WebSocket connections to a Python backend.

## Strategy

**As the mover:** the "best" Tic-Tac-Toe move is also the most predictable, which makes it the most dangerous. Create situations where multiple cells look equally strong so the bomber has to guess. Feinting toward a line you don't intend to complete is a real tactic.

**As the bomber:** think about what your opponent wants most. Are they one move from winning? That cell is an obvious bomb target. But they know that too — so do they dodge? The game becomes a layered prediction problem, not just a grid puzzle.

The deeper meta involves balancing positional strength against bomb risk. Playing purely optimal Tic-Tac-Toe makes you predictable and exploitable. Playing purely randomly wastes your strategic advantage. The skill is in finding the right mix.

## Tech Stack

**Frontend:** React + Vite, deployed on Vercel

**Backend:** Python (FastAPI + WebSockets), deployed on Render

**Database:** PostgreSQL on Neon (game analytics logging)

## Project Structure

```
bomb-ttt/                    ← Frontend (this repo)
├── src/
│   ├── App.jsx              ← Mode selector (AI vs Multiplayer)
│   ├── BombTTTAI.jsx        ← Single-player AI game
│   └── Multiplayer.jsx      ← Online multiplayer client
├── index.html
├── vite.config.js
└── package.json

bomb-ttt-server/             ← Backend (separate repo)
├── main.py                  ← FastAPI server, game logic, DB logging
├── requirements.txt
└── Procfile
```

## Local Development

```bash
# Frontend
cd bomb-ttt
npm install
npm run dev
# → http://localhost:5173

# Backend (for multiplayer)
cd bomb-ttt-server
pip install -r requirements.txt
uvicorn main:app --reload
# → http://localhost:8000
```

## Analytics

Completed games (both AI and multiplayer) are logged to a PostgreSQL database with per-turn granularity. The server exposes a `/stats` endpoint with aggregate data and the raw tables support detailed analysis:

- Win rates by outcome type (bomb vs three-in-a-row)
- First-mover vs second-mover advantage
- Average game length by mode and difficulty
- Most common opening moves and bomb placements
- Strategy divergence between AI and multiplayer games

## License

This project is a personal hobby project. Feel free to fork it and make your own variant.
