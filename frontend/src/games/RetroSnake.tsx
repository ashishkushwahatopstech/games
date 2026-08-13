import React, { useEffect, useState, useRef } from "react";
import { Trophy, RefreshCw, ArrowLeft, ArrowUp, ArrowDown, ArrowLeft as ArrowLeftIcon, ArrowRight } from "lucide-react";
import GameHUDControls from "../components/GameHUDControls";

interface RetroSnakeProps {
  onBack: () => void;
  user: any;
  submitScore: (score: number) => Promise<void>;
  leaderboard: any[];
  refreshLeaderboard: () => void;
}

type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT";
type Position = { x: number; y: number };

export default function RetroSnake({ onBack, user, submitScore, leaderboard, refreshLeaderboard }: RetroSnakeProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [gameState, setGameState] = useState<"idle" | "playing" | "gameover">("idle");
  const [isPaused, setIsPaused] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [muted, setMuted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const gridCount = 20;
  const [snake, setSnake] = useState<Position[]>([
    { x: 10, y: 10 },
    { x: 10, y: 11 },
    { x: 10, y: 12 }
  ]);
  const [food, setFood] = useState<Position>({ x: 5, y: 5 });
  const [direction, setDirection] = useState<Direction>("UP");
  const directionRef = useRef<Direction>("UP");

  const isPausedRef = useRef(false);
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  const playSound = (type: "eat" | "crash") => {
    if (muted || isPausedRef.current) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === "eat") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.08); // E5
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      } else if (type === "crash") {
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(150, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(40, ctx.currentTime + 0.4);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      }
    } catch (e) {
      console.warn("Audio Context failed", e);
    }
  };

  const generateFood = (currentSnake: Position[]): Position => {
    while (true) {
      const x = Math.floor(Math.random() * gridCount);
      const y = Math.floor(Math.random() * gridCount);
      const onSnake = currentSnake.some(segment => segment.x === x && segment.y === y);
      if (!onSnake) {
        return { x, y };
      }
    }
  };

  const handleDirectionChange = (newDir: Direction) => {
    if (isPausedRef.current) return;
    const current = directionRef.current;
    if (newDir === "UP" && current !== "DOWN") directionRef.current = "UP";
    if (newDir === "DOWN" && current !== "UP") directionRef.current = "DOWN";
    if (newDir === "LEFT" && current !== "RIGHT") directionRef.current = "LEFT";
    if (newDir === "RIGHT" && current !== "LEFT") directionRef.current = "RIGHT";
    setDirection(directionRef.current);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== "playing" || isPaused) return;
      if (e.key === "ArrowUp") { e.preventDefault(); handleDirectionChange("UP"); }
      if (e.key === "ArrowDown") { e.preventDefault(); handleDirectionChange("DOWN"); }
      if (e.key === "ArrowLeft") { e.preventDefault(); handleDirectionChange("LEFT"); }
      if (e.key === "ArrowRight") { e.preventDefault(); handleDirectionChange("RIGHT"); }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [gameState, isPaused]);

  // Main Loop
  useEffect(() => {
    if (gameState !== "playing") return;

    const gameInterval = setInterval(() => {
      if (isPausedRef.current) return;

      setSnake(prevSnake => {
        const head = { ...prevSnake[0] };
        const currentDir = directionRef.current;

        if (currentDir === "UP") head.y -= 1;
        if (currentDir === "DOWN") head.y += 1;
        if (currentDir === "LEFT") head.x -= 1;
        if (currentDir === "RIGHT") head.x += 1;

        if (head.x < 0 || head.x >= gridCount || head.y < 0 || head.y >= gridCount) {
          setGameState("gameover");
          playSound("crash");
          clearInterval(gameInterval);
          return prevSnake;
        }

        const crashSelf = prevSnake.some(segment => segment.x === head.x && segment.y === head.y);
        if (crashSelf) {
          setGameState("gameover");
          playSound("crash");
          clearInterval(gameInterval);
          return prevSnake;
        }

        const newSnake = [head, ...prevSnake];

        if (head.x === food.x && head.y === food.y) {
          setScore(s => {
            const nextScore = s + 10;
            if (nextScore > highScore) setHighScore(nextScore);
            return nextScore;
          });
          playSound("eat");
          setFood(generateFood(prevSnake));
        } else {
          newSnake.pop();
        }

        return newSnake;
      });
    }, Math.max(80, 160 - Math.floor(score / 50) * 10));

    return () => clearInterval(gameInterval);
  }, [gameState, food, score]);

  const startGame = () => {
    setScore(0);
    setIsPaused(false);
    isPausedRef.current = false;
    setDirection("UP");
    directionRef.current = "UP";
    const initialSnake = [
      { x: 10, y: 10 },
      { x: 10, y: 11 },
      { x: 10, y: 12 }
    ];
    setSnake(initialSnake);
    setFood(generateFood(initialSnake));
    setGameState("playing");
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
        <h2 className="game-title-text" style={{ fontSize: "1rem" }}>RETRO SNAKE</h2>
        
        <GameHUDControls 
          isPaused={isPaused}
          onTogglePause={gameState === "playing" ? () => setIsPaused(!isPaused) : undefined}
          onRestart={gameState !== "idle" ? startGame : undefined}
          muted={muted}
          onToggleMute={() => setMuted(!muted)}
          containerRef={containerRef}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: "1.5rem", width: "100%" }} className="game-layout-container">
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1.5rem" }}>
          <div className="neo-card game-view-box" style={{ padding: "0", overflow: "hidden", position: "relative", backgroundColor: "#e2dcd0", width: "100%", maxWidth: "340px", height: "340px", border: "4px solid #121212" }}>
            
            {/* Draw Grid */}
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${gridCount}, 1fr)`, gridTemplateRows: `repeat(${gridCount}, 1fr)`, width: "100%", height: "100%" }}>
              {Array.from({ length: gridCount * gridCount }).map((_, idx) => {
                const x = idx % gridCount;
                const y = Math.floor(idx / gridCount);
                
                const isSnake = snake.some(s => s.x === x && s.y === y);
                const isHead = snake[0].x === x && snake[0].y === y;
                const isFood = food.x === x && food.y === y;

                return (
                  <div
                    key={idx}
                    style={{
                      border: "0.5px solid rgba(0,0,0,0.03)",
                      backgroundColor: isHead 
                        ? "var(--secondary-color)" 
                        : isSnake 
                          ? "#121212" 
                          : isFood 
                            ? "var(--accent-color)" 
                            : "transparent",
                      borderRadius: isFood || isHead ? "50%" : "0"
                    }}
                  />
                );
              })}
            </div>

            {isPaused && (
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", backgroundColor: "rgba(250, 246, 240, 0.9)", gap: "1rem", zIndex: 10 }}>
                <div style={{ fontFamily: "var(--font-game)", fontSize: "1.2rem", fontWeight: "bold" }}>PAUSED</div>
                <button onClick={() => setIsPaused(false)} className="neo-btn accent">RESUME</button>
              </div>
            )}

            {gameState === "idle" && (
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", backgroundColor: "rgba(250, 246, 240, 0.9)", gap: "1rem" }}>
                <div style={{ fontFamily: "var(--font-game)", fontSize: "1.2rem", fontWeight: "bold" }}>SNAKE RETRO</div>
                <p style={{ fontWeight: "600", fontSize: "0.85rem" }}>Use Arrows or Buttons to move!</p>
                <button onClick={startGame} className="neo-btn accent">PLAY NOW</button>
              </div>
            )}

            {gameState === "gameover" && (
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", backgroundColor: "rgba(250, 246, 240, 0.9)", gap: "1rem" }}>
                <div style={{ fontFamily: "var(--font-game)", fontSize: "1.2rem", color: "var(--accent-color)" }}>CRASHED!</div>
                <div style={{ fontSize: "1.5rem", fontWeight: "800" }}>SCORE: {score}</div>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button onClick={startGame} className="neo-btn accent"><RefreshCw size={16} /> REPLAY</button>
                  {user && score > 0 && (
                    <button onClick={handleScoreSubmit} disabled={submitting} className="neo-btn secondary">
                      {submitting ? "SUBMITTING..." : "SUBMIT SCORE"}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* D-Pad controls for Mobile */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", alignItems: "center", width: "160px" }}>
            <button onClick={() => handleDirectionChange("UP")} className="neo-btn" style={{ padding: "0.8rem" }}><ArrowUp size={20} /></button>
            <div style={{ display: "flex", gap: "1.5rem" }}>
              <button onClick={() => handleDirectionChange("LEFT")} className="neo-btn" style={{ padding: "0.8rem" }}><ArrowLeftIcon size={20} /></button>
              <button onClick={() => handleDirectionChange("RIGHT")} className="neo-btn" style={{ padding: "0.8rem" }}><ArrowRight size={20} /></button>
            </div>
            <button onClick={() => handleDirectionChange("DOWN")} className="neo-btn" style={{ padding: "0.8rem" }}><ArrowDown size={20} /></button>
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
