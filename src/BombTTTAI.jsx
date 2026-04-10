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

// ------- AI LOGIC -------

function findWinningMove(board, mark) {
  for (const [a, b, c] of WIN_LINES) {
    const cells = [board[a], board[b], board[c]];
    const markCount = cells.filter((x) => x === mark).length;
    const emptyCount = cells.filter((x) => x === EMPTY).length;
    if (markCount === 2 && emptyCount === 1) {
      return [a, b, c].find((i) => board[i] === EMPTY);
    }
  }
  return null;
}

function scorePosition(index) {
  // Center > corners > edges
  if (index === 4) return 3;
  if ([0, 2, 6, 8].includes(index)) return 2;
  return 1;
}

// ------- PLAYER BEHAVIOR TRACKING (Extreme AI) -------

function predictFromProfile(playerProfile, turnNumber, availableCells) {
  if (!playerProfile || !playerProfile.moves) return null;
  const turnData = playerProfile.moves[turnNumber] || {};
  const totalSamples = Object.values(turnData).reduce((a, b) => a + b, 0);
  if (totalSamples < 3) return null;

  const probs = {};
  let totalWeight = 0;
  for (const cell of availableCells) {
    const freq = turnData[cell] || 0;
    // Smoothing: small base probability so untried cells aren't completely ignored
    const weight = freq + 0.3;
    probs[cell] = weight;
    totalWeight += weight;
  }
  for (const cell of availableCells) {
    probs[cell] /= totalWeight;
  }
  return probs;
}

function weightedRandomPick(probs) {
  const entries = Object.entries(probs).map(([k, v]) => [parseInt(k), v]);
  const roll = Math.random();
  let cumulative = 0;
  for (const [cell, prob] of entries) {
    cumulative += prob;
    if (roll <= cumulative) return cell;
  }
  return entries[entries.length - 1][0];
}

// ------- AI LOGIC -------

function aiChooseMove(board, aiMark, playerMark, difficulty, playerProfile) {
  const empty = getEmpty(board);
  if (empty.length === 0) return null;

  // Even on easy, always take a win
  const winMove = findWinningMove(board, aiMark);
  if (winMove !== null) return winMove;

  if (difficulty === "easy") {
    // Random with slight preference for center/corners
    if (Math.random() < 0.3) {
      const good = empty.filter((i) => scorePosition(i) >= 2);
      if (good.length > 0) return good[Math.floor(Math.random() * good.length)];
    }
    return empty[Math.floor(Math.random() * empty.length)];
  }

  // Block player win
  const blockMove = findWinningMove(board, playerMark);
  if (blockMove !== null) return blockMove;

  if (difficulty === "medium") {
    // Decent positional play with some randomness
    if (Math.random() < 0.2) {
      return empty[Math.floor(Math.random() * empty.length)];
    }
    // Prefer center, then corners, then edges
    const sorted = [...empty].sort((a, b) => scorePosition(b) - scorePosition(a));
    return sorted[0];
  }

  // Hard & Extreme: fork detection + adaptive positional play
  // (Extreme uses the same move logic as hard — its advantage is in bomb prediction)
  const filledCount = 9 - empty.length;

  // Opening moves (first 2 AI moves): vary response to avoid being predictable
  if (filledCount <= 2) {
    // If player opened with a corner, don't always take center — mix in opposite corner
    const corners = [0, 2, 6, 8];
    const playerCorner = corners.find((c) => board[c] === playerMark);
    if (playerCorner !== undefined && board[4] === EMPTY) {
      // 50/50 between center and a random available corner
      const availCorners = corners.filter((c) => board[c] === EMPTY);
      if (Math.random() < 0.5 && availCorners.length > 0) {
        return availCorners[Math.floor(Math.random() * availCorners.length)];
      }
      return 4;
    }
    // If player opened center, take a random corner
    if (board[4] === playerMark) {
      const availCorners = corners.filter((c) => board[c] === EMPTY);
      if (availCorners.length > 0) return availCorners[Math.floor(Math.random() * availCorners.length)];
    }
    // If player opened edge, mix between center and adjacent corners
    const edges = [1, 3, 5, 7];
    const playerEdge = edges.find((c) => board[c] === playerMark);
    if (playerEdge !== undefined) {
      const adjacentCorners = {
        1: [0, 2], 3: [0, 6], 5: [2, 8], 7: [6, 8],
      };
      const candidates = [4, ...adjacentCorners[playerEdge]].filter((c) => board[c] === EMPTY);
      return candidates[Math.floor(Math.random() * candidates.length)];
    }
    // Fallback: random good cell
    const goodCells = [4, 0, 2, 6, 8].filter((c) => board[c] === EMPTY);
    return goodCells[Math.floor(Math.random() * goodCells.length)];
  }

  // Check for fork opportunities (two ways to win)
  for (const cell of empty) {
    const testBoard = [...board];
    testBoard[cell] = aiMark;
    let winningMoves = 0;
    for (const [a, b, c] of WIN_LINES) {
      const cells = [testBoard[a], testBoard[b], testBoard[c]];
      if (cells.filter((x) => x === aiMark).length === 2 && cells.filter((x) => x === EMPTY).length === 1) {
        winningMoves++;
      }
    }
    if (winningMoves >= 2) return cell;
  }

  // Block player forks
  for (const cell of empty) {
    const testBoard = [...board];
    testBoard[cell] = playerMark;
    let winningMoves = 0;
    for (const [a, b, c] of WIN_LINES) {
      const cells = [testBoard[a], testBoard[b], testBoard[c]];
      if (cells.filter((x) => x === playerMark).length === 2 && cells.filter((x) => x === EMPTY).length === 1) {
        winningMoves++;
      }
    }
    if (winningMoves >= 2) return cell;
  }

  // Mid/late game: positional preference with some randomness to stay unpredictable
  const scored = empty.map((i) => ({ i, s: scorePosition(i) + Math.random() * 1.2 }));
  scored.sort((a, b) => b.s - a.s);
  return scored[0].i;
}

