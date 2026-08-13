import React, { useState, useEffect } from "react";
import { ArrowLeft, RefreshCw, Trophy, Users, Shield, Compass, RefreshCcw } from "lucide-react";

interface SnakeLadderProps {
  onBack: () => void;
  user: any;
  submitScore: (score: number) => void;
  leaderboard: any[];
  refreshLeaderboard: () => void;
}

// Map representing Snake and Ladder redirects (key = start cell, value = destination cell)
const SNAKES_LADDERS: { [key: number]: number } = {
  // Snakes (downward)
  98: 28,
  84: 44,
  56: 18,
  46: 5,
  32: 10,
  
  // Ladders (upward)
  4: 25,
  13: 46,
  33: 69,
  50: 82,
  62: 95
};

export default function SnakeLadder({
  onBack,
  user,
  submitScore,
  leaderboard,
  refreshLeaderboard
}: SnakeLadderProps) {
  const [gameState, setGameState] = useState<"idle" | "playing" | "gameover">("idle");
  const [p1Pos, setP1Pos] = useState(1);
  const [p2Pos, setP2Pos] = useState(1); // Bot position
  const [currentTurn, setCurrentTurn] = useState<"player" | "bot">("player");
  const [diceVal, setDiceVal] = useState<number | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [movesCount, setMovesCount] = useState(0);

  const startNewGame = () => {
    localStorage.setItem("arcade_has_played", "true");
    setP1Pos(1);
    setP2Pos(1);
    setCurrentTurn("player");
    setDiceVal(null);
    setMovesCount(0);
    setGameState("playing");
  };

  const rollDice = () => {
    if (gameState !== "playing" || isRolling) return;

    setIsRolling(true);
    // Simulate dice rolling animation
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
      let nextPos = p1Pos + roll;
      if (nextPos > 100) nextPos = p1Pos; // Must land exactly on 100

      // Apply snake or ladder redirect
      if (SNAKES_LADDERS[nextPos]) {
        nextPos = SNAKES_LADDERS[nextPos];
      }

      setP1Pos(nextPos);
      setMovesCount(prev => prev + 1);

      if (nextPos === 100) {
        setGameState("gameover");
        const finalScore = Math.max(10, 500 - movesCount * 10);
        submitScore(finalScore);
        refreshLeaderboard();
      } else {
        setCurrentTurn("bot");
      }
    } else {
      let nextPos = p2Pos + roll;
      if (nextPos > 100) nextPos = p2Pos;

      if (SNAKES_LADDERS[nextPos]) {
        nextPos = SNAKES_LADDERS[nextPos];
      }

      setP2Pos(nextPos);

      if (nextPos === 100) {
        setGameState("gameover");
      } else {
        setCurrentTurn("player");
      }
    }
  };

  // Bot thinking loop when it is the Bot's turn
  useEffect(() => {
    if (gameState !== "playing" || currentTurn !== "bot" || isRolling) return;

    const botTimer = setTimeout(() => {
      rollDice();
    }, 1200);

    return () => clearTimeout(botTimer);
  }, [currentTurn, gameState]);

  // Visual helper: returns grid position (x, y coords percentage) for token rendering
  const getCellCoords = (cellNum: number) => {
    const zeroIndexed = cellNum - 1;
    const row = Math.floor(zeroIndexed / 10);
    let col = zeroIndexed % 10;
    // Boustrophedon grid: alternate row direction
    if (row % 2 === 1) {
      col = 9 - col;
    }
    
    // Bottom row starts at bottom, so y-axis is inverted
    const yPercent = 90 - row * 10;
    const xPercent = col * 10;
    return { x: xPercent, y: yPercent };
  };

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
        <h2 className="game-title-text mobile-hide" style={{ fontSize: "0.9rem" }}>SNAKES & LADDERS</h2>
        <div style={{ fontWeight: "800", display: "flex", alignItems: "center", gap: "0.3rem" }}>
          🐍 Board Battle
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
              <Compass size={48} color="var(--primary-color)" />
              <h3 style={{ fontWeight: "900", fontSize: "1.3rem" }}>SNAKES & LADDERS</h3>
              <p style={{ fontSize: "0.85rem", fontWeight: "700", color: "#666" }}>
                Roll the dice and race to 100! Ladders climb you up, and snakes slide you back down. Play offline vs the AI bot!
              </p>
              <button onClick={startNewGame} className="neo-btn accent">START PLAYING</button>
            </div>
          )}

          {gameState === "playing" && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem", width: "100%" }}>
              
              {/* Turn Lights HUD */}
              <div style={{ display: "flex", justifyContent: "space-between", width: "100%", maxWidth: "320px", alignItems: "center", fontSize: "0.85rem" }}>
                <div style={currentTurn === "player" ? activeStyle : inactiveStyle}>
                  You (Red) - Cell {p1Pos}
                </div>
                <div style={currentTurn === "bot" ? activeStyle : inactiveStyle}>
                  Bot AI (Blue) - Cell {p2Pos}
                </div>
              </div>

              {/* 10x10 Board */}
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
                {/* Render Grid cells */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(10, 1fr)", gridTemplateRows: "repeat(10, 1fr)", width: "100%", height: "100%" }}>
                  {Array.from({ length: 100 }).map((_, idx) => {
                    const cellNum = 100 - idx; // Start rendering from top-left (100) to bottom-right
                    // Alternate background colors for chess look
                    const isEven = (Math.floor((cellNum - 1) / 10) + ((cellNum - 1) % 10)) % 2 === 0;
                    
                    // Label cell redirect anchors
                    const isSnakeHead = !!SNAKES_LADDERS[cellNum] && SNAKES_LADDERS[cellNum] < cellNum;
                    const isLadderBottom = !!SNAKES_LADDERS[cellNum] && SNAKES_LADDERS[cellNum] > cellNum;

                    return (
                      <div 
                        key={idx}
                        style={{
                          backgroundColor: isEven ? "#faf6f0" : "#fff",
                          border: "1px solid #e2dcd0",
                          display: "flex",
                          justifyContent: "center",
                          alignItems: "center",
                          fontSize: "0.55rem",
                          fontWeight: "800",
                          color: isSnakeHead ? "var(--accent-color)" : isLadderBottom ? "var(--secondary-color)" : "#666",
                          position: "relative",
                          boxSizing: "border-box"
                        }}
                      >
                        {cellNum}
                        {isSnakeHead && <span style={{ position: "absolute", bottom: 0, fontSize: "0.5rem" }}>🐍</span>}
                        {isLadderBottom && <span style={{ position: "absolute", bottom: 0, fontSize: "0.5rem" }}>🪜</span>}
                      </div>
                    );
                  })}
                </div>

                {/* Render Tokens */}
                {/* Player 1 (Red) */}
                <div 
                  style={{
                    position: "absolute",
                    width: "16px",
                    height: "16px",
                    borderRadius: "50%",
                    backgroundColor: "var(--accent-color)",
                    border: "2px solid #121212",
                    boxShadow: "2px 2px 0 rgba(18,18,18,0.2)",
                    left: `${getCellCoords(p1Pos).x + 2}%`,
                    top: `${getCellCoords(p1Pos).y + 2}%`,
                    transition: "all 0.4s ease-out",
                    zIndex: 10
                  }}
                />
                {/* Player 2 / Bot (Blue) */}
                <div 
                  style={{
                    position: "absolute",
                    width: "16px",
                    height: "16px",
                    borderRadius: "50%",
                    backgroundColor: "var(--blue-accent)",
                    border: "2px solid #121212",
                    boxShadow: "2px 2px 0 rgba(18,18,18,0.2)",
                    left: `${getCellCoords(p2Pos).x + 5}%`,
                    top: `${getCellCoords(p2Pos).y + 5}%`,
                    transition: "all 0.4s ease-out",
                    zIndex: 9
                  }}
                />
              </div>

              {/* Dice Roller Controls */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.8rem", width: "100%", maxWidth: "320px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
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

            </div>
          )}

          {gameState === "gameover" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem", alignItems: "center", textAlign: "center" }}>
              <h3 style={{ fontWeight: "900", fontSize: "1.5rem", color: p1Pos === 100 ? "var(--secondary-color)" : "var(--accent-color)" }}>
                {p1Pos === 100 ? "🏆 YOU WON!" : "💀 BOT AI WON!"}
              </h3>
              <p style={{ fontSize: "0.95rem", fontWeight: "700" }}>Moves taken: {movesCount}</p>
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
