import { useState } from "react";
import BombTicTacToeAI from "./BombTTTAI.jsx";
import BombTTTMultiplayer from "./Multiplayer.jsx";

function ModeSelect({ onSelect }) {
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
        fontFamily: "'Space Mono', monospace", fontSize: "0.7rem",
        color: "rgba(255,255,255,0.25)", marginBottom: 48,
        letterSpacing: "0.15em", textTransform: "uppercase",
        position: "relative", zIndex: 1,
        animation: "float-in 0.4s ease-out 0.1s backwards",
      }}>
        Place your mark. Dodge the bomb.
      </div>

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

      <div style={{
        marginTop: 48, fontFamily: "'Space Mono', monospace",
        fontSize: "0.5rem", color: "rgba(255,255,255,0.12)",
        textAlign: "center", maxWidth: 300, lineHeight: 1.7,
        letterSpacing: "0.03em", position: "relative", zIndex: 1,
        animation: "float-in 0.4s ease-out 0.35s backwards",
      }}>
        Each turn: one player secretly plants a bomb, the other places their mark.
        Hit the bomb and you lose. Get three in a row to win.
      </div>
    </div>
  );
}

export default function App() {
  const [mode, setMode] = useState(null);

  if (mode === "ai") return <BombTicTacToeAI />;
  if (mode === "multiplayer") return <BombTTTMultiplayer />;
  return <ModeSelect onSelect={setMode} />;
}
