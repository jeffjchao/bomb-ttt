import { useState, useCallback, useEffect, useRef } from "react";

const EMPTY = null;
const WIN_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

const PHASES = {
  PLAYER_BOMB: "player_bomb",
  AI_MOVE: "ai_move",
  AI_BOMB: "ai_bomb",
  PLAYER_MOVE: "player_move",
  GAME_OVER: "game_over",
};

const POS_LABELS = ["TL", "TC", "TR", "ML", "MC", "MR", "BL", "BC", "BR"];

// -------- UPDATE THIS to match your Render server URL --------
const LOG_URL = "https://bomb-ttt-server.onrender.com/log-game";
// For local testing: "http://localhost:8000/log-game"
// --------------------------------------------------------------

function checkWinner(board) {
  for (const [a, b, c] of WIN_LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line: [a, b, c] };
    }
  }
  return null;
}

function isBoardFull(board) {
  return board.every((c) => c !== EMPTY);
}

function getEmpty(board) {
  return board.map((c, i) => (c === EMPTY ? i : -1)).filter((i) => i >= 0);
}

// ------- CELL SCORING SYSTEM -------

function scoreCell(board, cell, mark, opponentMark) {
  // Returns a numeric score for placing `mark` in `cell`
  // Components: line potential + fork creation + opponent fork disruption
  let score = 0;

  // Component 1: Line potential
  // For each win line through this cell, evaluate its state
  for (const line of WIN_LINES) {
    if (!line.includes(cell)) continue;
    const myCount = line.filter((i) => board[i] === mark).length;
    const oppCount = line.filter((i) => board[i] === opponentMark).length;

    if (oppCount === 0 && myCount === 1) {
      score += 2; // Open line with my progress
    } else if (oppCount === 0 && myCount === 0) {
      score += 1; // Completely empty line
    }
    // Lines with opponent marks: +0 (blocked)
  }

  // Component 2: Fork creation
  // Simulate placing mark here, count resulting threats
  const testBoard = [...board];
  testBoard[cell] = mark;
  let threatCount = 0;
  for (const [a, b, c] of WIN_LINES) {
    const cells = [testBoard[a], testBoard[b], testBoard[c]];
    if (cells.filter((x) => x === mark).length === 2 && cells.filter((x) => x === EMPTY).length === 1) {
      threatCount++;
    }
  }
  if (threatCount >= 2) {
    score += 6; // Fork — multiple threats, opponent can only bomb one
  } else if (threatCount === 1) {
    score += 3; // Single threat
  }

  // Component 3: Opponent fork disruption
  // Simulate opponent placing here, count their resulting threats
  const oppTestBoard = [...board];
  oppTestBoard[cell] = opponentMark;
  let oppThreatCount = 0;
  for (const [a, b, c] of WIN_LINES) {
    const cells = [oppTestBoard[a], oppTestBoard[b], oppTestBoard[c]];
    if (cells.filter((x) => x === opponentMark).length === 2 && cells.filter((x) => x === EMPTY).length === 1) {
      oppThreatCount++;
    }
  }
  if (oppThreatCount >= 2) {
    score += 4; // Disrupts opponent fork
  } else if (oppThreatCount === 1) {
    score += 2; // Disrupts single opponent threat
  }

  return score;
}

