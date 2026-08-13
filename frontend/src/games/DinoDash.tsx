import React, { useEffect, useRef, useState } from "react";
import { Trophy, RefreshCw, Volume2, VolumeX, ArrowLeft } from "lucide-react";

interface DinoDashProps {
  onBack: () => void;
  user: any;
  submitScore: (score: number) => Promise<void>;
  leaderboard: any[];
  refreshLeaderboard: () => void;
}

export default function DinoDash({ onBack, user, submitScore, leaderboard, refreshLeaderboard }: DinoDashProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [gameState, setGameState] = useState<"idle" | "playing" | "gameover">("idle");
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [muted, setMuted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Audio synthesize helpers (using Web Audio API, no files needed!)
  const playSound = (type: "jump" | "crash" | "point") => {
    if (muted) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === "jump") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(150, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      } else if (type === "crash") {
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(300, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(60, ctx.currentTime + 0.4);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      } else if (type === "point") {
        osc.type = "triangle";
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.setValueAtTime(1200, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
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
    
    // Game variables
    let dinoY = canvas.height - 40;
    let dinoVelocityY = 0;
    const gravity = 0.6;
    const jumpStrength = -12;
    const dinoHeight = 35;
    const dinoWidth = 25;
    let isJumping = false;

    // Obstacles
    interface Obstacle {
      x: number;
      width: number;
      height: number;
      speed: number;
      type: "cactus" | "bird";
      yOffset?: number;
    }
    let obstacles: Obstacle[] = [];
    let obstacleTimer = 0;
    let currentSpeed = 6;
    let localScore = 0;
    let lastPointScore = 0;

    // Background stars/clouds for visual flair
    const decor: {x: number, y: number, size: number, speed: number}[] = Array.from({length: 8}, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * 80 + 20,
      size: Math.random() * 15 + 10,
      speed: Math.random() * 0.5 + 0.2
    }));

    const handleJump = () => {
      if (gameState !== "playing") return;
      if (!isJumping) {
        dinoVelocityY = jumpStrength;
        isJumping = true;
        playSound("jump");
      }
    };

    const handleKeydown = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        handleJump();
      }
    };

    window.addEventListener("keydown", handleKeydown);

    // Loop
    const update = () => {
      if (gameState !== "playing") return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw background sky
      ctx.fillStyle = "#faf6f0";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw decor (clouds)
      ctx.fillStyle = "#e5ded4";
      decor.forEach(c => {
        c.x -= c.speed;
        if (c.x + c.size < 0) c.x = canvas.width + c.size;
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.size, 0, Math.PI * 2);
        ctx.arc(c.x + c.size * 0.6, c.y - c.size * 0.2, c.size * 0.8, 0, Math.PI * 2);
        ctx.arc(c.x - c.size * 0.6, c.y, c.size * 0.7, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw ground line (Neo-brutalist style: bold line)
      ctx.strokeStyle = "#121212";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(0, canvas.height - 10);
      ctx.lineTo(canvas.width, canvas.height - 10);
      ctx.stroke();

      // Dino physics
      dinoVelocityY += gravity;
      dinoY += dinoVelocityY;
      
      const groundY = canvas.height - 10 - dinoHeight;
      if (dinoY >= groundY) {
        dinoY = groundY;
        dinoVelocityY = 0;
        isJumping = false;
      }

      // Draw Dino (Neo-brutalist green box with eyes and teeth)
      ctx.fillStyle = "#06d6a0";
      ctx.strokeStyle = "#121212";
      ctx.lineWidth = 3;
      ctx.fillRect(50, dinoY, dinoWidth, dinoHeight);
      ctx.strokeRect(50, dinoY, dinoWidth, dinoHeight);

      // Eye
      ctx.fillStyle = "#121212";
      ctx.fillRect(68, dinoY + 6, 4, 4);

      // Spikes on back
      ctx.fillStyle = "#ff6b6b";
      ctx.beginPath();
      ctx.moveTo(48, dinoY + 10);
      ctx.lineTo(44, dinoY + 14);
      ctx.lineTo(48, dinoY + 18);
      ctx.fill();
      ctx.stroke();

      // Handle Obstacles
      obstacleTimer++;
      const minSpawnTime = Math.max(40, 100 - Math.floor(localScore / 100));
      if (obstacleTimer > minSpawnTime + Math.random() * 50) {
        const isBird = Math.random() > 0.7 && localScore > 150;
        obstacles.push({
          x: canvas.width,
          width: isBird ? 22 : 18,
          height: isBird ? 16 : Math.random() * 25 + 20,
          speed: currentSpeed,
          type: isBird ? "bird" : "cactus",
          yOffset: isBird ? Math.random() * 40 + 20 : 0
        });
        obstacleTimer = 0;
      }

      // Draw and update obstacles
      for (let i = obstacles.length - 1; i >= 0; i--) {
        const obs = obstacles[i];
        obs.x -= obs.speed;

        const obsY = obs.type === "bird" 
          ? canvas.height - 10 - obs.height - obs.yOffset! 
          : canvas.height - 10 - obs.height;

        // Draw obstacles (red with black borders)
        ctx.fillStyle = obs.type === "bird" ? "#4cc9f0" : "#ff6b6b";
        ctx.fillRect(obs.x, obsY, obs.width, obs.height);
        ctx.strokeRect(obs.x, obsY, obs.width, obs.height);

        // Bird wings animation placeholder
        if (obs.type === "bird") {
          ctx.fillStyle = "#121212";
          ctx.fillRect(obs.x + 4, obsY + 4, 6, 2);
        }

        // Collision Check
        const dinoLeft = 50;
        const dinoRight = 50 + dinoWidth;
        const dinoTop = dinoY;
        const dinoBottom = dinoY + dinoHeight;

        if (
          obs.x < dinoRight &&
          obs.x + obs.width > dinoLeft &&
          obsY < dinoBottom &&
          obsY + obs.height > dinoTop
        ) {
          // Crash!
          setGameState("gameover");
          playSound("crash");
          if (localScore > highScore) {
            setHighScore(localScore);
          }
          break;
        }

        // Remove offscreen
        if (obs.x + obs.width < 0) {
          obstacles.splice(i, 1);
        }
      }

      // Update Score
      localScore += 0.15;
      const roundedScore = Math.floor(localScore);
      setScore(roundedScore);

      // Point ding every 100 points
      if (roundedScore > 0 && roundedScore % 100 === 0 && roundedScore > lastPointScore) {
        lastPointScore = roundedScore;
        playSound("point");
        currentSpeed += 0.4; // Speed up
      }

      animationFrameId = requestAnimationFrame(update);
    };

    if (gameState === "playing") {
      animationFrameId = requestAnimationFrame(update);
    }

    return () => {
      window.removeEventListener("keydown", handleKeydown);
      cancelAnimationFrame(animationFrameId);
    };
  }, [gameState]);

  const startGame = () => {
    setScore(0);
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
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Header Panel */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button onClick={onBack} className="neo-btn secondary" style={{ padding: "0.5rem 1rem" }}>
          <ArrowLeft size={18} /> BACK
        </button>
        <h2 className="game-title-text" style={{ fontSize: "1rem" }}>DINO DASH</h2>
        <button onClick={() => setMuted(!muted)} className="neo-btn" style={{ padding: "0.5rem" }}>
          {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: "1.5rem", width: "100%" }} className="game-layout-container">
        {/* Play Area */}
        <div className="neo-card" style={{ padding: "0", overflow: "hidden", position: "relative", backgroundColor: "#faf6f0", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <canvas
            ref={canvasRef}
            width={600}
            height={250}
            style={{ width: "100%", height: "auto", display: "block", background: "#faf6f0", cursor: "pointer" }}
            onClick={() => {
              if (gameState === "playing") {
                const jumpEvent = new KeyboardEvent("keydown", { code: "Space" });
                window.dispatchEvent(jumpEvent);
              }
            }}
          />

          {gameState === "idle" && (
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", backgroundColor: "rgba(250, 246, 240, 0.9)", gap: "1rem" }}>
              <div style={{ fontFamily: "var(--font-game)", fontSize: "1.2rem", fontWeight: "bold" }}>DINO DASH</div>
              <p style={{ fontWeight: "600", fontSize: "0.9rem" }}>Tap / Space to Jump over obstacles!</p>
              <button onClick={startGame} className="neo-btn accent">START PLAYING</button>
            </div>
          )}

          {gameState === "gameover" && (
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", backgroundColor: "rgba(250, 246, 240, 0.9)", gap: "1rem" }}>
              <div style={{ fontFamily: "var(--font-game)", fontSize: "1.2rem", color: "var(--accent-color)" }}>GAME OVER</div>
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

          {/* HUD Overlay */}
          {gameState === "playing" && (
            <div style={{ position: "absolute", top: 10, left: 10, display: "flex", gap: "1rem", fontWeight: "800", pointerEvents: "none" }}>
              <div>SCORE: {score}</div>
              <div>HI: {highScore}</div>
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
              <p style={{ color: "#666", fontSize: "0.9rem" }}>No highscores yet. Be the first!</p>
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
                    <span style={{ maxWidth: "120px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {entry.user_name}
                    </span>
                  </span>
                  <span>{entry.score}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
