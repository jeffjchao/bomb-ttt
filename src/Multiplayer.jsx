import { useState, useCallback, useEffect, useRef } from "react";

const EMPTY = null;
const POS_LABELS = ["TL", "TC", "TR", "ML", "MC", "MR", "BL", "BC", "BR"];

// -------- UPDATE THIS after deploying your backend to Render --------
const SERVER_URL = "wss://bomb-ttt-server.onrender.com/ws";
// For local testing: "ws://localhost:8000/ws"
// --------------------------------------------------------------------

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
    <div style={{
      position: "absolute",
      top: `${row * 33.33 + 16.66}%`,
      left: `${col * 33.33 + 16.66}%`,
      width: 0, height: 0, zIndex: 20, pointerEvents: "none",
    }}>
      {particles.map((p) => (
        <div key={p.id} style={{
          position: "absolute", width: p.size, height: p.size, borderRadius: "50%",
          background: ["#ff4444", "#ff8800", "#ffcc00", "#ff6622"][p.id % 4],
          animation: `explode-particle 0.7s ${p.delay}s ease-out forwards`,
          opacity: 0, transform: "translate(-50%, -50%) scale(0)",
          "--tx": `${Math.cos((p.angle * Math.PI) / 180) * p.dist}px`,
          "--ty": `${Math.sin((p.angle * Math.PI) / 180) * p.dist}px`,
        }} />
      ))}
    </div>
  );
}

// -------- LOBBY --------

function Lobby({ onConnect }) {
  const [mode, setMode] = useState(null);
  const [joinCode, setJoinCode] = useState("");
  const [status, setStatus] = useState("");
  const [connecting, setConnecting] = useState(false);

  const handleCreate = () => {
    setConnecting(true);
    setStatus("Creating room...");
    onConnect("NEW", setStatus);
  };

  const handleJoin = () => {
    if (joinCode.length !== 4) {
      setStatus("Code must be 4 letters");
      return;
    }
    setConnecting(true);
    setStatus("Joining room...");
    onConnect(joinCode.toUpperCase(), setStatus);
  };

  return (
    <div style={{
      minHeight: "100vh", background: "#0a0a0f",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: 32, fontFamily: "'Instrument Sans', sans-serif",
    }}>
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
        multiplayer
      </div>

      {!mode && !connecting && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14, position: "relative", zIndex: 1 }}>
          <button onClick={() => setMode("create")} style={lobbyBtnStyle("#ff5252")}>
            <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#ff5252", marginBottom: 4 }}>Create Game</div>
            <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)" }}>Get a room code to share with a friend</div>
          </button>
          <button onClick={() => setMode("join")} style={lobbyBtnStyle("#448aff")}>
            <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#448aff", marginBottom: 4 }}>Join Game</div>
            <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)" }}>Enter a friend's room code</div>
          </button>
        </div>
      )}

      {mode === "create" && !connecting && (
        <div style={{ textAlign: "center", position: "relative", zIndex: 1 }}>
          <button onClick={handleCreate} style={{
            ...actionBtnBase, background: "#ff5252", color: "#fff", fontSize: "1.1rem", padding: "16px 40px",
          }}>
            Create Room
          </button>
          <div style={{ marginTop: 12 }}>
            <button onClick={() => setMode(null)} style={{ ...linkBtnStyle }}>← Back</button>
          </div>
        </div>
      )}

      {mode === "join" && !connecting && (
        <div style={{ textAlign: "center", position: "relative", zIndex: 1 }}>
          <input
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4))}
            placeholder="ABCD"
            maxLength={4}
            style={{
              background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: 8, padding: "14px 20px", fontSize: "1.5rem", fontWeight: 700,
              color: "#e8e8ed", textAlign: "center", letterSpacing: "0.3em", width: 180,
              fontFamily: "'Space Mono', monospace", outline: "none",
            }}
          />
          <div style={{ marginTop: 16 }}>
            <button onClick={handleJoin} style={{
              ...actionBtnBase, background: "#448aff", color: "#fff", padding: "12px 36px",
            }}>
              Join
            </button>
          </div>
          <div style={{ marginTop: 12 }}>
            <button onClick={() => setMode(null)} style={{ ...linkBtnStyle }}>← Back</button>
          </div>
        </div>
      )}

      {connecting && (
        <div style={{
          fontFamily: "'Space Mono', monospace", fontSize: "0.8rem",
          color: "rgba(255,255,255,0.5)", position: "relative", zIndex: 1,
        }}>
          {status}
        </div>
      )}

      {status && !connecting && (
        <div style={{
          marginTop: 16, fontFamily: "'Space Mono', monospace", fontSize: "0.7rem",
          color: "#ff5252", position: "relative", zIndex: 1,
        }}>
          {status}
        </div>
      )}
    </div>
  );
}

