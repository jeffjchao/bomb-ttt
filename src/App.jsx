import { useState } from "react";
import BombTicTacToeAI from "./BombTTTAI.jsx";
import BombTTTMultiplayer from "./Multiplayer.jsx";

function HowToPlay({ onClose }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 50,
      background: "rgba(8, 8, 14, 0.95)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 20,
      animation: "fade-in 0.25s ease-out",
    }}>
      <div style={{
        background: "#12121a",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 16,
        padding: "32px 28px",
        maxWidth: 420,
        width: "100%",
        maxHeight: "85vh",
        overflowY: "auto",
        position: "relative",
        animation: "slide-up 0.3s ease-out",
      }}>
        {/* Close button */}
        <button onClick={onClose} style={{
          position: "absolute", top: 16, right: 16,
          background: "none", border: "none", color: "rgba(255,255,255,0.3)",
          fontSize: "1.2rem", cursor: "pointer", padding: 4,
          lineHeight: 1, fontFamily: "'Space Mono', monospace",
        }}>✕</button>

        <h2 style={{
          fontSize: "1.3rem", fontWeight: 800, margin: "0 0 20px 0",
          background: "linear-gradient(135deg, #ff5252, #448aff)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        }}>
          How to Play
        </h2>

        {/* The basics */}
        <div style={{ marginBottom: 20 }}>
          <div style={sectionTitleStyle}>The Basics</div>
          <p style={bodyStyle}>
            Bomb Tic-Tac-Toe follows the same goal as classic Tic-Tac-Toe — get three of your marks in a row to win. Two players take turns placing <span style={{ color: "#ff5252", fontWeight: 700 }}>X</span> and <span style={{ color: "#448aff", fontWeight: 700 }}>O</span> on a 3×3 grid.
          </p>
          <p style={bodyStyle}>
            The twist? Before each move, the opposing player secretly plants a <span style={{ fontSize: "0.9em" }}>💣</span> <strong style={{ color: "#e8e8ed" }}>bomb</strong> on one empty cell. If the moving player happens to play on that exact cell — <strong style={{ color: "#ff5252" }}>boom</strong>, they lose instantly.
          </p>
        </div>

        {/* Turn flow */}
        <div style={{ marginBottom: 20 }}>
          <div style={sectionTitleStyle}>How a Turn Works</div>
          <div style={stepContainerStyle}>
            <div style={stepStyle}>
              <div style={stepNumberStyle("#d500f9")}>1</div>
              <div>
                <strong style={{ color: "#d500f9" }}>Bomb phase</strong>
                <span style={stepTextStyle}> — The defending player secretly picks an empty cell to rig with a bomb. The moving player doesn't see where it's placed.</span>
              </div>
            </div>
            <div style={stepStyle}>
              <div style={stepNumberStyle("#4caf50")}>2</div>
              <div>
                <strong style={{ color: "#4caf50" }}>Move phase</strong>
                <span style={stepTextStyle}> — The moving player places their mark (<span style={{ color: "#ff5252", fontWeight: 700 }}>X</span> or <span style={{ color: "#448aff", fontWeight: 700 }}>O</span>) on any empty cell.</span>
              </div>
            </div>
            <div style={stepStyle}>
              <div style={stepNumberStyle("#ff9800")}>3</div>
              <div>
                <strong style={{ color: "#ff9800" }}>Resolve</strong>
                <span style={stepTextStyle}> — If the mark lands on the bomb, the mover loses. Otherwise, the bomb is revealed, roles swap, and the next turn begins.</span>
              </div>
            </div>
          </div>
          <p style={{ ...bodyStyle, marginTop: 10 }}>
            Both actions happen simultaneously — the bomber and mover each make their choice at the same time, and the server resolves the outcome once both have locked in.
          </p>
        </div>

        {/* Win conditions */}
        <div style={{ marginBottom: 20 }}>
          <div style={sectionTitleStyle}>Ways to Win</div>
          <div style={stepContainerStyle}>
            <div style={stepStyle}>
              <span style={{ fontSize: "1.1rem", marginRight: 10, flexShrink: 0 }}>🏆</span>
              <span style={stepTextStyle}><strong style={{ color: "#e8e8ed" }}>Three in a row</strong> — just like classic Tic-Tac-Toe, line up three of your marks horizontally, vertically, or diagonally.</span>
            </div>
            <div style={stepStyle}>
              <span style={{ fontSize: "1.1rem", marginRight: 10, flexShrink: 0 }}>💥</span>
              <span style={stepTextStyle}><strong style={{ color: "#e8e8ed" }}>Bomb hit</strong> — your opponent steps on the bomb you planted. You win, they lose.</span>
            </div>
          </div>
        </div>

        {/* Strategy */}
        <div style={{ marginBottom: 24 }}>
          <div style={sectionTitleStyle}>Strategy Tips</div>
          <p style={bodyStyle}>
            <strong style={{ color: "#e8e8ed" }}>As the mover:</strong> Avoid having one obviously "best" move. If the bomber can predict where you'll play, they'll plant the bomb there. Create situations where multiple cells look equally good so the bomber has to guess.
          </p>
          <p style={bodyStyle}>
            <strong style={{ color: "#e8e8ed" }}>As the bomber:</strong> Think about what your opponent wants most. Are they one move from winning? That winning cell is a great bomb target. Are they likely to take center or a corner? Read their patterns and punish habits.
          </p>
          <p style={{ ...bodyStyle, color: "rgba(255,255,255,0.3)", fontStyle: "italic" }}>
            The deeper game is about bluffing and misdirection — threatening lines you don't intend to complete, and bombing cells your opponent thinks are safe.
          </p>
        </div>

        {/* Close */}
        <button onClick={onClose} style={{
          width: "100%", padding: "12px 0",
          background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 8, color: "#e8e8ed",
          fontFamily: "'Instrument Sans', sans-serif", fontWeight: 600,
          fontSize: "0.95rem", cursor: "pointer", transition: "all 0.2s",
        }}>
          Got it!
        </button>
      </div>
    </div>
  );
}

