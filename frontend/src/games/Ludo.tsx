import React, { useState, useEffect } from "react";
import { ArrowLeft, RefreshCw, Trophy, Users, Award, Play } from "lucide-react";

interface LudoProps {
  onBack: () => void;
  user: any;
  submitScore: (score: number) => void;
  leaderboard: any[];
  refreshLeaderboard: () => void;
}

// Track coordinates path (total 30 cells from start to home base center)
const LUDO_PATH = [
  { x: 10, y: 40 }, { x: 20, y: 40 }, { x: 30, y: 40 }, { x: 40, y: 40 }, { x: 40, y: 30 },
  { x: 40, y: 20 }, { x: 40, y: 10 }, { x: 50, y: 10 }, { x: 60, y: 10 }, { x: 60, y: 20 },
  { x: 60, y: 30 }, { x: 60, y: 40 }, { x: 70, y: 40 }, { x: 80, y: 40 }, { x: 90, y: 40 },
  { x: 90, y: 50 }, { x: 90, y: 60 }, { x: 80, y: 60 }, { x: 70, y: 60 }, { x: 60, y: 60 },
  { x: 60, y: 70 }, { x: 60, y: 80 }, { x: 60, y: 90 }, { x: 50, y: 90 }, { x: 40, y: 90 },
  { x: 40, y: 80 }, { x: 40, y: 70 }, { x: 40, y: 60 }, { x: 30, y: 60 }, { x: 20, y: 60 },
  { x: 10, y: 60 }, { x: 10, y: 50 } // Index 31 is the center win slot
];