const lobbyBtnStyle = (color) => ({
  padding: "16px 36px", background: "rgba(255,255,255,0.04)",
  border: `1px solid ${color}33`, borderRadius: 10,
  cursor: "pointer", textAlign: "left", transition: "all 0.2s",
  fontFamily: "'Instrument Sans', sans-serif",
});

const actionBtnBase = {
  border: "none", borderRadius: 8, fontFamily: "'Instrument Sans', sans-serif",
  fontWeight: 600, cursor: "pointer", transition: "all 0.2s", letterSpacing: "0.02em",
};

const linkBtnStyle = {
  background: "none", border: "none", color: "rgba(255,255,255,0.3)",
  fontFamily: "'Space Mono', monospace", fontSize: "0.7rem", cursor: "pointer",
};

// -------- MAIN GAME --------

export default function BombTTTMultiplayer() {
  const [screen, setScreen] = useState("lobby");
  const [roomCode, setRoomCode] = useState("");
  const [myMark, setMyMark] = useState(null);
  const [board, setBoard] = useState(Array(9).fill(EMPTY));
  const [turnNumber, setTurnNumber] = useState(1);
  const [scores, setScores] = useState({ X: 0, O: 0 });
  const [myRole, setMyRole] = useState(null); // "bomber" | "mover"
  const [actionLocked, setActionLocked] = useState(false); // Have I submitted?
  const [statusMessage, setStatusMessage] = useState("");
  const [result, setResult] = useState(null);
  const [winLine, setWinLine] = useState(null);
  const [explodedCell, setExplodedCell] = useState(null);
  const [shaking, setShaking] = useState(false);
  const [lastBombReveal, setLastBombReveal] = useState(null);
  const [history, setHistory] = useState([]);
  const [mySelectedCell, setMySelectedCell] = useState(null);
  const [opponentDisconnected, setOpponentDisconnected] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  const wsRef = useRef(null);
  const playerColors = { X: "#ff5252", O: "#448aff" };

  const sendMessage = useCallback((msg) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  const handleConnect = useCallback((code, setLobbyStatus) => {
    const ws = new WebSocket(`${SERVER_URL}/${code}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setLobbyStatus("Connected, waiting...");
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      handleServerMessage(msg);
    };

    ws.onerror = () => {
      setLobbyStatus("Connection failed. Is the server running?");
    };

    ws.onclose = () => {
      if (screen !== "lobby") {
        setOpponentDisconnected(true);
        setGameOver(true);
      }
    };
  }, []);

  const handleServerMessage = useCallback((msg) => {
    switch (msg.type) {
      case "room_created":
        setRoomCode(msg.room_code);
        setMyMark(msg.your_mark);
        setScreen("waiting");
        break;

      case "room_joined":
        setRoomCode(msg.room_code);
        setMyMark(msg.your_mark);
        setScreen("game");
        break;

      case "opponent_joined":
        setScreen("game");
        break;

      case "your_action":
        setBoard(msg.board);
        setTurnNumber(msg.turn_number);
        setScores(msg.scores);
        setHistory(msg.history);
        setMyRole(msg.role);
        setActionLocked(false);
        setMySelectedCell(null);
        setLastBombReveal(null);
        setStatusMessage(msg.message);
        setGameOver(false);
        break;

      case "action_confirmed":
        setActionLocked(true);
        setMySelectedCell(msg.cell);
        setStatusMessage("Locked in! Waiting for opponent...");
        break;

      case "turn_result": {
        setBoard(msg.board);
        setScores(msg.scores);
        setHistory(msg.history);
        setTurnNumber(msg.turn_number);

        if (msg.outcome === "bomb_hit") {
          setExplodedCell(msg.move_cell);
          setShaking(true);
          setTimeout(() => setShaking(false), 500);
          setTimeout(() => {
            setResult({
              type: "bomb",
              loserMark: msg.loser_mark,
              winnerMark: msg.winner_mark,
            });
            setGameOver(true);
          }, 1200);
        } else if (msg.outcome === "win") {
          setWinLine(msg.win_line);
          setTimeout(() => {
            setResult({ type: "win", winnerMark: msg.winner_mark });
            setGameOver(true);
          }, 600);
        } else if (msg.outcome === "draw") {
          setTimeout(() => {
            setResult({ type: "draw" });
            setGameOver(true);
          }, 400);
        } else if (msg.outcome === "safe") {
          setLastBombReveal({ bomb: msg.bomb_cell, move: msg.move_cell });
          setMySelectedCell(null);
          setActionLocked(false);
        }
        break;
      }

      case "new_game":
        setBoard(msg.board);
        setScores(msg.scores);
        setHistory([]);
        setResult(null);
        setWinLine(null);
        setExplodedCell(null);
        setLastBombReveal(null);
        setMySelectedCell(null);
        setActionLocked(false);
        setTurnNumber(1);
        setGameOver(false);
        break;

      case "opponent_disconnected":
        setOpponentDisconnected(true);
        setGameOver(true);
        break;

      case "error":
        setStatusMessage(msg.message);
        break;
    }
  }, []);

  useEffect(() => {
    if (wsRef.current) {
      wsRef.current.onmessage = (event) => {
        handleServerMessage(JSON.parse(event.data));
      };
    }
  }, [handleServerMessage]);

  const handleCellClick = (index) => {
    if (board[index] !== EMPTY) return;
    if (actionLocked || gameOver) return;
    if (!myRole) return;

    if (myRole === "bomber") {
      sendMessage({ action: "bomb", cell: index });
    } else if (myRole === "mover") {
      sendMessage({ action: "move", cell: index });
    }
  };

  const handlePlayAgain = () => {
    setResult(null);
    setWinLine(null);
    setExplodedCell(null);
    setLastBombReveal(null);
    setMySelectedCell(null);
    setGameOver(false);
    sendMessage({ action: "play_again" });
  };

  const handleLeave = () => {
    if (wsRef.current) wsRef.current.close();
    setScreen("lobby");
    setResult(null);
    setMyRole(null);
    setBoard(Array(9).fill(EMPTY));
    setOpponentDisconnected(false);
    setMySelectedCell(null);
    setActionLocked(false);
    setGameOver(false);
  };

  // ---- LOBBY ----
  if (screen === "lobby") {
    return (
      <>
        <style>{globalStyles}</style>
        <Lobby onConnect={handleConnect} />
      </>
    );
  }

  // ---- WAITING ----
  if (screen === "waiting") {
    return (
      <>
        <style>{globalStyles}</style>
        <div style={{
          minHeight: "100vh", background: "#0a0a0f",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          padding: 32, fontFamily: "'Instrument Sans', sans-serif", color: "#e8e8ed",
        }}>
          <div style={{
            position: "fixed", inset: 0,
            backgroundImage: "radial-gradient(circle at 20% 30%, rgba(255,82,82,0.04) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(68,138,255,0.04) 0%, transparent 50%)",
            pointerEvents: "none",
          }} />
          <div style={{ textAlign: "center", position: "relative", zIndex: 1 }}>
            <div style={{ fontSize: "1rem", color: "rgba(255,255,255,0.5)", marginBottom: 16 }}>
              Share this code with your friend:
            </div>
            <div style={{
              fontSize: "3rem", fontWeight: 800, letterSpacing: "0.3em",
              fontFamily: "'Space Mono', monospace", color: "#ff5252", marginBottom: 8,
            }}>
              {roomCode}
            </div>
            <div style={{
              fontSize: "0.7rem", color: "rgba(255,255,255,0.3)",
              fontFamily: "'Space Mono', monospace", marginBottom: 32,
            }}>
              You are Player 1 (X)
            </div>
            <div style={{
              fontSize: "0.8rem", color: "rgba(255,255,255,0.4)",
              animation: "pulse-dot 1.5s ease-in-out infinite",
            }}>
              Waiting for opponent to join...
            </div>
            <div style={{ marginTop: 24 }}>
              <button onClick={handleLeave} style={{
                ...actionBtnBase, background: "rgba(255,255,255,0.1)", color: "#e8e8ed", padding: "10px 24px",
                fontSize: "0.85rem",
              }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ---- GAME ----
  const getCellStyle = (index) => {
    const isExploded = explodedCell === index;
    const isWinCell = winLine && winLine.includes(index);
    const isEmpty = board[index] === EMPTY;
    const isClickable = isEmpty && !actionLocked && !gameOver && myRole;
    const isLastBomb = lastBombReveal && lastBombReveal.bomb === index;
    const isMySelection = mySelectedCell === index && actionLocked;

    let bg = "rgba(255,255,255,0.03)";
    if (isExploded) bg = "rgba(255, 68, 68, 0.25)";
    else if (isWinCell) bg = "rgba(76, 175, 80, 0.15)";
    else if (isMySelection) bg = myRole === "bomber" ? "rgba(213, 0, 249, 0.12)" : "rgba(76, 175, 80, 0.12)";
    else if (isLastBomb) bg = "rgba(255, 152, 0, 0.08)";

    return {
      width: "100%", aspectRatio: "1",
      display: "flex", alignItems: "center", justifyContent: "center",
      background: bg, border: "none",
      cursor: isClickable ? "pointer" : "default",
      fontSize: "clamp(2rem, 8vw, 3.5rem)",
      fontFamily: "'Instrument Sans', sans-serif", fontWeight: 800,
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

  const roleLabel = myRole === "bomber" ? "Plant a bomb 💣" : `Place your ${myMark}`;
  const roleColor = myRole === "bomber" ? "#d500f9" : playerColors[myMark];

  return (
    <div style={{
      minHeight: "100vh", background: "#0a0a0f", color: "#e8e8ed",
      fontFamily: "'Instrument Sans', sans-serif",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "20px", position: "relative", overflow: "hidden",
    }}>
      <style>{globalStyles}</style>

      <div style={{
        position: "fixed", inset: 0,
        backgroundImage: "radial-gradient(circle at 20% 30%, rgba(255,82,82,0.04) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(68,138,255,0.04) 0%, transparent 50%)",
        pointerEvents: "none",
      }} />

      {/* Header */}
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
          fontFamily: "'Space Mono', monospace", fontSize: "0.6rem",
          color: "rgba(255,255,255,0.3)", marginTop: 4, letterSpacing: "0.1em",
        }}>
          Room {roomCode} · You are <span style={{ color: playerColors[myMark], fontWeight: 700 }}>{myMark}</span>
        </div>
      </div>

      {/* Scoreboard */}
      <div style={{ display: "flex", gap: 40, marginBottom: 16, position: "relative", zIndex: 1 }}>
        {["X", "O"].map((m) => (
          <div key={m} style={{ textAlign: "center" }}>
            <div style={{
              fontFamily: "'Space Mono', monospace", fontSize: "0.6rem",
              color: playerColors[m], letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 2,
            }}>
              {m === myMark ? "YOU" : "THEM"} ({m})
            </div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: playerColors[m] }}>
              {scores[m]}
            </div>
          </div>
        ))}
      </div>

      {/* Status */}
      {!gameOver && (
        <div style={{
          marginBottom: 14, textAlign: "center", animation: "fade-in-up 0.3s ease-out",
          position: "relative", zIndex: 1, minHeight: 44,
        }}>
          <div style={{
            fontFamily: "'Space Mono', monospace", fontSize: "0.6rem",
            letterSpacing: "0.12em", color: "rgba(255,255,255,0.3)",
            textTransform: "uppercase", marginBottom: 4,
          }}>
            Turn {turnNumber} · {myRole === "bomber" ? "Defending" : "Attacking"}
          </div>
          <div style={{ fontSize: "0.9rem", color: actionLocked ? "rgba(255,255,255,0.4)" : roleColor }}>
            {actionLocked ? (
              <>
                Locked in! Waiting for opponent
                <span style={{ animation: "pulse-dot 1s ease-in-out infinite" }}> .</span>
                <span style={{ animation: "pulse-dot 1s ease-in-out 0.2s infinite" }}>.</span>
                <span style={{ animation: "pulse-dot 1s ease-in-out 0.4s infinite" }}>.</span>
              </>
            ) : (
              <span style={{ fontWeight: 700 }}>{roleLabel}</span>
            )}
          </div>
        </div>
      )}

      {/* Board */}
      <div style={{ animation: shaking ? "screen-shake 0.5s ease-out" : "none" }}>
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
                disabled={actionLocked || gameOver || board[i] !== EMPTY}
              >
                {cell && (
                  <span className="cell-mark" style={{
                    filter: explodedCell === i ? "blur(2px) brightness(2)"
                      : winLine && winLine.includes(i) ? "drop-shadow(0 0 8px currentColor)" : "none",
                  }}>
                    {cell}
                  </span>
                )}
                {/* Show my locked-in selection */}
                {!cell && mySelectedCell === i && actionLocked && (
                  <span style={{
                    position: "absolute", fontSize: "1.2rem", opacity: 0.4,
                    pointerEvents: "none",
                  }}>
                    {myRole === "bomber" ? "💣" : myMark}
                  </span>
                )}
              </button>
            </div>
          ))}
          {explodedCell !== null && <ExplosionEffect cellIndex={explodedCell} />}
        </div>
      </div>

      {/* Last bomb reveal */}
      {lastBombReveal && !gameOver && (
        <div style={{
          marginTop: 12, fontFamily: "'Space Mono', monospace",
          fontSize: "0.6rem", color: "rgba(255,255,255,0.25)",
          textAlign: "center", position: "relative", zIndex: 1,
          animation: "fade-in-up 0.3s ease-out",
        }}>
          Bomb was at {POS_LABELS[lastBombReveal.bomb]}, move was {POS_LABELS[lastBombReveal.move]} — safe!
        </div>
      )}

      {/* Game Over */}
      {gameOver && (result || opponentDisconnected) && (
        <div style={{
          position: "absolute", inset: 0,
          background: "rgba(8, 8, 14, 0.92)",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          zIndex: 30, padding: 32,
        }}>
          <div className="result-card" style={{ textAlign: "center" }}>
            {opponentDisconnected && !result ? (
              <>
                <div style={{ fontSize: "3rem", marginBottom: 16 }}>👋</div>
                <div style={{ fontSize: "1.4rem", fontWeight: 800, marginBottom: 8, color: "#e8e8ed" }}>
                  Opponent disconnected
                </div>
              </>
            ) : result && (
              <>
                <div style={{ fontSize: "3rem", marginBottom: 16 }}>
                  {result.type === "bomb" ? "💥" : result.type === "win" ? "🏆" : "🤝"}
                </div>
                <div style={{
                  fontSize: "1.4rem", fontWeight: 800, marginBottom: 8,
                  color: result.type === "draw" ? "#e8e8ed"
                    : result.winnerMark === myMark ? "#4caf50" : "#ff5252",
                }}>
                  {result.type === "bomb"
                    ? (result.loserMark === myMark ? "You hit the bomb!" : "Your bomb found its target!")
                    : result.type === "win"
                      ? (result.winnerMark === myMark ? "You win!" : "You lose!")
                      : "It's a draw!"}
                </div>
              </>
            )}

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
                      T{h.turn}: <span style={{ color: playerColors[h.player] }}>
                        {h.player === myMark ? "You" : "Them"}
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
              {!opponentDisconnected && (
                <button className="action-btn" onClick={handlePlayAgain} style={{
                  background: "rgba(255,255,255,0.1)", color: "#e8e8ed",
                }}>
                  Play Again
                </button>
              )}
              <button className="action-btn" onClick={handleLeave} style={{
                background: "rgba(255,255,255,0.1)", color: "#e8e8ed",
              }}>
                Leave
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const globalStyles = `
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
  .cell-btn:hover { background: rgba(255,255,255,0.08) !important; }
  .cell-mark { animation: cell-pop 0.3s ease-out; }
  .result-card { animation: fade-in-up 0.5s ease-out; }
  .action-btn {
    padding: 12px 32px; border: none; border-radius: 8px;
    font-family: 'Instrument Sans', sans-serif; font-weight: 600;
    font-size: 1rem; cursor: pointer; transition: all 0.2s ease;
    letter-spacing: 0.02em;
  }
  .action-btn:hover { transform: translateY(-1px); filter: brightness(1.1); }
`;