const sectionTitleStyle = {
  fontFamily: "'Space Mono', monospace",
  fontSize: "0.6rem",
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "rgba(255,255,255,0.35)",
  marginBottom: 10,
};

const bodyStyle = {
  fontSize: "0.85rem",
  color: "rgba(255,255,255,0.55)",
  lineHeight: 1.65,
  margin: "0 0 10px 0",
};

const stepContainerStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 10,
};

const stepStyle = {
  display: "flex",
  alignItems: "flex-start",
  gap: 10,
};

const stepNumberStyle = (color) => ({
  width: 22, height: 22, minWidth: 22,
  borderRadius: "50%",
  background: `${color}22`,
  border: `1px solid ${color}44`,
  color: color,
  display: "flex", alignItems: "center", justifyContent: "center",
  fontSize: "0.65rem", fontWeight: 700,
  fontFamily: "'Space Mono', monospace",
  marginTop: 2,
});

const stepTextStyle = {
  fontSize: "0.8rem",
  color: "rgba(255,255,255,0.5)",
  lineHeight: 1.55,
};

function ModeSelect({ onSelect }) {
  const [showHelp, setShowHelp] = useState(false);

  return (
    <div style={{
      minHeight: "100vh", background: "#0a0a0f",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: 32, fontFamily: "'Instrument Sans', sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700;800&family=Space+Mono:wght@400;700&display=swap');

        @keyframes float-in {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }

        @keyframes fade-in {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }

        @keyframes slide-up {
          0% { opacity: 0; transform: translateY(30px) scale(0.97); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }

        .mode-btn {
          padding: 20px 40px;
          background: rgba(255,255,255,0.04);
          border-radius: 12px;
          cursor: pointer;
          text-align: left;
          transition: all 0.25s ease;
          font-family: 'Instrument Sans', sans-serif;
          animation: float-in 0.5s ease-out backwards;
        }

        .mode-btn:hover {
          transform: translateY(-2px);
        }

        .help-btn {
          transition: all 0.2s ease;
        }
        .help-btn:hover {
          color: rgba(255,255,255,0.7) !important;
          transform: translateY(-1px);
        }
      `}</style>

      <div style={{
        position: "fixed", inset: 0,
        backgroundImage: "radial-gradient(circle at 20% 30%, rgba(255,82,82,0.04) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(68,138,255,0.04) 0%, transparent 50%)",
        pointerEvents: "none",
      }} />

      <h1 style={{
        fontSize: "clamp(1.6rem, 6vw, 2.4rem)", fontWeight: 800, margin: 0, marginBottom: 6,
        letterSpacing: "-0.03em",
        background: "linear-gradient(135deg, #ff5252, #ff8a80, #448aff)",
        WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        position: "relative", zIndex: 1,
        animation: "float-in 0.4s ease-out",
      }}>
        BOMB TIC-TAC-TOE
      </h1>
      <div style={{
        fontFamily: "'Space Mono', monospace", fontSize: "0.7rem", fontWeight: "bold",
        color: "rgba(255,255,255,0.25)", marginBottom: 24,
        letterSpacing: "0.15em", textTransform: "uppercase",
        position: "relative", zIndex: 1,
        animation: "float-in 0.4s ease-out 0.1s backwards",
      }}>
        Place your mark. Dodge the bomb.
      </div>

          {/* How to Play button */}
          <button
            className="help-btn"
            onClick={() => setShowHelp(true)}
            style={{
              marginTop: 0,
              marginBottom: 16,
              background: "none",
              border: "1px solid rgba(255,255,255,0.4)",
              borderRadius: 8,
              padding: "10px 24px",
              color: "rgba(255,255,255,0.35)",
              fontFamily: "'Space Mono', monospace", //OLD fontFamily: "'Space Mono', monospace",
              fontSize: "0.8rem",
              fontWeight: 900,
              letterSpacing: "0.08em",
              cursor: "pointer",
              position: "relative",
              zIndex: 1,
              animation: "float-in 0.4s ease-out 0.3s backwards",
            }}
          >
            ? &nbsp;How to Play
          </button>

      <div style={{
        display: "flex", flexDirection: "column", gap: 16,
        position: "relative", zIndex: 1, width: "min(85vw, 340px)",
      }}>

        <button
          className="mode-btn"
          style={{
            border: "1px solid rgba(255, 82, 82, 0.2)",
            animationDelay: "0.15s",
          }}
          onClick={() => onSelect("ai")}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255, 82, 82, 0.08)";
            e.currentTarget.style.borderColor = "rgba(255, 82, 82, 0.4)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.04)";
            e.currentTarget.style.borderColor = "rgba(255, 82, 82, 0.2)";
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{ fontSize: "1.6rem" }}>🤖</span>
            <div>
              <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#ff5252", marginBottom: 4 }}>
                vs AI
              </div>
              <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)", lineHeight: 1.4 }}>
                Four difficulty levels — from random to adaptive
              </div>
            </div>
          </div>
        </button>

        <button
          className="mode-btn"
          style={{
            border: "1px solid rgba(68, 138, 255, 0.2)",
            animationDelay: "0.25s",
          }}
          onClick={() => onSelect("multiplayer")}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(68, 138, 255, 0.08)";
            e.currentTarget.style.borderColor = "rgba(68, 138, 255, 0.4)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.04)";
            e.currentTarget.style.borderColor = "rgba(68, 138, 255, 0.2)";
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{ fontSize: "1.6rem" }}>👥</span>
            <div>
              <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#448aff", marginBottom: 4 }}>
                Multiplayer
              </div>
              <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)", lineHeight: 1.4 }}>
                Create or join a room — play a friend online
              </div>
            </div>
          </div>
        </button>
      </div>
      {showHelp && <HowToPlay onClose={() => setShowHelp(false)} />}
    </div>
  );
}

export default function App() {
  const [mode, setMode] = useState(null);

  if (mode === "ai") return <BombTicTacToeAI />;
  if (mode === "multiplayer") return <BombTTTMultiplayer />;
  return <ModeSelect onSelect={setMode} />;
}
