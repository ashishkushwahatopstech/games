import React, { useState, useEffect, useRef } from "react";
import { Trophy, RefreshCw, Flag, ArrowLeft } from "lucide-react";
import GameHUDControls from "../components/GameHUDControls";

interface MinesweeperProps {
  onBack: () => void;
  user: any;
  submitScore: (score: number) => Promise<void>;
  leaderboard: any[];
  refreshLeaderboard: () => void;
}

interface Cell {
  x: number;
  y: number;
  isMine: boolean;
  isRevealed: boolean;
  isFlagged: boolean;
  neighborMines: number;
}

export default function MinesweeperBlitz({ onBack, user, submitScore, leaderboard, refreshLeaderboard }: MinesweeperProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [board, setBoard] = useState<Cell[][]>([]);
  const [gameState, setGameState] = useState<"playing" | "won" | "lost">("playing");
  const [isPaused, setIsPaused] = useState(false);
  const [score, setScore] = useState(0);
  const [time, setTime] = useState(0);
  const [flagMode, setFlagMode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [muted, setMuted] = useState(false);

  const isPausedRef = useRef(false);
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  const size = 9;
  const mineCount = 10;

  const playSound = (type: "click" | "flag" | "win" | "boom") => {
    if (muted || isPausedRef.current) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === "click") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
        osc.start();
        osc.stop(ctx.currentTime + 0.05);
      } else if (type === "flag") {
        osc.type = "triangle";
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
        osc.start();
        osc.stop(ctx.currentTime + 0.08);
      } else if (type === "win") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1); // E5
        osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2); // G5
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      } else if (type === "boom") {
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(100, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(30, ctx.currentTime + 0.5);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        osc.start();
        osc.stop(ctx.currentTime + 0.5);
      }
    } catch (e) {
      console.warn("Audio Context failed", e);
    }
  };

  const initBoard = () => {
    let newBoard: Cell[][] = Array.from({ length: size }, (_, y) =>
      Array.from({ length: size }, (_, x) => ({
        x,
        y,
        isMine: false,
        isRevealed: false,
        isFlagged: false,
        neighborMines: 0
      }))
    );

    let placedMines = 0;
    while (placedMines < mineCount) {
      const rx = Math.floor(Math.random() * size);
      const ry = Math.floor(Math.random() * size);
      if (!newBoard[ry][rx].isMine) {
        newBoard[ry][rx].isMine = true;
        placedMines++;
      }
    }

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (newBoard[y][x].isMine) continue;
        let neighbors = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const ny = y + dy;
            const nx = x + dx;
            if (ny >= 0 && ny < size && nx >= 0 && nx < size) {
              if (newBoard[ny][nx].isMine) neighbors++;
            }
          }
        }
        newBoard[y][x].neighborMines = neighbors;
      }
    }

    setBoard(newBoard);
    setGameState("playing");
    setIsPaused(false);
    isPausedRef.current = false;
    setTime(0);
    setScore(0);
  };

  useEffect(() => {
    initBoard();
  }, []);

  // Timer loop
  useEffect(() => {
    if (gameState !== "playing" || isPaused) return;
    const interval = setInterval(() => {
      setTime(t => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [gameState, isPaused]);

  const revealCell = (y: number, x: number) => {
    if (gameState !== "playing" || isPaused || board[y][x].isRevealed || board[y][x].isFlagged) return;

    const newBoard = board.map(row => row.map(c => ({ ...c })));
    
    if (newBoard[y][x].isMine) {
      // Boom! Game Over
      playSound("boom");
      newBoard.forEach(row => row.forEach(c => {
        if (c.isMine) c.isRevealed = true;
      }));
      setBoard(newBoard);
      setGameState("lost");
      return;
    }

    playSound("click");
    
    // Flood fill algorithm
    const floodFill = (cy: number, cx: number) => {
      if (cy < 0 || cy >= size || cx < 0 || cx >= size) return;
      if (newBoard[cy][cx].isRevealed || newBoard[cy][cx].isFlagged) return;

      newBoard[cy][cx].isRevealed = true;

      if (newBoard[cy][cx].neighborMines === 0) {
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            floodFill(cy + dy, cx + dx);
          }
        }
      }
    };

    floodFill(y, x);

    // Score calculation (number of revealed non-mine tiles * 10 - timePenalty)
    let revealedCount = 0;
    newBoard.forEach(row => row.forEach(c => {
      if (c.isRevealed && !c.isMine) revealedCount++;
    }));

    const nextScore = Math.max(0, revealedCount * 10 - Math.floor(time / 5));
    setScore(nextScore);

    // Win condition check
    let win = true;
    newBoard.forEach(row => row.forEach(c => {
      if (!c.isMine && !c.isRevealed) win = false;
    }));

    if (win) {
      playSound("win");
      // Add big win bonus
      const bonusScore = nextScore + 100;
      setScore(bonusScore);
      setGameState("won");
    }

    setBoard(newBoard);
  };

  const toggleFlag = (e: React.MouseEvent, y: number, x: number) => {
    e.preventDefault();
    if (gameState !== "playing" || isPaused || board[y][x].isRevealed) return;

    playSound("flag");
    const newBoard = board.map(row => row.map(c => ({ ...c })));
    newBoard[y][x].isFlagged = !newBoard[y][x].isFlagged;
    setBoard(newBoard);
  };

  const handleCellAction = (y: number, x: number) => {
    if (flagMode) {
      const e = { preventDefault: () => {} } as React.MouseEvent;
      toggleFlag(e, y, x);
    } else {
      revealCell(y, x);
    }
  };

  const handleScoreSubmit = async () => {
    if (!user) return;
    setSubmitting(true);
    try {
      await submitScore(score);
      refreshLeaderboard();
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div ref={containerRef} style={{ display: "flex", flexDirection: "column", gap: "1.5rem", padding: "1rem", backgroundColor: "var(--bg-color)" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button onClick={onBack} className="neo-btn secondary" style={{ padding: "0.5rem 1rem" }}>
          <ArrowLeft size={18} /> BACK
        </button>
        <h2 className="game-title-text" style={{ fontSize: "1rem" }}>MINESWEEPER BLITZ</h2>
        
        <GameHUDControls 
          isPaused={isPaused}
          onTogglePause={gameState === "playing" ? () => setIsPaused(!isPaused) : undefined}
          onRestart={initBoard}
          muted={muted}
          onToggleMute={() => setMuted(!muted)}
          containerRef={containerRef}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: "1.5rem", width: "100%" }} className="game-layout-container">
        {/* Play Space */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
          
          <div style={{ display: "flex", justifySelf: "center", gap: "2rem", fontWeight: "800", fontSize: "1.1rem" }}>
            <div>SCORE: {score}</div>
            <div>TIME: {time}s</div>
          </div>

          <div 
            className="neo-card" 
            style={{ 
              padding: "1rem", 
              position: "relative", 
              backgroundColor: "#faf6f0", 
              width: "100%", 
              maxWidth: "340px", 
              height: "340px", 
              boxSizing: "border-box",
              border: "4px solid #121212"
            }}
          >
            {isPaused && (
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", backgroundColor: "rgba(250, 246, 240, 0.95)", gap: "1rem", zIndex: 10 }}>
                <div style={{ fontFamily: "var(--font-game)", fontSize: "1.2rem", fontWeight: "bold" }}>PAUSED</div>
                <button onClick={() => setIsPaused(false)} className="neo-btn accent">RESUME</button>
              </div>
            )}

            {gameState === "lost" && (
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", backgroundColor: "rgba(250, 246, 240, 0.95)", gap: "1.2rem", zIndex: 5 }}>
                <div style={{ fontFamily: "var(--font-game)", fontSize: "1.1rem", color: "var(--accent-color)" }}>BOOM! EXPLODED</div>
                <div style={{ fontSize: "1.4rem", fontWeight: "800" }}>SCORE: {score}</div>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button onClick={initBoard} className="neo-btn accent"><RefreshCw size={16} /> REPLAY</button>
                </div>
              </div>
            )}

            {gameState === "won" && (
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", backgroundColor: "rgba(250, 246, 240, 0.95)", gap: "1.2rem", zIndex: 5 }}>
                <div style={{ fontFamily: "var(--font-game)", fontSize: "1.1rem", color: "var(--secondary-color)" }}>BOARD CLEAR!</div>
                <div style={{ fontSize: "1.4rem", fontWeight: "800" }}>SCORE: {score}</div>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button onClick={initBoard} className="neo-btn accent"><RefreshCw size={16} /> REPLAY</button>
                  {user && score > 0 && (
                    <button onClick={handleScoreSubmit} disabled={submitting} className="neo-btn secondary">
                      {submitting ? "SUBMITTING..." : "SUBMIT SCORE"}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Grid */}
            <div 
              style={{ 
                display: "grid", 
                gridTemplateColumns: `repeat(${size}, 1fr)`, 
                gridTemplateRows: `repeat(${size}, 1fr)`, 
                gap: "4px", 
                width: "100%", 
                height: "100%" 
              }}
            >
              {board.map((row, y) =>
                row.map((cell, x) => {
                  let bgColor = "#e5ded4";
                  let cellContent = "";
                  
                  if (cell.isRevealed) {
                    if (cell.isMine) {
                      bgColor = "var(--accent-color)";
                      cellContent = "💣";
                    } else {
                      bgColor = "#fff";
                      cellContent = cell.neighborMines > 0 ? String(cell.neighborMines) : "";
                    }
                  } else if (cell.isFlagged) {
                    bgColor = "var(--primary-color)";
                    cellContent = "🚩";
                  }

                  let colorValue = "#121212";
                  if (cell.neighborMines === 1) colorValue = "var(--blue-accent)";
                  if (cell.neighborMines === 2) colorValue = "var(--secondary-color)";
                  if (cell.neighborMines >= 3) colorValue = "var(--accent-color)";

                  return (
                    <button
                      key={`${y}-${x}`}
                      onClick={() => handleCellAction(y, x)}
                      onContextMenu={(e) => toggleFlag(e, y, x)}
                      className="neo-btn"
                      style={{
                        padding: 0,
                        fontSize: "0.9rem",
                        fontWeight: "900",
                        backgroundColor: bgColor,
                        color: colorValue,
                        border: "2px solid #121212",
                        borderRadius: "4px",
                        boxShadow: "none"
                      }}
                    >
                      {cellContent}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Toggle for Flag mode */}
          <button 
            onClick={() => setFlagMode(!flagMode)} 
            className={`neo-btn ${flagMode ? "accent" : "secondary"}`}
            style={{ width: "100%", maxWidth: "340px", justifyContent: "center", gap: "0.5rem" }}
          >
            <Flag size={18} fill={flagMode ? "currentColor" : "none"} /> 
            {flagMode ? "TOUCH MODE: FLAGGING" : "TOUCH MODE: REVEAL"}
          </button>
        </div>

        {/* Highscores */}
        <div className="neo-card" style={{ display: "flex", flexDirection: "column", gap: "1rem", height: "fit-content" }}>
          <h3 style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "1.2rem" }}>
            <Trophy size={20} color="var(--primary-color)" /> LEADERBOARD
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {leaderboard.length === 0 ? (
              <p style={{ color: "#666", fontSize: "0.9rem" }}>No scores submitted yet.</p>
            ) : (
              leaderboard.map((entry, idx) => {
                const isCurrentUser = user && entry.user_name === user.name;
                return (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "0.5rem",
                      border: "2px solid var(--border-color)",
                      borderRadius: "4px",
                      backgroundColor: idx === 0 ? "var(--primary-color)" : isCurrentUser ? "var(--secondary-color)" : "#fff",
                      fontWeight: "700",
                      fontSize: "0.9rem"
                    }}
                  >
                    <span style={{ display: "flex", gap: "0.4rem" }}>
                      <span>#{idx + 1}</span>
                      <span style={{ maxWidth: "120px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {entry.user_name}
                      </span>
                    </span>
                    <span>{entry.score}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
