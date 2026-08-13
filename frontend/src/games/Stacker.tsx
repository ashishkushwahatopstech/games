import React, { useEffect, useRef, useState } from "react";
import { Trophy, RefreshCw, ArrowLeft } from "lucide-react";
import GameHUDControls from "../components/GameHUDControls";

interface StackerProps {
  onBack: () => void;
  user: any;
  submitScore: (score: number) => Promise<void>;
  leaderboard: any[];
  refreshLeaderboard: () => void;
}

export default function Stacker({ onBack, user, submitScore, leaderboard, refreshLeaderboard }: StackerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [gameState, setGameState] = useState<"idle" | "playing" | "gameover">("idle");
  const [isPaused, setIsPaused] = useState(false);
  const [score, setScore] = useState(0);
  const [muted, setMuted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isPausedRef = useRef(false);
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  const playSound = (type: "drop" | "slice" | "gameover" | "perfect") => {
    if (muted || isPausedRef.current) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === "perfect") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.setValueAtTime(800, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      } else if (type === "drop") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(300, ctx.currentTime);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
      } else if (type === "slice") {
        osc.type = "triangle";
        osc.frequency.setValueAtTime(200, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(100, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      } else if (type === "gameover") {
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(150, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(50, ctx.currentTime + 0.5);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        osc.start();
        osc.stop(ctx.currentTime + 0.5);
      }
    } catch (e) {
      console.warn("Audio Context failed", e);
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;

    const blockHeight = 24;
    let cameraY = 0;
    
    // Stack layers
    interface StackBlock {
      x: number;
      width: number;
      color: string;
    }
    let stack: StackBlock[] = [];
    
    // Current moving block
    let currentX = 0;
    let currentWidth = 180;
    let currentSpeed = 3;
    let currentDir = 1; // 1 = right, -1 = left

    const colors = ["#ff6b6b", "#ffd166", "#06d6a0", "#118ab2", "#4cc9f0", "#a29bfe", "#ff8a5c"];

    const initGame = () => {
      // Base layer
      stack = [
        {
          x: (canvas.width - 200) / 2,
          width: 200,
          color: "#2c3e50"
        }
      ];
      currentWidth = 200;
      currentX = 0;
      currentSpeed = 3;
      currentDir = 1;
      cameraY = 0;
    };

    if (gameState === "playing") {
      initGame();
    }

    const handleAction = () => {
      if (gameState !== "playing" || isPausedRef.current) return;

      const currentIdx = stack.length;
      const targetBlock = stack[currentIdx - 1]; // Previous block to stack on

      // Calculate overhangs
      const diff = currentX - targetBlock.x;
      const perfectThreshold = 6; // pixels for a "perfect" placement

      if (Math.abs(diff) <= perfectThreshold) {
        currentX = targetBlock.x;
        stack.push({
          x: currentX,
          width: currentWidth,
          color: colors[currentIdx % colors.length]
        });
        playSound("perfect");
      } else {
        const newWidth = currentWidth - Math.abs(diff);

        if (newWidth <= 0) {
          setGameState("gameover");
          playSound("gameover");
          return;
        }

        const newX = diff > 0 ? currentX : targetBlock.x;
        currentWidth = newWidth;
        currentX = newX;

        stack.push({
          x: newX,
          width: newWidth,
          color: colors[currentIdx % colors.length]
        });
        playSound("slice");
      }

      setScore(stack.length - 1);
      
      currentSpeed = Math.min(8, 3 + Math.floor(stack.length / 5) * 0.7);

      currentX = currentDir === 1 ? 0 : canvas.width - currentWidth;
      
      if (stack.length > 5) {
        cameraY = (stack.length - 5) * blockHeight;
      }
    };

    const handleKeydown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        handleAction();
      }
    };

    window.addEventListener("keydown", handleKeydown);

    // Loop
    const draw = () => {
      if (!ctx || !canvas) return;

      if (isPausedRef.current) {
        // Overlay paused indicator
        ctx.fillStyle = "rgba(18, 18, 18, 0.05)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = "#121212";
        ctx.font = "bold 24px var(--font-ui)";
        ctx.textAlign = "center";
        ctx.fillText("|| PAUSED", canvas.width / 2, canvas.height / 2);
        animationFrameId = requestAnimationFrame(draw);
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = "#faf6f0";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      ctx.translate(0, cameraY);

      // Draw stacked blocks
      stack.forEach((block, idx) => {
        const y = canvas.height - (idx + 1) * blockHeight;

        ctx.fillStyle = "#121212";
        ctx.fillRect(block.x + 4, y + 4, block.width, blockHeight);

        ctx.fillStyle = block.color;
        ctx.strokeStyle = "#121212";
        ctx.lineWidth = 3;
        ctx.fillRect(block.x, y, block.width, blockHeight);
        ctx.strokeRect(block.x, y, block.width, blockHeight);

        ctx.fillStyle = "rgba(255,255,255,0.2)";
        ctx.fillRect(block.x + 5, y + 4, block.width - 10, 4);
      });

      if (gameState === "playing") {
        currentX += currentSpeed * currentDir;
        if (currentX + currentWidth > canvas.width) {
          currentX = canvas.width - currentWidth;
          currentDir = -1;
        } else if (currentX < 0) {
          currentX = 0;
          currentDir = 1;
        }

        const y = canvas.height - (stack.length + 1) * blockHeight;

        ctx.fillStyle = "#121212";
        ctx.fillRect(currentX + 4, y + 4, currentWidth, blockHeight);

        ctx.fillStyle = colors[stack.length % colors.length];
        ctx.strokeStyle = "#121212";
        ctx.lineWidth = 3;
        ctx.fillRect(currentX, y, currentWidth, blockHeight);
        ctx.strokeRect(currentX, y, currentWidth, blockHeight);

        ctx.fillStyle = "rgba(255,255,255,0.2)";
        ctx.fillRect(currentX + 5, y + 4, currentWidth - 10, 4);
      }

      ctx.restore();

      if (gameState === "playing") {
        animationFrameId = requestAnimationFrame(draw);
      }
    };

    if (gameState === "playing") {
      animationFrameId = requestAnimationFrame(draw);
    } else {
      draw();
    }

    return () => {
      window.removeEventListener("keydown", handleKeydown);
      cancelAnimationFrame(animationFrameId);
    };
  }, [gameState, isPaused]);

  const startGame = () => {
    setScore(0);
    setIsPaused(false);
    isPausedRef.current = false;
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
        <h2 className="game-title-text" style={{ fontSize: "1rem" }}>STACKER 3D</h2>
        
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
        {/* Arena */}
        <div 
          className="neo-card game-view-box" 
          style={{ 
            padding: "0", 
            overflow: "hidden", 
            position: "relative", 
            backgroundColor: "#faf6f0", 
            display: "flex", 
            flexDirection: "column", 
            alignItems: "center" 
          }}
          onClick={() => {
            if (gameState === "playing" && !isPaused) {
              const pressSpace = new KeyboardEvent("keydown", { code: "Space" });
              window.dispatchEvent(pressSpace);
            }
          }}
        >
          <canvas
            ref={canvasRef}
            width={400}
            height={400}
            style={{ width: "100%", maxWidth: "400px", height: "auto", display: "block", background: "#faf6f0", cursor: "pointer", outline: "none", WebkitTapHighlightColor: "transparent" }}
          />

          {gameState === "idle" && (
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", backgroundColor: "rgba(250, 246, 240, 0.9)", gap: "1rem" }}>
              <div style={{ fontFamily: "var(--font-game)", fontSize: "1.2rem", fontWeight: "bold" }}>STACKER 3D</div>
              <p style={{ fontWeight: "600", fontSize: "0.9rem" }}>Tap or Press Space to drop blocks!</p>
              <button onClick={startGame} className="neo-btn accent">START GAME</button>
            </div>
          )}

          {gameState === "gameover" && (
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", backgroundColor: "rgba(250, 246, 240, 0.9)", gap: "1rem" }}>
              <div style={{ fontFamily: "var(--font-game)", fontSize: "1.2rem", color: "var(--accent-color)" }}>GAME OVER</div>
              <div style={{ fontSize: "1.5rem", fontWeight: "800" }}>HEIGHT STACKED: {score}</div>
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

          {/* HUD overlay */}
          {gameState === "playing" && (
            <div style={{ position: "absolute", top: 15, left: 15, display: "flex", flexDirection: "column", gap: "0.2rem", fontWeight: "800", pointerEvents: "none" }}>
              <div style={{ fontSize: "1.2rem" }}>SCORE: {score}</div>
            </div>
          )}
        </div>

        {/* Highscores */}
        <div className="neo-card" style={{ display: "flex", flexDirection: "column", gap: "1rem", height: "fit-content" }}>
          <h3 style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "1.2rem" }}>
            <Trophy size={20} color="var(--primary-color)" /> LEADERBOARD
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {leaderboard.length === 0 ? (
              <p style={{ color: "#666", fontSize: "0.9rem" }}>No highscores yet. Play to set one!</p>
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