function aiChooseBomb(board, aiMark, playerMark, difficulty, playerProfile) {
  const empty = getEmpty(board);
  if (empty.length === 0) return null;

  if (difficulty === "easy") {
    return empty[Math.floor(Math.random() * empty.length)];
  }

  // Predict where the player will move — bomb that cell
  // Most likely: player takes a winning move
  const playerWin = findWinningMove(board, playerMark);
  if (playerWin !== null) {
    if (difficulty === "hard" || difficulty === "extreme") return playerWin;
    // Medium: 60% chance to find it
    if (Math.random() < 0.6) return playerWin;
  }

  // Next likely: player blocks AI win
  const aiWin = findWinningMove(board, aiMark);
  if (aiWin !== null && (difficulty === "hard" || difficulty === "extreme")) {
    if (Math.random() < 0.5) return aiWin;
  }

  if (difficulty === "medium") {
    // Bomb high-value positions that are empty
    const weighted = empty.map((i) => ({ i, s: scorePosition(i) + Math.random() }));
    weighted.sort((a, b) => b.s - a.s);
    return weighted[0].i;
  }

  // Extreme: blend player profile predictions with strategic analysis
  if (difficulty === "extreme") {
    const filledCount = 9 - empty.length;
    // Determine which player turn number this is (how many X moves have been made)
    const playerMoveNumber = board.filter((c) => c === playerMark).length + 1;
    const profilePrediction = predictFromProfile(playerProfile, playerMoveNumber, empty);

    if (profilePrediction) {
      // Blend profile prediction (60%) with strategic scoring (40%)
      const strategicScores = {};
      let maxStrategic = 0;
      for (const cell of empty) {
        const testBoard = [...board];
        testBoard[cell] = playerMark;
        let forkCount = 0;
        for (const [a, b, c] of WIN_LINES) {
          const cells = [testBoard[a], testBoard[b], testBoard[c]];
          if (cells.filter((x) => x === playerMark).length === 2 && cells.filter((x) => x === EMPTY).length === 1) {
            forkCount++;
          }
        }
        const s = forkCount * 3 + scorePosition(cell);
        strategicScores[cell] = s;
        if (s > maxStrategic) maxStrategic = s;
      }

      // Normalize strategic scores to 0-1
      const blended = {};
      for (const cell of empty) {
        const strat = maxStrategic > 0 ? strategicScores[cell] / maxStrategic : 0;
        blended[cell] = profilePrediction[cell] * 0.6 + strat * 0.4;
      }

      // Normalize blended scores to probabilities
      const total = Object.values(blended).reduce((a, b) => a + b, 0);
      for (const cell of empty) {
        blended[cell] /= total;
      }

      return weightedRandomPick(blended);
    }

    // Not enough data yet — fall through to hard AI logic
  }

  // Hard (and extreme fallback): predict player forks + opening patterns
  const filledCount = 9 - empty.length;

  // Early game bomb prediction: think about what the player is likely setting up
  if (filledCount <= 2) {
    const corners = [0, 2, 6, 8];
    const playerCorners = corners.filter((c) => board[c] === playerMark);

    // If player opened corner, they'll likely go for the opposite corner or an adjacent one
    if (playerCorners.length === 1) {
      const opposites = { 0: 8, 2: 6, 6: 2, 8: 0 };
      const adjacent = { 0: [2, 6], 2: [0, 8], 6: [0, 8], 8: [2, 6] };
      const candidates = [
        opposites[playerCorners[0]],
        ...adjacent[playerCorners[0]],
      ].filter((c) => board[c] === EMPTY);
      // Also consider center as a target
      if (board[4] === EMPTY) candidates.push(4);
      if (candidates.length > 0) return candidates[Math.floor(Math.random() * candidates.length)];
    }

    // If player opened center, they'll likely go for a corner
    if (board[4] === playerMark) {
      const availCorners = corners.filter((c) => board[c] === EMPTY);
      if (availCorners.length > 0) return availCorners[Math.floor(Math.random() * availCorners.length)];
    }
  }

  // Mid/late game: score cells by how strategically valuable they are to the player
  let bestCell = null;
  let bestForkScore = -1;
  for (const cell of empty) {
    const testBoard = [...board];
    testBoard[cell] = playerMark;
    let forkCount = 0;
    for (const [a, b, c] of WIN_LINES) {
      const cells = [testBoard[a], testBoard[b], testBoard[c]];
      if (cells.filter((x) => x === playerMark).length === 2 && cells.filter((x) => x === EMPTY).length === 1) {
        forkCount++;
      }
    }
    // Add randomness so the bomb placement isn't fully predictable either
    const score = forkCount * 3 + scorePosition(cell) + Math.random() * 1.5;
    if (score > bestForkScore) {
      bestForkScore = score;
      bestCell = cell;
    }
  }
  return bestCell ?? empty[Math.floor(Math.random() * empty.length)];
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

  // Extreme AI: persistent player behavior profile (survives between games)
  // Structure: { moves: { [turnNumber]: { [cellIndex]: count } }, totalGames: 0 }
  const [playerProfile, setPlayerProfile] = useState({ moves: {}, totalGames: 0 });
  // Track moves within the current game so we can log them all at game end
  const currentGameMoves = useRef([]);

  const playerMark = "X";
  const aiMark = "O";

  const playerColors = { X: "#ff5252", O: "#448aff" };

  const resetGame = useCallback(() => {
    setBoard(Array(9).fill(EMPTY));
    setPhase(PHASES.AI_BOMB);
    setBombCell(null);
    setResult(null);
    setWinLine(null);
    setExplodedCell(null);
    setShaking(false);
    setTurnNumber(1);
    setHistory([]);
    setAiThinking(false);
    setLastBombReveal(null);
    explodingRef.current = false;
    currentGameMoves.current = [];
  }, []);

  // Record a player move into the current game tracker
  const recordPlayerMove = useCallback((cellIndex) => {
    currentGameMoves.current.push(cellIndex);
  }, []);

  // At game end, merge all recorded player moves into the persistent profile
  const finalizeProfile = useCallback(() => {
    if (currentGameMoves.current.length === 0) return;
    setPlayerProfile((prev) => {
      const updated = {
        moves: { ...prev.moves },
        totalGames: prev.totalGames + 1,
      };
      currentGameMoves.current.forEach((cell, idx) => {
        const moveNum = idx + 1; // 1-indexed: player's 1st move, 2nd move, etc.
        if (!updated.moves[moveNum]) {
          updated.moves[moveNum] = {};
        } else {
          updated.moves[moveNum] = { ...updated.moves[moveNum] };
        }
        updated.moves[moveNum][cell] = (updated.moves[moveNum][cell] || 0) + 1;
      });
      return updated;
    });
  }, []);

  // Resolve a move (shared logic for both player and AI placing marks)
  const resolveMove = useCallback((newBoard, movingMark, moveIndex, currentBomb, isPlayerMoving) => {
    // Hit bomb?
    if (moveIndex === currentBomb) {
      explodingRef.current = true;
      setBoard(newBoard);
      setExplodedCell(moveIndex);
      setShaking(true);
      setTimeout(() => setShaking(false), 500);
      setHistory((h) => [...h, {
        turn: turnNumber, player: movingMark, move: moveIndex, bomb: currentBomb, result: "BOOM",
      }]);
      setTimeout(() => {
        finalizeProfile();
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
      setHistory((h) => [...h, {
        turn: turnNumber, player: movingMark, move: moveIndex, bomb: currentBomb, result: "WIN",
      }]);
      setTimeout(() => {
        finalizeProfile();
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
      setHistory((h) => [...h, {
        turn: turnNumber, player: movingMark, move: moveIndex, bomb: currentBomb, result: "DRAW",
      }]);
      setTimeout(() => {
        finalizeProfile();
        setResult({ type: "draw" });
        setPhase(PHASES.GAME_OVER);
      }, 400);
      return true;
    }

    return false;
  }, [turnNumber, finalizeProfile]);

  // AI bomb phase: AI places bomb, then player moves
  useEffect(() => {
    if (phase !== PHASES.AI_BOMB || !difficulty || explodingRef.current) return;
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
      recordPlayerMove(index);
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
    else if (isLastBomb) bg = "rgba(255, 152, 0, 0.08)";

    return {
      width: "100%", aspectRatio: "1",
      display: "flex", alignItems: "center", justifyContent: "center",
      background: bg, border: "none",
      cursor: isClickable ? "pointer" : "default",
      fontSize: "clamp(2rem, 8vw, 3.5rem)",
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
          width: "min(85vw, 340px)",
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
        <div style={{ marginTop: 16, width: "min(85vw, 340px)", position: "relative", zIndex: 1 }}>
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

      {/* Game Over */}
      {result && (
        <div style={{
          position: "absolute", inset: 0,
          background: "rgba(8, 8, 14, 0.92)",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          zIndex: 30, padding: 32,
        }}>
          <div className="result-card" style={{ textAlign: "center" }}>
            <div style={{ fontSize: "3rem", marginBottom: 16 }}>
              {result.type === "bomb" ? "💥" : result.type === "win" ? "🏆" : "🤝"}
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
                marginTop: 16, marginBottom: 24, padding: 12,
                background: "rgba(255,255,255,0.04)", borderRadius: 8, maxWidth: 300,
              }}>
                <div style={{
                  fontFamily: "'Space Mono', monospace", fontSize: "0.5rem",
                  color: "rgba(255,255,255,0.2)", letterSpacing: "0.1em",
                  textTransform: "uppercase", marginBottom: 8,
                }}>Game Log</div>
                {history.map((h, idx) => (
                  <div key={idx} style={{
                    fontFamily: "'Space Mono', monospace", fontSize: "0.55rem",
                    color: "rgba(255,255,255,0.45)", padding: "3px 0",
                    borderBottom: idx < history.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
                    display: "flex", justifyContent: "space-between",
                  }}>
                    <span>
                      T{h.turn}: <span style={{ color: h.player === playerMark ? playerColors.X : playerColors.O }}>
                        {h.player === playerMark ? "You" : "AI"}
                      </span>→{POS_LABELS[h.move]}
                    </span>
                    <span>
                      bomb@{POS_LABELS[h.bomb]} {h.result === "BOOM" ? "💥" : h.result === "WIN" ? "🏆" : "✓"}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
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
