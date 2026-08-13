import React, { useEffect, useState, useRef } from "react";
import { Trophy, RefreshCw, ArrowLeft } from "lucide-react";
import GameHUDControls from "../components/GameHUDControls";

interface MemoryMatrixProps {
  onBack: () => void;
  user: any;
  submitScore: (score: number) => Promise<void>;
  leaderboard: any[];
  refreshLeaderboard: () => void;
}

export default function MemoryMatrix({ onBack, user, submitScore, leaderboard, refreshLeaderboard }: MemoryMatrixProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [gameState, setGameState] = useState<"idle" | "memorize" | "player" | "gameover">("idle");
  const [isPaused, setIsPaused] = useState(false);
  const [score, setScore] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [muted, setMuted] = useState(false);

  const [gridSize, setGridSize] = useState(3);
  const [activeTiles, setActiveTiles] = useState<number[]>([]);
  const [selectedTiles, setSelectedTiles] = useState<number[]>([]);
  const [strikes, setStrikes] = useState(0);
  const maxStrikes = 3;

  const isPausedRef = useRef(false);
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  // Auto-submit score on game over and set has_played lock
  useEffect(() => {
    if (gameState === "gameover" && score > 0) {
      localStorage.setItem("arcade_has_played", "true");
      setSubmitting(true);
      submitScore(score)
        .then(() => refreshLeaderboard())
        .catch(e => console.warn("Score auto submit failed", e))
        .finally(() => setSubmitting(false));
    }
  }, [gameState]);

  const playSound = (type: "correct" | "fail" | "gameover" | "reveal") => {
    if (muted || isPausedRef.current) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === "correct") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(659.25, ctx.currentTime);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      } else if (type === "reveal") {
        osc.type = "triangle";
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
        osc.start();
        osc.stop(ctx.currentTime + 0.08);
      } else if (type === "fail") {
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
      } else if (type === "gameover") {
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(180, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(60, ctx.currentTime + 0.45);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
        osc.start();
        osc.stop(ctx.currentTime + 0.45);
      }
    } catch (e) {
      console.warn("Audio Context failed", e);
    }
  };

  const startLevel = (nextScore: number) => {
    if (isPausedRef.current) return;
    let size = 3;
    let tileCount = 3;

    if (nextScore > 8) {
      size = 5;
      tileCount = 6 + Math.floor((nextScore - 9) / 4);
    } else if (nextScore > 3) {
      size = 4;
      tileCount = 4 + Math.floor((nextScore - 4) / 3);
    }

    setGridSize(size);
    setSelectedTiles([]);
    setGameState("memorize");
    playSound("reveal");

    const totalCells = size * size;
    const tiles: number[] = [];
    while (tiles.length < tileCount) {
      const idx = Math.floor(Math.random() * totalCells);
      if (!tiles.includes(idx)) {
        tiles.push(idx);
      }
    }
    setActiveTiles(tiles);

    setTimeout(() => {
      setGameState("player");
    }, 1500);
  };

  const handleTileClick = (idx: number) => {
    if (gameState !== "player" || isPaused) return;

    if (selectedTiles.includes(idx)) return;

    if (activeTiles.includes(idx)) {
      const newSelected = [...selectedTiles, idx];
      setSelectedTiles(newSelected);
      playSound("correct");

      if (newSelected.length === activeTiles.length) {
        setScore(s => {
          const nextScore = s + 1;
          setTimeout(() => startLevel(nextScore), 800);
          return nextScore;
        });
      }
    } else {
      playSound("fail");
      setStrikes(prev => {
        const nextStrikes = prev + 1;
        if (nextStrikes >= maxStrikes) {
          setGameState("gameover");
          playSound("gameover");
        } else {
          setTimeout(() => startLevel(score), 1000);
        }
        return nextStrikes;
      });
    }
  };

  const startGame = () => {
    localStorage.setItem("arcade_has_played", "true");
    setScore(0);
    setStrikes(0);
    setIsPaused(false);
    isPausedRef.current = false;
    startLevel(0);
  };

  return (
    <div ref={containerRef} style={{ display: "flex", flexDirection: "column", gap: "1.5rem", padding: "1rem", backgroundColor: "var(--bg-color)" }} className="fullscreen-compat">
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button onClick={onBack} className="neo-btn secondary" style={{ padding: "0.5rem 1rem" }}>
          <ArrowLeft size={18} /> BACK
        </button>
        <h2 className="game-title-text" style={{ fontSize: "1rem" }}>MEMORY MATRIX</h2>
        
        <GameHUDControls 
          isPaused={isPaused}
          onTogglePause={(gameState === "player" || gameState === "memorize") ? () => setIsPaused(!isPaused) : undefined}
          onRestart={gameState !== "idle" ? startGame : undefined}
          muted={muted}
          onToggleMute={() => setMuted(!muted)}
          containerRef={containerRef}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: "1.5rem", width: "100%" }} className="game-layout-container">
        {/* Play Area */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
          <div style={{ display: "flex", gap: "2rem", fontWeight: "800", fontSize: "1.1rem" }}>
            <div>SCORE: {score}</div>
            <div style={{ color: strikes > 0 ? "var(--accent-color)" : "inherit" }}>
              STRIKES: {strikes} / {maxStrikes}
            </div>
          </div>

          <div 
            className="neo-card game-view-box" 
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

            {gameState === "idle" && (
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", backgroundColor: "rgba(250, 246, 240, 0.95)", gap: "1.2rem", zIndex: 5 }}>
                <div style={{ fontFamily: "var(--font-game)", fontSize: "1.1rem", fontWeight: "bold" }}>MEMORY MATRIX</div>
                <p style={{ fontWeight: "600", fontSize: "0.85rem", textAlign: "center", padding: "0 1rem" }}>
                  Memorize the highlighted tile pattern and click them after they hide!
                </p>
                <button onClick={startGame} className="neo-btn accent">START PLAYING</button>
              </div>
            )}

            {gameState === "gameover" && (
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", backgroundColor: "rgba(250, 246, 240, 0.95)", gap: "1.2rem", zIndex: 5 }}>
                <div style={{ fontFamily: "var(--font-game)", fontSize: "1.1rem", color: "var(--accent-color)" }}>GAME OVER</div>
                <div style={{ fontSize: "1.4rem", fontWeight: "800" }}>SCORE: {score}</div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.25rem" }}>
                  <button onClick={startGame} className="neo-btn accent"><RefreshCw size={16} /> REPLAY</button>
                  {user && (
                    submitting ? (
                      <span style={{ fontSize: "0.75rem", fontWeight: "800", color: "#666" }}>SAVING SCORE...</span>
                    ) : (
                      <span style={{ fontSize: "0.75rem", fontWeight: "800", color: "var(--secondary-color)" }}>SCORE SAVED!</span>
                    )
                  )}
                </div>
              </div>
            )}

            {/* Matrix Board */}
            <div 
              style={{ 
                display: "grid", 
                gridTemplateColumns: `repeat(${gridSize}, 1fr)`, 
                gridTemplateRows: `repeat(${gridSize}, 1fr)`, 
                gap: "8px", 
                width: "100%", 
                height: "100%" 
              }}
            >
              {Array.from({ length: gridSize * gridSize }).map((_, idx) => {
                const isActivated = activeTiles.includes(idx);
                const isSelected = selectedTiles.includes(idx);
                
                let tileColor = "#e5ded4";
                if (gameState === "memorize" && isActivated) {
                  tileColor = "var(--primary-color)";
                } else if (gameState === "player") {
                  if (isSelected) {
                    tileColor = "var(--secondary-color)";
                  }
                }

                return (
                  <button
                    key={idx}
                    onClick={() => handleTileClick(idx)}
                    className="neo-btn"
                    style={{
                      padding: 0,
                      backgroundColor: tileColor,
                      border: "3px solid #121212",
                      borderRadius: "6px",
                      boxShadow: "none",
                      transition: "background-color 0.15s ease"
                    }}
                  />
                );
              })}
            </div>
          </div>
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