export default function Ludo({
  onBack,
  user,
  submitScore,
  leaderboard,
  refreshLeaderboard
}: LudoProps) {
  const [gameState, setGameState] = useState<"idle" | "playing" | "gameover">("idle");
  const [p1Idx, setP1Idx] = useState(-1); // -1 = inside base
  const [p2Idx, setP2Idx] = useState(-1); // -1 = inside base (Bot)
  const [currentTurn, setCurrentTurn] = useState<"player" | "bot">("player");
  const [diceVal, setDiceVal] = useState<number | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [movesCount, setMovesCount] = useState(0);

  const startNewGame = () => {
    localStorage.setItem("arcade_has_played", "true");
    setP1Idx(-1);
    setP2Idx(-1);
    setCurrentTurn("player");
    setDiceVal(null);
    setMovesCount(0);
    setGameState("playing");
  };

  const rollDice = () => {
    if (gameState !== "playing" || isRolling) return;
    setIsRolling(true);

    let ticks = 0;
    const interval = setInterval(() => {
      setDiceVal(Math.floor(Math.random() * 6) + 1);
      ticks++;
      if (ticks > 6) {
        clearInterval(interval);
        finalizeRoll();
      }
    }, 80);
  };

  const finalizeRoll = () => {
    const roll = Math.floor(Math.random() * 6) + 1;
    setDiceVal(roll);
    setIsRolling(false);

    if (currentTurn === "player") {
      let nextIdx = p1Idx;
      if (p1Idx === -1) {
        // Need a 6 to exit home base
        if (roll === 6) nextIdx = 0;
      } else {
        nextIdx += roll;
      }

      if (nextIdx >= LUDO_PATH.length) {
        nextIdx = p1Idx; // Cannot exceed
      }

      // Check capture opponent base if landing on same spot (except home bases)
      if (nextIdx !== -1 && nextIdx === p2Idx) {
        setP2Idx(-1); // Bot gets captured and sent back to base!
      }

      setP1Idx(nextIdx);
      setMovesCount(prev => prev + 1);

      if (nextIdx === LUDO_PATH.length - 1) {
        setGameState("gameover");
        const finalScore = Math.max(10, 400 - movesCount * 8);
        submitScore(finalScore);
        refreshLeaderboard();
      } else {
        setCurrentTurn("bot");
      }
    } else {
      let nextIdx = p2Idx;
      if (p2Idx === -1) {
        if (roll === 6) nextIdx = 15; // Bot starts from cell index 15 (opposite base)
      } else {
        nextIdx += roll;
      }

      if (nextIdx >= LUDO_PATH.length) {
        nextIdx = p2Idx;
      }

      // Check capture player
      if (nextIdx !== -1 && nextIdx === p1Idx) {
        setP1Idx(-1);
      }

      setP2Idx(nextIdx);

      if (nextIdx === LUDO_PATH.length - 1) {
        setGameState("gameover");
      } else {
        setCurrentTurn("player");
      }
    }
  };

  // Bot AI roll trigger loop
  useEffect(() => {
    if (gameState !== "playing" || currentTurn !== "bot" || isRolling) return;

    const timer = setTimeout(() => {
      rollDice();
    }, 1200);

    return () => clearTimeout(timer);
  }, [currentTurn, gameState]);

  const activeStyle: React.CSSProperties = {
    padding: "0.5rem 0.8rem",
    border: "3px solid #121212",
    backgroundColor: "var(--primary-color)",
    boxShadow: "4px 4px 0px #121212",
    borderRadius: "6px",
    fontWeight: "900",
    transform: "scale(1.05)",
    transition: "all 0.15s ease"
  };

  const inactiveStyle: React.CSSProperties = {
    padding: "0.5rem 0.8rem",
    border: "2px solid #ccc",
    backgroundColor: "#fff",
    opacity: 0.6,
    borderRadius: "6px",
    fontWeight: "800",
    transform: "scale(1)",
    transition: "all 0.15s ease"
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button onClick={onBack} className="neo-btn secondary" style={{ padding: "0.5rem 1rem" }}>
          <ArrowLeft size={18} /> BACK
        </button>
        <h2 className="game-title-text" style={{ fontSize: "0.9rem" }}>LUDO QUICK BATTLE</h2>
        <div style={{ fontWeight: "800", display: "flex", alignItems: "center", gap: "0.3rem" }}>
          🏆 Dice Classic
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: "1.5rem" }} className="game-layout-container">
        
        {/* Arena */}
        <div 
          className="neo-card game-view-box" 
          style={{ 
            display: "flex", 
            flexDirection: "column", 
            alignItems: "center", 
            backgroundColor: "#faf6f0", 
            padding: "1rem",
            justifyContent: "center",
            width: "100%",
            boxSizing: "border-box",
            border: "4px solid #121212",
            boxShadow: "6px 6px 0px 0px #121212",
            minHeight: "360px"
          }}
        >
          {gameState === "idle" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", alignItems: "center", textAlign: "center" }}>
              <Award size={48} color="var(--primary-color)" />
              <h3 style={{ fontWeight: "900", fontSize: "1.3rem" }}>LUDO BATTLE</h3>
              <p style={{ fontSize: "0.85rem", fontWeight: "700", color: "#666" }}>
                Roll a 6 to exit your home base, navigate around the paths, and reach the center goal first. Landing on the bot captures their piece!
              </p>
              <button onClick={startNewGame} className="neo-btn accent">START PLAYING</button>
            </div>
          )}

          {gameState === "playing" && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem", width: "100%" }}>
              
              {/* Turn Lights HUD */}
              <div style={{ display: "flex", justifyContent: "space-between", width: "100%", maxWidth: "320px", alignItems: "center", fontSize: "0.85rem" }}>
                <div style={currentTurn === "player" ? activeStyle : inactiveStyle}>
                  You (Red)
                </div>
                <div style={currentTurn === "bot" ? activeStyle : inactiveStyle}>
                  Bot (Green)
                </div>
              </div>

              {/* Ludo Stylized Board Grid */}
              <div 
                style={{ 
                  position: "relative",
                  width: "100%",
                  maxWidth: "320px",
                  aspectRatio: "1 / 1",
                  backgroundColor: "#fff",
                  border: "4px solid #121212",
                  borderRadius: "8px",
                  boxSizing: "border-box",
                  overflow: "hidden"
                }}
              >
                {/* 4 corner bases */}
                {/* Red Base */}
                <div style={{ position: "absolute", top: 0, left: 0, width: "40%", height: "40%", backgroundColor: "#ffccd5", borderRight: "3px solid #121212", borderBottom: "3px solid #121212", boxSizing: "border-box", display: "flex", justifyContent: "center", alignItems: "center" }}>
                  <div style={{ width: "24px", height: "24px", borderRadius: "50%", backgroundColor: "var(--accent-color)", border: "2px solid #121212" }} />
                </div>
                {/* Green Base */}
                <div style={{ position: "absolute", top: 0, right: 0, width: "40%", height: "40%", backgroundColor: "#d4edda", borderLeft: "3px solid #121212", borderBottom: "3px solid #121212", boxSizing: "border-box", display: "flex", justifyContent: "center", alignItems: "center" }}>
                  <div style={{ width: "24px", height: "24px", borderRadius: "50%", backgroundColor: "var(--secondary-color)", border: "2px solid #121212" }} />
                </div>
                {/* Blue Base */}
                <div style={{ position: "absolute", bottom: 0, left: 0, width: "40%", height: "40%", backgroundColor: "#cce5ff", borderRight: "3px solid #121212", borderTop: "3px solid #121212", boxSizing: "border-box" }} />
                {/* Yellow Base */}
                <div style={{ position: "absolute", bottom: 0, right: 0, width: "40%", height: "40%", backgroundColor: "#fff3cd", borderLeft: "3px solid #121212", borderTop: "3px solid #121212", boxSizing: "border-box" }} />

                {/* Paths */}
                {LUDO_PATH.map((cell, idx) => {
                  const isCenterWin = idx === LUDO_PATH.length - 1;
                  return (
                    <div 
                      key={idx}
                      style={{
                        position: "absolute",
                        left: `${cell.x}%`,
                        top: `${cell.y}%`,
                        width: "10%",
                        height: "10%",
                        border: "1.5px solid #121212",
                        backgroundColor: isCenterWin ? "#ffd700" : "#faf6f0",
                        boxSizing: "border-box",
                        zIndex: 1
                      }}
                    />
                  );
                })}

                {/* Render active tokens */}
                {/* Player 1 (Red) */}
                <div 
                  style={{
                    position: "absolute",
                    width: "20px",
                    height: "20px",
                    borderRadius: "50%",
                    backgroundColor: "var(--accent-color)",
                    border: "2px solid #121212",
                    boxShadow: "2px 2px 0 rgba(18,18,18,0.25)",
                    left: p1Idx === -1 ? "18%" : `${LUDO_PATH[p1Idx].x + 1}%`,
                    top: p1Idx === -1 ? "18%" : `${LUDO_PATH[p1Idx].y + 1}%`,
                    transition: "all 0.35s ease-out",
                    zIndex: 10
                  }}
                />

                {/* Bot (Green) */}
                <div 
                  style={{
                    position: "absolute",
                    width: "20px",
                    height: "20px",
                    borderRadius: "50%",
                    backgroundColor: "var(--secondary-color)",
                    border: "2px solid #121212",
                    boxShadow: "2px 2px 0 rgba(18,18,18,0.25)",
                    left: p2Idx === -1 ? "78%" : `${LUDO_PATH[p2Idx].x + 1}%`,
                    top: p2Idx === -1 ? "18%" : `${LUDO_PATH[p2Idx].y + 1}%`,
                    transition: "all 0.35s ease-out",
                    zIndex: 9
                  }}
                />

              </div>

              {/* Roller button */}
              <div style={{ display: "flex", alignItems: "center", gap: "1rem", width: "100%", maxWidth: "320px", justifyContent: "center" }}>
                {diceVal !== null && (
                  <div 
                    style={{ 
                      width: "48px", 
                      height: "48px", 
                      backgroundColor: "#fff", 
                      border: "3px solid #121212", 
                      borderRadius: "8px", 
                      display: "flex", 
                      justifyContent: "center", 
                      alignItems: "center", 
                      fontSize: "1.5rem", 
                      fontWeight: "900",
                      boxShadow: "3px 3px 0px #121212"
                    }}
                  >
                    {diceVal}
                  </div>
                )}
                <button 
                  onClick={rollDice} 
                  disabled={currentTurn !== "player" || isRolling}
                  className="neo-btn accent"
                  style={{ padding: "0.6rem 1.2rem", fontWeight: "900" }}
                >
                  {isRolling ? "ROLLING..." : "ROLL DICE 🎲"}
                </button>
              </div>

            </div>
          )}

          {gameState === "gameover" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem", alignItems: "center", textAlign: "center" }}>
              <h3 style={{ fontWeight: "900", fontSize: "1.5rem", color: p1Idx === LUDO_PATH.length - 1 ? "var(--secondary-color)" : "var(--accent-color)" }}>
                {p1Idx === LUDO_PATH.length - 1 ? "🏆 YOU WON!" : "💀 BOT AI WON!"}
              </h3>
              <button onClick={startNewGame} className="neo-btn accent">PLAY AGAIN</button>
            </div>
          )}

        </div>

        {/* Leaderboard Panel */}
        <div className="neo-card" style={{ display: "flex", flexDirection: "column", gap: "1rem", height: "fit-content" }}>
          <h3 style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "1.2rem" }}>
            <Trophy size={20} color="var(--primary-color)" /> LEADERBOARD
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {leaderboard.length === 0 ? (
              <p style={{ color: "#666", fontSize: "0.9rem" }}>No scores submitted yet.</p>
            ) : (
              leaderboard.map((entry, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "0.5rem",
                    border: "2px solid var(--border-color)",
                    borderRadius: "4px",
                    backgroundColor: idx === 0 ? "var(--primary-color)" : "#fff",
                    fontWeight: "700",
                    fontSize: "0.9rem"
                  }}
                >
                  <span style={{ display: "flex", gap: "0.4rem" }}>
                    <span>#{idx + 1}</span>
                    <span>{entry.user_name}</span>
                  </span>
                  <span>{entry.score} pts</span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