function scoreCellsForMark(board, mark, opponentMark) {
  // Score all empty cells and return sorted array of { cell, score }
  const empty = getEmpty(board);
  const scored = empty.map((cell) => ({
    cell,
    score: scoreCell(board, cell, mark, opponentMark),
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored;
}

function pickBestOrSecondBest(scoredCells) {
  // 50/50 between the highest-scored cell and the second-highest
  // If there's only one cell, return it
  if (scoredCells.length === 0) return null;
  if (scoredCells.length === 1) return scoredCells[0].cell;

  // Find the best and second best (may have ties)
  const best = scoredCells[0];
  // Second best is the first cell with a lower score than best
  const secondBest = scoredCells.find((c) => c.score < best.score) || scoredCells[1];

  if (Math.random() < 0.5) {
    return best.cell;
  }
  return secondBest.cell;
}

// ------- PLAYER BEHAVIOR TRACKING (Extreme AI) -------

function getGreedinessRatio(playerProfile, empty, board, playerMark, aiMark) {
  // Track how often the player plays in the "best" cell vs other cells
  // Returns null if insufficient data, otherwise a ratio 0-1
  if (!playerProfile || !playerProfile.history || playerProfile.history.length < 3) {
    return null;
  }

  let bestPlays = 0;
  let totalPlays = 0;

  for (const game of playerProfile.history) {
    for (const turn of game) {
      if (turn.mark !== playerMark) continue;
      // turn.bestCell was the objectively best cell at the time
      // turn.playedCell was what the player actually played
      if (turn.bestCell !== null && turn.bestCell !== undefined) {
        totalPlays++;
        if (turn.playedCell === turn.bestCell) {
          bestPlays++;
        }
      }
    }
  }

  if (totalPlays < 5) return null; // Need enough samples
  return bestPlays / totalPlays;
}

// ------- AI LOGIC -------

function aiChooseMove(board, aiMark, playerMark, difficulty, playerProfile) {
  const empty = getEmpty(board);
  if (empty.length === 0) return null;

  // Easy: mostly random
  if (difficulty === "easy") {
    return empty[Math.floor(Math.random() * empty.length)];
  }

  // Medium: plays "perfect" Tic-Tac-Toe, ignorant of bombs
  // Always takes the best move — no bomb-risk awareness
  if (difficulty === "medium") {
    const scored = scoreCellsForMark(board, aiMark, playerMark);
    return scored[0].cell;
  }

  // Hard & Extreme: score cells, then 50/50 between best and second-best
  const scored = scoreCellsForMark(board, aiMark, playerMark);
  return pickBestOrSecondBest(scored);
}

function aiChooseBomb(board, aiMark, playerMark, difficulty, playerProfile) {
  const empty = getEmpty(board);
  if (empty.length === 0) return null;

  // Easy: random
  if (difficulty === "easy") {
    return empty[Math.floor(Math.random() * empty.length)];
  }

  // Score cells from the PLAYER's perspective — where would they want to play?
  const playerScored = scoreCellsForMark(board, playerMark, aiMark);

  // Medium: 60% chance to bomb the player's best cell, otherwise random
  if (difficulty === "medium") {
    if (playerScored.length > 0 && Math.random() < 0.6) {
      return playerScored[0].cell;
    }
    return empty[Math.floor(Math.random() * empty.length)];
  }

  // Hard: 50/50 between player's best and second-best cell
  if (difficulty === "hard") {
    return pickBestOrSecondBest(playerScored);
  }

  // Extreme: adapt bomb placement based on player's greediness ratio
  if (difficulty === "extreme") {
    const greediness = getGreedinessRatio(playerProfile, empty, board, playerMark, aiMark);

    if (greediness !== null && playerScored.length >= 2) {
      const best = playerScored[0];
      const secondBest = playerScored.find((c) => c.score < best.score) || playerScored[1];

      // If player is greedy (plays best cell often), bomb best cell more often
      // If player is cautious, bomb second-best more often
      if (Math.random() < greediness) {
        return best.cell;
      }
      return secondBest.cell;
    }

    // Not enough data — fall back to hard logic (50/50)
    return pickBestOrSecondBest(playerScored);
  }

  // Fallback
  return empty[Math.floor(Math.random() * empty.length)];
}

// ------- COMPONENTS -------

function ExplosionEffect({ cellIndex }) {
  const col = cellIndex % 3;
  const row = Math.floor(cellIndex / 3);
  const particles = Array.from({ length: 16 }, (_, i) => ({
    angle: (i / 16) * 360,
    dist: 30 + Math.random() * 50,
    size: 4 + Math.random() * 8,
    delay: Math.random() * 0.15,
    id: i,
  }));

  return (
    <div
      style={{
        position: "absolute",
        top: `${row * 33.33 + 16.66}%`,
        left: `${col * 33.33 + 16.66}%`,
        width: 0, height: 0, zIndex: 20, pointerEvents: "none",
      }}
    >
      {particles.map((p) => (
        <div
          key={p.id}
          style={{
            position: "absolute",
            width: p.size, height: p.size, borderRadius: "50%",
            background: ["#ff4444", "#ff8800", "#ffcc00", "#ff6622"][p.id % 4],
            animation: `explode-particle 0.7s ${p.delay}s ease-out forwards`,
            opacity: 0,
            transform: "translate(-50%, -50%) scale(0)",
            "--tx": `${Math.cos((p.angle * Math.PI) / 180) * p.dist}px`,
            "--ty": `${Math.sin((p.angle * Math.PI) / 180) * p.dist}px`,
          }}
        />
      ))}
    </div>
  );
}

function DifficultySelect({ onSelect, gamesPlayed }) {
  const levels = [
    { key: "easy", label: "Easy", desc: "Random moves, no bomb prediction", color: "#4caf50" },
    { key: "medium", label: "Medium", desc: "Decent strategy, some bomb prediction", color: "#ff9800" },
    { key: "hard", label: "Hard", desc: "Fork detection, reads your mind", color: "#ff5252" },
    { key: "extreme", label: "Extreme", desc: "Learns your patterns, adapts every game", color: "#d500f9" },
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0a0a0f",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 32,
        fontFamily: "'Instrument Sans', sans-serif",
      }}
    >
      <div style={{
        position: "fixed", inset: 0,
        backgroundImage: "radial-gradient(circle at 20% 30%, rgba(255,82,82,0.04) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(68,138,255,0.04) 0%, transparent 50%)",
        pointerEvents: "none",
      }} />
      <h1 style={{
        fontSize: "clamp(1.4rem, 5vw, 2rem)", fontWeight: 800, margin: 0, marginBottom: 6,
        letterSpacing: "-0.03em",
        background: "linear-gradient(135deg, #ff5252, #ff8a80, #448aff)",
        WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        position: "relative", zIndex: 1,
      }}>
        BOMB TIC-TAC-TOE
      </h1>
      <div style={{
        fontFamily: "'Space Mono', monospace", fontSize: "0.7rem",
        color: "rgba(255,255,255,0.3)", marginBottom: 40,
        letterSpacing: "0.15em", textTransform: "uppercase",
        position: "relative", zIndex: 1,
      }}>
        vs AI — choose difficulty
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14, position: "relative", zIndex: 1 }}>
        {levels.map((lvl) => (
          <button
            key={lvl.key}
            onClick={() => onSelect(lvl.key)}
            style={{
              padding: "16px 36px",
              background: "rgba(255,255,255,0.04)",
              border: `1px solid ${lvl.color}33`,
              borderRadius: 10,
              cursor: "pointer",
              textAlign: "left",
              transition: "all 0.2s",
              fontFamily: "'Instrument Sans', sans-serif",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = `${lvl.color}18`;
              e.currentTarget.style.borderColor = `${lvl.color}66`;
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.04)";
              e.currentTarget.style.borderColor = `${lvl.color}33`;
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            <div style={{ fontSize: "1.1rem", fontWeight: 700, color: lvl.color, marginBottom: 4 }}>
              {lvl.label}
            </div>
            <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)" }}>
              {lvl.desc}
            </div>
            {lvl.key === "extreme" && gamesPlayed > 0 && (
              <div style={{
                fontSize: "0.6rem", color: "#d500f9", marginTop: 4,
                fontFamily: "'Space Mono', monospace", letterSpacing: "0.08em",
              }}>
                {gamesPlayed} game{gamesPlayed !== 1 ? "s" : ""} analyzed
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// ------- MAIN GAME -------

export default function BombTicTacToeAI() {
  const [difficulty, setDifficulty] = useState(null);
  const [board, setBoard] = useState(Array(9).fill(EMPTY));
  const [phase, setPhase] = useState(PHASES.AI_BOMB);
  const [bombCell, setBombCell] = useState(null);
  const [result, setResult] = useState(null);
  const [showResultOverlay, setShowResultOverlay] = useState(true);
  const [winLine, setWinLine] = useState(null);
  const [explodedCell, setExplodedCell] = useState(null);
  const [shaking, setShaking] = useState(false);
  const [turnNumber, setTurnNumber] = useState(1);
  const [scores, setScores] = useState({ player: 0, ai: 0 });
  const [history, setHistory] = useState([]);
  const [aiThinking, setAiThinking] = useState(false);
  const [lastBombReveal, setLastBombReveal] = useState(null);
  const timerRef = useRef(null);
  const explodingRef = useRef(false);
  const gameStartedAt = useRef(null);

  // Extreme AI: persistent player behavior profile (survives between games)
  // Tracks whether the player tends to play in the "best" scored cell or not
  // Structure: { history: [ [ {mark, bestCell, playedCell}, ... ], ... ], totalGames: 0 }
  const [playerProfile, setPlayerProfile] = useState({ history: [], totalGames: 0 });
  // Track moves within the current game: array of {bestCell, playedCell, mark}
  const currentGameMoves = useRef([]);

  const playerMark = "X";
  const aiMark = "O";

  const playerColors = { X: "#ff5252", O: "#448aff" };

  const resetGame = useCallback(() => {
    setBoard(Array(9).fill(EMPTY));
    setPhase(PHASES.AI_BOMB);
    setBombCell(null);
    setResult(null);
    setShowResultOverlay(true);
    setWinLine(null);
    setExplodedCell(null);
    setShaking(false);
    setTurnNumber(1);
    setHistory([]);
    setAiThinking(false);
    setLastBombReveal(null);
    explodingRef.current = false;
    gameStartedAt.current = null;
    currentGameMoves.current = [];
  }, []);

  // Record a player move with what the "best" cell was at that moment
  const recordPlayerMove = useCallback((cellIndex, currentBoard) => {
    const scored = scoreCellsForMark(currentBoard, playerMark, aiMark);
    const bestCell = scored.length > 0 ? scored[0].cell : null;
    currentGameMoves.current.push({
      mark: playerMark,
      bestCell: bestCell,
      playedCell: cellIndex,
    });
  }, []);

  // At game end, merge recorded moves into the persistent profile
  const finalizeProfile = useCallback(() => {
    if (currentGameMoves.current.length === 0) return;
    setPlayerProfile((prev) => ({
      history: [...prev.history, [...currentGameMoves.current]],
      totalGames: prev.totalGames + 1,
    }));
  }, []);

  // Log completed game to server for analytics
  const logGameToServer = useCallback((outcome, winnerMark, totalTurns, gameHistory) => {
    try {
      fetch(LOG_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "ai",
          difficulty: difficulty,
          first_mover_mark: "X",  // Player (X) always moves first in AI mode
          winner_mark: winnerMark,
          outcome: outcome,
          total_turns: totalTurns,
          started_at: gameStartedAt.current,
          history: gameHistory,
        }),
      }).catch(() => {}); // Silent fail — don't disrupt gameplay
    } catch (e) {
      // Logging should never break the game
    }
  }, [difficulty]);

  // Resolve a move (shared logic for both player and AI placing marks)
  const resolveMove = useCallback((newBoard, movingMark, moveIndex, currentBomb, isPlayerMoving) => {
    const finalEntry = { turn: turnNumber, player: movingMark, move: moveIndex, bomb: currentBomb };

    // Hit bomb?
    if (moveIndex === currentBomb) {
      explodingRef.current = true;
      setBoard(newBoard);
      setExplodedCell(moveIndex);
      setShaking(true);
      setTimeout(() => setShaking(false), 500);
      const entry = { ...finalEntry, result: "BOOM" };
      setHistory((h) => [...h, entry]);
      setTimeout(() => {
        finalizeProfile();
        // Log to server — build full history from current + this entry
        setHistory((h) => { logGameToServer("bomb", isPlayerMoving ? aiMark : playerMark, turnNumber, h); return h; });
        setResult({
          type: "bomb",
          loser: isPlayerMoving ? "player" : "ai",
          winner: isPlayerMoving ? "ai" : "player",
        });
        setScores((s) => ({
          ...s,
          [isPlayerMoving ? "ai" : "player"]: s[isPlayerMoving ? "ai" : "player"] + 1,
        }));
        setPhase(PHASES.GAME_OVER);
      }, 1200);
      return true;
    }

    // Win?
    const winResult = checkWinner(newBoard);
    if (winResult) {
      setBoard(newBoard);
      setWinLine(winResult.line);
      const entry = { ...finalEntry, result: "WIN" };
      setHistory((h) => [...h, entry]);
      setTimeout(() => {
        finalizeProfile();
        setHistory((h) => { logGameToServer("win", winResult.winner, turnNumber, h); return h; });
        setResult({
          type: "win",
          winner: isPlayerMoving ? "player" : "ai",
        });
        setScores((s) => ({
          ...s,
          [isPlayerMoving ? "player" : "ai"]: s[isPlayerMoving ? "player" : "ai"] + 1,
        }));
        setPhase(PHASES.GAME_OVER);
      }, 600);
      return true;
    }

    // Draw?
    if (isBoardFull(newBoard)) {
      setBoard(newBoard);
      const entry = { ...finalEntry, result: "DRAW" };
      setHistory((h) => [...h, entry]);
      setTimeout(() => {
        finalizeProfile();
        setHistory((h) => { logGameToServer("draw", null, turnNumber, h); return h; });
        setResult({ type: "draw" });
        setPhase(PHASES.GAME_OVER);
      }, 400);
      return true;
    }

    return false;
  }, [turnNumber, finalizeProfile, logGameToServer]);

  // AI bomb phase: AI places bomb, then player moves
  useEffect(() => {
    if (phase !== PHASES.AI_BOMB || !difficulty || explodingRef.current) return;
    // Record start time on first turn
    if (turnNumber === 1 && !gameStartedAt.current) {
      gameStartedAt.current = new Date().toISOString();
    }
    setAiThinking(true);
    timerRef.current = setTimeout(() => {
      if (explodingRef.current) return;
      const bomb = aiChooseBomb(board, aiMark, playerMark, difficulty, playerProfile);
      setBombCell(bomb);
      setAiThinking(false);
      setPhase(PHASES.PLAYER_MOVE);
    }, 600 + Math.random() * 500);
    return () => clearTimeout(timerRef.current);
  }, [phase, board, difficulty, playerProfile]);

  // AI move phase: AI places mark after player bombed
  useEffect(() => {
    if (phase !== PHASES.AI_MOVE || !difficulty || explodingRef.current) return;
    setAiThinking(true);
    timerRef.current = setTimeout(() => {
      if (explodingRef.current) return;
      const move = aiChooseMove(board, aiMark, playerMark, difficulty, playerProfile);
      if (move === null) return;
      const newBoard = [...board];
      newBoard[move] = aiMark;
      setAiThinking(false);

      const ended = resolveMove(newBoard, aiMark, move, bombCell, false);
      if (!ended) {
        setBoard(newBoard);
        setLastBombReveal({ bomb: bombCell, move, survived: true });
        setHistory((h) => [...h, {
          turn: turnNumber, player: aiMark, move, bomb: bombCell, result: "safe",
        }]);
        setTurnNumber((t) => t + 1);
        setBombCell(null);
        setPhase(PHASES.AI_BOMB);
      }
    }, 700 + Math.random() * 600);
    return () => clearTimeout(timerRef.current);
  }, [phase, board, bombCell, difficulty, resolveMove, turnNumber, playerProfile]);

  // Player clicks a cell
  const handleCellClick = (index) => {
    if (board[index] !== EMPTY) return;
    if (aiThinking || explodingRef.current) return;

    if (phase === PHASES.PLAYER_MOVE) {
      // Player places their X — record it for the profile
      recordPlayerMove(index, board);
      const newBoard = [...board];
      newBoard[index] = playerMark;

      const ended = resolveMove(newBoard, playerMark, index, bombCell, true);
      if (!ended) {
        setBoard(newBoard);
        setLastBombReveal({ bomb: bombCell, move: index, survived: true });
        setHistory((h) => [...h, {
          turn: turnNumber, player: playerMark, move: index, bomb: bombCell, result: "safe",
        }]);
        setTurnNumber((t) => t + 1);
        setBombCell(null);
        setPhase(PHASES.PLAYER_BOMB);
      }
      return;
    }

    if (phase === PHASES.PLAYER_BOMB) {
      // Player places a bomb for the AI
      setBombCell(index);
      setLastBombReveal(null);
      setPhase(PHASES.AI_MOVE);
      return;
    }
  };

  if (!difficulty) {
    return (
      <>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700;800&family=Space+Mono:wght@400;700&display=swap');`}</style>
        <DifficultySelect onSelect={setDifficulty} gamesPlayed={playerProfile.totalGames} />
      </>
    );
  }

  const getCellStyle = (index) => {
    const isExploded = explodedCell === index;
    const isWinCell = winLine && winLine.includes(index);
    const isEmpty = board[index] === EMPTY;
    const isClickable =
      isEmpty && !aiThinking &&
      (phase === PHASES.PLAYER_MOVE || phase === PHASES.PLAYER_BOMB);
    const isLastBomb = lastBombReveal && lastBombReveal.bomb === index && lastBombReveal.survived;

    let bg = "rgba(255,255,255,0.03)";
    if (isExploded) bg = "rgba(255, 68, 68, 0.25)";
    else if (isWinCell) bg = "rgba(76, 175, 80, 0.15)";
    else if (isLastBomb) bg = "rgba(255, 82, 82, 0.18)";

    return {
      width: "100%", aspectRatio: "1",
      display: "flex", alignItems: "center", justifyContent: "center",
      background: bg, border: "none",
      cursor: isClickable ? "pointer" : "default",
      fontSize: "clamp(2.5rem, 10vw, 5rem)",
      fontFamily: "'Instrument Sans', sans-serif",
      fontWeight: 800,
      color: board[index] ? playerColors[board[index]] : "rgba(255,255,255,0.08)",
      transition: "all 0.2s ease",
      position: "relative", borderRadius: 4, outline: "none",
    };
  };

  const gridBorders = (index) => {
    const row = Math.floor(index / 3);
    const col = index % 3;
    return {
      borderRight: col < 2 ? "2px solid rgba(255,255,255,0.12)" : "none",
      borderBottom: row < 2 ? "2px solid rgba(255,255,255,0.12)" : "none",
    };
  };

  const difficultyColor = { easy: "#4caf50", medium: "#ff9800", hard: "#ff5252", extreme: "#d500f9" }[difficulty];

  return (
    <div style={{
      minHeight: "100vh", background: "#0a0a0f", color: "#e8e8ed",
      fontFamily: "'Instrument Sans', sans-serif",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "20px", position: "relative", overflow: "hidden",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700;800&family=Space+Mono:wght@400;700&display=swap');

        @keyframes explode-particle {
          0% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          100% { opacity: 0; transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(0.2); }
        }
        @keyframes screen-shake {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          10% { transform: translate(-6px, -4px) rotate(-1deg); }
          20% { transform: translate(6px, 2px) rotate(1deg); }
          30% { transform: translate(-4px, 6px) rotate(-0.5deg); }
          40% { transform: translate(4px, -2px) rotate(0.5deg); }
          50% { transform: translate(-2px, 4px) rotate(0deg); }
        }
        @keyframes cell-pop {
          0% { transform: scale(0.5); opacity: 0; }
          60% { transform: scale(1.15); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes fade-in-up {
          0% { opacity: 0; transform: translateY(16px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
        @keyframes bomb-ghost {
          0%, 100% { opacity: 0.15; transform: scale(1); }
          50% { opacity: 0.3; transform: scale(1.08); }
        }
        .cell-btn:hover {
          background: rgba(255,255,255,0.08) !important;
        }
        .cell-mark { animation: cell-pop 0.3s ease-out; }
        .result-card { animation: fade-in-up 0.5s ease-out; }
        .action-btn {
          padding: 12px 32px; border: none; border-radius: 8px;
          font-family: 'Instrument Sans', sans-serif; font-weight: 600;
          font-size: 1rem; cursor: pointer; transition: all 0.2s ease;
          letter-spacing: 0.02em;
        }
        .action-btn:hover { transform: translateY(-1px); filter: brightness(1.1); }
        .action-btn:active { transform: translateY(0); }
      `}</style>

      <div style={{
        position: "fixed", inset: 0,
        backgroundImage: "radial-gradient(circle at 20% 30%, rgba(255,82,82,0.04) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(68,138,255,0.04) 0%, transparent 50%)",
        pointerEvents: "none",
      }} />

      {/* Title */}
      <div style={{ textAlign: "center", marginBottom: 20, position: "relative", zIndex: 1 }}>
        <h1 style={{
          fontSize: "clamp(1.3rem, 5vw, 1.8rem)", fontWeight: 800, margin: 0,
          letterSpacing: "-0.03em",
          background: "linear-gradient(135deg, #ff5252, #ff8a80, #448aff)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        }}>
          BOMB TIC-TAC-TOE
        </h1>
        <div style={{
          fontFamily: "'Space Mono', monospace", fontSize: "0.65rem",
          color: difficultyColor, marginTop: 4, letterSpacing: "0.12em", textTransform: "uppercase",
          cursor: "pointer", opacity: 0.7,
        }} onClick={() => { setDifficulty(null); resetGame(); setScores({ player: 0, ai: 0 }); }}>
          vs AI — {difficulty} ✎
        </div>
        {difficulty === "extreme" && (
          <div style={{
            fontFamily: "'Space Mono', monospace", fontSize: "0.5rem",
            color: "#d500f9", marginTop: 3, letterSpacing: "0.08em",
            opacity: 0.5,
          }}>
            {playerProfile.totalGames < 3
              ? `learning... (${playerProfile.totalGames}/3 games)`
              : `${playerProfile.totalGames} games analyzed — adapting`}
          </div>
        )}
      </div>

      {/* Scoreboard */}
      <div style={{ display: "flex", gap: 40, marginBottom: 16, position: "relative", zIndex: 1 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{
            fontFamily: "'Space Mono', monospace", fontSize: "0.6rem",
            color: playerColors.X, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 2,
          }}>YOU (X)</div>
          <div style={{ fontSize: "1.5rem", fontWeight: 800, color: playerColors.X }}>{scores.player}</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{
            fontFamily: "'Space Mono', monospace", fontSize: "0.6rem",
            color: playerColors.O, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 2,
          }}>AI (O)</div>
          <div style={{ fontSize: "1.5rem", fontWeight: 800, color: playerColors.O }}>{scores.ai}</div>
        </div>
      </div>

      {/* Phase Indicator */}
      {phase !== PHASES.GAME_OVER && (
        <div style={{
          marginBottom: 14, textAlign: "center",
          animation: "fade-in-up 0.3s ease-out", position: "relative", zIndex: 1,
          minHeight: 44,
        }}>
          <div style={{
            fontFamily: "'Space Mono', monospace", fontSize: "0.6rem",
            letterSpacing: "0.12em", color: "rgba(255,255,255,0.3)",
            textTransform: "uppercase", marginBottom: 4,
          }}>
            Turn {turnNumber}
          </div>
          {aiThinking ? (
            <div style={{ fontSize: "0.9rem", color: playerColors.O }}>
              AI is {phase === PHASES.AI_BOMB ? "planting a bomb" : "thinking"}
              <span style={{ animation: "pulse-dot 1s ease-in-out infinite" }}> .</span>
              <span style={{ animation: "pulse-dot 1s ease-in-out 0.2s infinite" }}>.</span>
              <span style={{ animation: "pulse-dot 1s ease-in-out 0.4s infinite" }}>.</span>
            </div>
          ) : phase === PHASES.PLAYER_BOMB ? (
            <div style={{ fontSize: "0.9rem", color: playerColors.X }}>
              <span style={{ fontWeight: 700 }}>Your turn</span>
              <span style={{ color: "rgba(255,255,255,0.5)" }}> — plant a bomb for AI 💣</span>
            </div>
          ) : phase === PHASES.PLAYER_MOVE ? (
            <div style={{ fontSize: "0.9rem", color: playerColors.X }}>
              <span style={{ fontWeight: 700 }}>Your turn</span>
              <span style={{ color: "rgba(255,255,255,0.5)" }}> — place your <span style={{ color: playerColors.X, fontWeight: 700 }}>X</span></span>
            </div>
          ) : null}
        </div>
      )}

      {/* Board */}
      <div style={{
        animation: shaking ? "screen-shake 0.5s ease-out" : "none",
      }}>
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
          width: "min(90vw, 480px)",
          background: "rgba(255,255,255,0.02)", borderRadius: 12, overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.08)",
          position: "relative", zIndex: 1,
        }}>
          {board.map((cell, i) => (
            <div key={i} style={{ ...gridBorders(i), position: "relative" }}>
              <button
                className="cell-btn"
                style={getCellStyle(i)}
                onClick={() => handleCellClick(i)}
                disabled={phase === PHASES.GAME_OVER || aiThinking}
              >
                {cell && (
                  <span className="cell-mark" style={{
                    filter: explodedCell === i ? "blur(2px) brightness(2)"
                      : winLine && winLine.includes(i) ? "drop-shadow(0 0 8px currentColor)" : "none",
                    transition: "filter 0.3s",
                  }}>
                    {cell}
                  </span>
                )}
                {/* Ghost bomb indicator on last survived turn */}
                {!cell && lastBombReveal && lastBombReveal.bomb === i && lastBombReveal.survived && (
                  <span style={{
                    position: "absolute", fontSize: "1.2rem", opacity: 0.2,
                    animation: "bomb-ghost 2s ease-in-out infinite",
                    pointerEvents: "none",
                  }}>💣</span>
                )}
              </button>
            </div>
          ))}
          {explodedCell !== null && <ExplosionEffect cellIndex={explodedCell} />}
        </div>
      </div>

      {/* Last bomb reveal hint */}
      {lastBombReveal && lastBombReveal.survived && phase !== PHASES.GAME_OVER && (
        <div style={{
          marginTop: 12, fontFamily: "'Space Mono', monospace",
          fontSize: "0.6rem", color: "rgba(255,255,255,0.25)",
          textAlign: "center", position: "relative", zIndex: 1,
          animation: "fade-in-up 0.3s ease-out",
        }}>
          Last bomb was at {POS_LABELS[lastBombReveal.bomb]} — dodged!
        </div>
      )}

      {/* History */}
      {history.length > 0 && phase !== PHASES.GAME_OVER && (
        <div style={{ marginTop: 16, width: "min(90vw, 480px)", position: "relative", zIndex: 1 }}>
          <div style={{
            fontFamily: "'Space Mono', monospace", fontSize: "0.55rem",
            letterSpacing: "0.12em", color: "rgba(255,255,255,0.18)",
            textTransform: "uppercase", marginBottom: 6,
          }}>History</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {history.map((h, idx) => (
              <div key={idx} style={{
                fontFamily: "'Space Mono', monospace", fontSize: "0.55rem",
                padding: "3px 8px", borderRadius: 4,
                background: "rgba(255,255,255,0.04)",
                color: h.player === playerMark ? playerColors.X : playerColors.O,
                border: `1px solid ${h.player === playerMark ? playerColors.X : playerColors.O}22`,
              }}>
                {h.player}→{POS_LABELS[h.move]} ✓
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Game Over - floating pill to reshow results when overlay is hidden */}
      {result && !showResultOverlay && (
        <button
          onClick={() => setShowResultOverlay(true)}
          className="action-btn"
          style={{
            position: "absolute", top: 16, left: "50%", transform: "translateX(-50%)",
            zIndex: 35, background: "rgba(20, 20, 30, 0.85)",
            border: "1px solid rgba(255,255,255,0.15)",
            color: "#e8e8ed", padding: "8px 20px", fontSize: "0.75rem",
            backdropFilter: "blur(8px)",
          }}
        >
          Show Results
        </button>
      )}

      {/* Game Over Overlay */}
      {result && showResultOverlay && (
        <div style={{
          position: "absolute", inset: 0,
          background: "rgba(8, 8, 14, 0.92)",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          zIndex: 30, padding: 32,
        }}>
          <div className="result-card" style={{ textAlign: "center" }}>
            <div style={{ fontSize: "3rem", marginBottom: 16 }}>
              {result.type === "bomb"
                ? (result.winner === "player" ? "💥" : "💀")
                : result.type === "win"
                ? (result.winner === "player" ? "🏆" : "🏳️")
                : "🤝"}
            </div>
            <div style={{
              fontSize: "1.4rem", fontWeight: 800, marginBottom: 8,
              color: result.type === "draw" ? "#e8e8ed"
                : result.winner === "player" ? playerColors.X : playerColors.O,
            }}>
              {result.type === "bomb"
                ? result.loser === "player" ? "You hit the bomb!" : "AI hit your bomb!"
                : result.type === "win"
                ? result.winner === "player" ? "You win!" : "AI wins!"
                : "It's a draw!"}
            </div>
            <div style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.4)", marginBottom: 8 }}>
              {result.type === "bomb"
                ? result.winner === "player" ? "Your bomb found its target" : "The AI predicted your move"
                : result.type === "win"
                ? result.winner === "player" ? "Three in a row!" : "Outplayed by the machine"
                : "No one wins this round"}
            </div>

            {/* Game log */}
            {history.length > 0 && (
              <div style={{
                marginTop: 16, marginBottom: 24, padding: 16,
                background: "rgba(255,255,255,0.04)", borderRadius: 8, maxWidth: 600, width: "100%",
              }}>
                <div style={{
                  fontFamily: "'Space Mono', monospace", fontSize: "0.65rem",
                  color: "rgba(255,255,255,0.2)", letterSpacing: "0.1em",
                  textTransform: "uppercase", marginBottom: 10,
                }}>Game Log</div>
                {history.map((h, idx) => (
                  <div key={idx} style={{
                    fontFamily: "'Space Mono', monospace", fontSize: "0.75rem",
                    color: "rgba(255,255,255,0.45)", padding: "5px 0",
                    borderBottom: idx < history.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
                    display: "flex", justifyContent: "space-between",
                  }}>
                    <span>
                      T{h.turn}: <span style={{ color: h.player === playerMark ? playerColors.X : playerColors.O }}>
                        {h.player === playerMark ? "You" : "AI"}
                      </span>→{POS_LABELS[h.move]}
                    </span>
                    <span>
                      💣 @ {POS_LABELS[h.bomb]} {h.result === "BOOM" ? "💥" : h.result === "WIN" ? "🏆" : "✓"}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <button className="action-btn"
                style={{ background: "rgba(255,255,255,0.1)", color: "#e8e8ed" }}
                onClick={() => setShowResultOverlay(false)}
              >View Board</button>
              <button className="action-btn"
                style={{ background: "rgba(255,255,255,0.1)", color: "#e8e8ed" }}
                onClick={resetGame}
              >Play Again</button>
              <button className="action-btn"
                style={{ background: "rgba(255,255,255,0.1)", color: "#e8e8ed" }}
                onClick={() => { setDifficulty(null); resetGame(); setScores({ player: 0, ai: 0 }); }}
              >Change Difficulty</button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{
        marginTop: 24, fontFamily: "'Space Mono', monospace",
        fontSize: "0.5rem", color: "rgba(255,255,255,0.12)",
        textAlign: "center", maxWidth: 300, lineHeight: 1.7,
        letterSpacing: "0.03em", position: "relative", zIndex: 1,
      }}>
        You go first: AI secretly bombs → you place X. Then swap: you bomb → AI places O. Hit a bomb and you lose.
      </div>
    </div>
  );
}
