import React, { useEffect, useRef, useState } from "react";
import { ArrowLeft, RefreshCw, Smartphone, Trophy, User, Users } from "lucide-react";
import GameHUDControls from "../components/GameHUDControls";

interface DualPongProps {
  onBack: () => void;
}

interface Brick {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  active: boolean;
}

export default function DualPong({ onBack }: DualPongProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [gameState, setGameState] = useState<"idle" | "playing" | "gameover">("idle");
  const [gameMode, setGameMode] = useState<"duel" | "bricks">("duel");
  
  // Game scores & stats
  const [score1, setScore1] = useState(0); // Top Player Score (in duel) or Level (in bricks)
  const [score2, setScore2] = useState(0); // Bottom Player Score (in duel) or Bricks Points (in bricks)
  const [lives, setLives] = useState(3);   // Lives remaining in bricks mode
  const [winner, setWinner] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);

  const paddleWidth = 80;
  const paddleHeight = 12;

  // Refs for tracking positions and modes in high speed canvas loop
  const p1XRef = useRef(130);
  const p2XRef = useRef(130);
  const isPausedRef = useRef(false);
  const gameModeRef = useRef<"duel" | "bricks">("duel");
  const livesRef = useRef(3);
  const levelRef = useRef(1);
  const bricksRef = useRef<Brick[]>([]);

  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    gameModeRef.current = gameMode;
  }, [gameMode]);

  const keysPressed = useRef<{ [key: string]: boolean }>({});

  const playSound = (type: "hit" | "score" | "level" | "crash") => {
    if (muted || isPausedRef.current) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === "hit") {
        osc.type = "triangle";
        osc.frequency.setValueAtTime(330, ctx.currentTime);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
      } else if (type === "score") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.setValueAtTime(554.37, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      } else if (type === "level") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(523.25, ctx.currentTime);
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.08);
        osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.16);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
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
      console.warn(e);
    }
  };

  const generateBricks = (lvl: number) => {
    const cols = 6;
    const rows = Math.min(6, 2 + lvl);
    const bWidth = 42;
    const bHeight = 15;
    const xOffset = 20;
    const yOffset = 50;
    const spacingX = 8;
    const spacingY = 8;
    
    const colors = ["#ff6b6b", "#ff8a5c", "#ffd166", "#06d6a0", "#118ab2", "#4cc9f0"];
    
    const bricksList: Brick[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        bricksList.push({
          x: xOffset + c * (bWidth + spacingX),
          y: yOffset + r * (bHeight + spacingY),
          width: bWidth,
          height: bHeight,
          color: colors[r % colors.length],
          active: true
        });
      }
    }
    bricksRef.current = bricksList;
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current[e.code] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.code] = false;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;

    let animationFrameId: number;

    // Ball physics variables
    let ballX = canvas.width / 2;
    let ballY = canvas.height / 2;
    let ballVX = 2.5 * (Math.random() > 0.5 ? 1 : -1);
    let ballVY = 3 * (Math.random() > 0.5 ? 1 : -1);
    const ballRadius = 7;

    const resetBall = (direction: 1 | -1) => {
      ballX = canvas.width / 2;
      ballY = canvas.height / 2;
      const speedMultiplier = gameModeRef.current === "bricks" ? 2 + levelRef.current * 0.3 : 3;
      ballVX = 2 * (Math.random() > 0.5 ? 1 : -1);
      ballVY = speedMultiplier * direction;
    };

    const update = () => {
      if (gameState !== "playing") return;

      if (isPausedRef.current) {
        ctx.fillStyle = "rgba(18,18,18,0.05)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = "#121212";
        ctx.font = "bold 24px var(--font-ui)";
        ctx.textAlign = "center";
        ctx.fillText("|| PAUSED", canvas.width / 2, canvas.height / 2);
        animationFrameId = requestAnimationFrame(update);
        return;
      }

      // Draw background
      ctx.fillStyle = "#faf6f0";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Dash center line (only in Duel mode)
      if (gameModeRef.current === "duel") {
        ctx.strokeStyle = "rgba(18,18,18,0.15)";
        ctx.lineWidth = 4;
        ctx.setLineDash([10, 10]);
        ctx.beginPath();
        ctx.moveTo(0, canvas.height / 2);
        ctx.lineTo(canvas.width, canvas.height / 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Keyboard input movements
      const speed = 5;
      if (gameModeRef.current === "duel") {
        if (keysPressed.current["KeyA"]) p1XRef.current = Math.max(0, p1XRef.current - speed);
        if (keysPressed.current["KeyD"]) p1XRef.current = Math.min(canvas.width - paddleWidth, p1XRef.current + speed);
      }
      if (keysPressed.current["ArrowLeft"]) p2XRef.current = Math.max(0, p2XRef.current - speed);
      if (keysPressed.current["ArrowRight"]) p2XRef.current = Math.min(canvas.width - paddleWidth, p2XRef.current + speed);

      // Draw paddles
      ctx.fillStyle = "#121212";
      if (gameModeRef.current === "duel") {
        ctx.fillRect(p1XRef.current + 3, 15 + 3, paddleWidth, paddleHeight); // Top (Red) shadows
      }
      ctx.fillRect(p2XRef.current + 3, canvas.height - 15 - paddleHeight + 3, paddleWidth, paddleHeight); // Bottom (Blue) shadows

      // Top Paddle (Red)
      if (gameModeRef.current === "duel") {
        ctx.fillStyle = "var(--accent-color)";
        ctx.strokeStyle = "#121212";
        ctx.lineWidth = 3;
        ctx.fillRect(p1XRef.current, 15, paddleWidth, paddleHeight);
        ctx.strokeRect(p1XRef.current, 15, paddleWidth, paddleHeight);
      }

      // Bottom Paddle (Blue)
      ctx.fillStyle = "var(--blue-accent)";
      ctx.strokeStyle = "#121212";
      ctx.lineWidth = 3;
      ctx.fillRect(p2XRef.current, canvas.height - 15 - paddleHeight, paddleWidth, paddleHeight);
      ctx.strokeRect(p2XRef.current, canvas.height - 15 - paddleHeight, paddleWidth, paddleHeight);

      // Draw bricks (if Bricks Mode)
      if (gameModeRef.current === "bricks") {
        let activeCount = 0;
        bricksRef.current.forEach(brick => {
          if (!brick.active) return;
          activeCount++;
          // Draw shadow
          ctx.fillStyle = "#121212";
          ctx.fillRect(brick.x + 3, brick.y + 3, brick.width, brick.height);

          // Draw brick
          ctx.fillStyle = brick.color;
          ctx.strokeStyle = "#121212";
          ctx.lineWidth = 2.5;
          ctx.fillRect(brick.x, brick.y, brick.width, brick.height);
          ctx.strokeRect(brick.x, brick.y, brick.width, brick.height);
        });

        // Level Clear condition
        if (activeCount === 0) {
          playSound("level");
          levelRef.current += 1;
          setScore1(levelRef.current);
          generateBricks(levelRef.current);
          resetBall(1);
        }
      }

      // Ball movement
      ballX += ballVX;
      ballY += ballVY;

      // Ball wall bounces
      if (ballX - ballRadius < 0) {
        ballX = ballRadius;
        ballVX = -ballVX;
        playSound("hit");
      }
      if (ballX + ballRadius > canvas.width) {
        ballX = canvas.width - ballRadius;
        ballVX = -ballVX;
        playSound("hit");
      }

      // Bricks collisions (Bricks Mode only)
      if (gameModeRef.current === "bricks") {
        for (let i = 0; i < bricksRef.current.length; i++) {
          const b = bricksRef.current[i];
          if (!b.active) continue;

          // Simple AABB vs Circle
          const closestX = Math.max(b.x, Math.min(ballX, b.x + b.width));
          const closestY = Math.max(b.y, Math.min(ballY, b.y + b.height));
          const distX = ballX - closestX;
          const distY = ballY - closestY;
          const distance = distX * distX + distY * distY;

          if (distance < ballRadius * ballRadius) {
            b.active = false;
            playSound("hit");
            setScore2(s => s + 10);
            
            // Deflect ball
            if (Math.abs(distX) > Math.abs(distY)) {
              ballVX = -ballVX;
            } else {
              ballVY = -ballVY;
            }
            break;
          }
        }

        // Top wall ceiling deflection (Bricks Mode only)
        if (ballY - ballRadius < 0) {
          ballY = ballRadius;
          ballVY = -ballVY;
          playSound("hit");
        }
      }

      // Paddle collisions
      // Top Paddle (Red) in Duel Mode
      if (gameModeRef.current === "duel") {
        if (ballY - ballRadius < 15 + paddleHeight && ballY + ballRadius > 15) {
          if (ballX >= p1XRef.current && ballX <= p1XRef.current + paddleWidth) {
            ballVY = Math.abs(ballVY);
            // Angle shift based on impact location
            const impact = (ballX - (p1XRef.current + paddleWidth / 2)) / (paddleWidth / 2);
            ballVX = impact * 4;
            playSound("hit");
          }
        }
      }

      // Bottom Paddle (Blue)
      const bPaddleY = canvas.height - 15 - paddleHeight;
      if (ballY + ballRadius > bPaddleY && ballY - ballRadius < bPaddleY + paddleHeight) {
        if (ballX >= p2XRef.current && ballX <= p2XRef.current + paddleWidth) {
          ballVY = -Math.abs(ballVY);
          // Angle shift
          const impact = (ballX - (p2XRef.current + paddleWidth / 2)) / (paddleWidth / 2);
          ballVX = impact * 4;
          playSound("hit");
        }
      }

      // Scored / Life lost checks
      if (gameModeRef.current === "duel") {
        if (ballY < 0) {
          playSound("score");
          setScore2(s => {
            const next = s + 1;
            if (next >= 10) {
              setWinner("BLUE");
              setGameState("gameover");
            } else {
              resetBall(1);
            }
            return next;
          });
        } else if (ballY > canvas.height) {
          playSound("score");
          setScore1(s => {
            const next = s + 1;
            if (next >= 10) {
              setWinner("RED");
              setGameState("gameover");
            } else {
              resetBall(-1);
            }
            return next;
          });
        }
      } else {
        // Bricks Mode drop
        if (ballY > canvas.height) {
          playSound("crash");
          livesRef.current -= 1;
          setLives(livesRef.current);
          if (livesRef.current <= 0) {
            setGameState("gameover");
          } else {
            resetBall(-1);
          }
        }
      }

      // Draw Ball shadow
      ctx.fillStyle = "#121212";
      ctx.beginPath();
      ctx.arc(ballX + 2, ballY + 2, ballRadius, 0, Math.PI * 2);
      ctx.fill();

      // Draw Ball
      ctx.fillStyle = "#ffd166";
      ctx.strokeStyle = "#121212";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(ballX, ballY, ballRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      if (gameState === "playing") {
        animationFrameId = requestAnimationFrame(update);
      }
    };

    if (gameState === "playing") {
      animationFrameId = requestAnimationFrame(update);
    }

    return () => cancelAnimationFrame(animationFrameId);
  }, [gameState, isPaused]);

  const startGame = () => {
    localStorage.setItem("arcade_has_played", "true");
    setIsPaused(false);
    isPausedRef.current = false;
    setWinner(null);
    p1XRef.current = 130;
    p2XRef.current = 130;

    if (gameMode === "bricks") {
      setScore1(1); // Level 1
      levelRef.current = 1;
      setScore2(0); // Score 0
      setLives(3);
      livesRef.current = 3;
      generateBricks(1);
    } else {
      setScore1(0);
      setScore2(0);
    }
    setGameState("playing");
  };

  const handleTopSliderMove = (e: React.TouchEvent<HTMLDivElement> | React.MouseEvent<HTMLDivElement>) => {
    if (gameState !== "playing" || isPaused || gameMode !== "duel") return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const pct = (clientX - rect.left) / rect.width;
    p1XRef.current = Math.max(0, Math.min(340 - paddleWidth, pct * 340 - paddleWidth / 2));
  };

  const handleBottomSliderMove = (e: React.TouchEvent<HTMLDivElement> | React.MouseEvent<HTMLDivElement>) => {
    if (gameState !== "playing" || isPaused) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const pct = (clientX - rect.left) / rect.width;
    p2XRef.current = Math.max(0, Math.min(340 - paddleWidth, pct * 340 - paddleWidth / 2));
  };

  return (
    <div ref={containerRef} style={{ display: "flex", flexDirection: "column", gap: "1.5rem", userSelect: "none", WebkitUserSelect: "none", padding: "1rem", backgroundColor: "var(--bg-color)" }} className="fullscreen-compat">
      {/* Header Controls */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }} className="hide-on-fullscreen">
        <button onClick={onBack} className="neo-btn secondary" style={{ padding: "0.5rem 1rem" }}>
          <ArrowLeft size={18} /> BACK
        </button>
        <h2 className="game-title-text" style={{ fontSize: "1rem" }}>DUAL PONG / BRICKS</h2>
        
        <GameHUDControls 
          isPaused={isPaused}
          onTogglePause={gameState === "playing" ? () => setIsPaused(!isPaused) : undefined}
          onRestart={gameState !== "idle" ? startGame : undefined}
          muted={muted}
          onToggleMute={() => setMuted(!muted)}
          containerRef={containerRef}
        />
      </div>

      {/* Mode selection tabs during idle */}
      {gameState === "idle" && (
        <div style={{ display: "flex", justifyContent: "center", gap: "1rem", width: "100%" }}>
          <button 
            onClick={() => setGameMode("duel")} 
            className={`neo-btn ${gameMode === "duel" ? "accent" : "secondary"}`}
            style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
          >
            <Users size={16} /> 2 Players (Duel)
          </button>
          <button 
            onClick={() => setGameMode("bricks")} 
            className={`neo-btn ${gameMode === "bricks" ? "accent" : "secondary"}`}
            style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
          >
            <User size={16} /> 1 Player (Bricks)
          </button>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
        
        {/* Score Board HUD */}
        <div style={{ display: "flex", justifyContent: "space-between", width: "100%", maxWidth: "340px", fontWeight: "800", marginBottom: "0.5rem" }}>
          {gameMode === "bricks" ? (
            <>
              <div style={{ color: "var(--accent-color)" }}>LEVEL: {score1}</div>
              <div style={{ color: "var(--blue-accent)" }}>POINTS: {score2}</div>
              <div style={{ color: "red" }}>LIVES: {lives}</div>
            </>
          ) : (
            <>
              <div style={{ color: "var(--accent-color)" }}>TOP P1: {score1}</div>
              <div style={{ color: "var(--blue-accent)" }}>BOTTOM P2: {score2}</div>
            </>
          )}
        </div>

        {/* Game Card */}
        <div 
          className="neo-card game-view-box" 
          style={{ 
            padding: 0, 
            overflow: "hidden", 
            position: "relative", 
            backgroundColor: "#faf6f0", 
            width: "100%", 
            maxWidth: "340px", 
            aspectRatio: "340 / 400", 
            border: "4px solid #121212", 
            boxShadow: "6px 6px 0px 0px #121212"
          }}
        >
          <canvas
            ref={canvasRef}
            width={340}
            height={400}
            style={{ display: "block", width: "100%", height: "100%", outline: "none", WebkitTapHighlightColor: "transparent" }}
          />

          {gameState === "idle" && (
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", backgroundColor: "rgba(250, 246, 240, 0.95)", gap: "1rem" }}>
              <h3 style={{ fontFamily: "var(--font-game)", fontSize: "0.85rem", textAlign: "center" }}>
                {gameMode === "duel" ? "DUAL PONG (2P)" : "BRICKS BREAKER (1P)"}
              </h3>
              <p style={{ fontWeight: "600", fontSize: "0.8rem", textAlign: "center", maxWidth: "250px" }}>
                {gameMode === "duel" 
                  ? "Local 1v1 split screen game! Move paddles using sliders below or keyboard keys." 
                  : "Break all bricks at the top! Avoid letting the ball drop below."}
              </p>
              <button onClick={startGame} className="neo-btn accent">START GAME</button>
            </div>
          )}

          {gameState === "gameover" && (
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", backgroundColor: "rgba(250, 246, 240, 0.95)", gap: "1rem" }}>
              <div style={{ fontFamily: "var(--font-game)", fontSize: "0.85rem", color: "var(--accent-color)" }}>GAME OVER</div>
              {gameMode === "duel" ? (
                <div style={{ fontSize: "1.1rem", fontWeight: "800" }}>{winner} WINS!</div>
              ) : (
                <div style={{ fontSize: "1.1rem", fontWeight: "800" }}>SCORE: {score2}</div>
              )}
              <button onClick={startGame} className="neo-btn accent"><RefreshCw size={16} /> REPLAY</button>
            </div>
          )}
        </div>

        {/* Joystick Controllers rendered completely below the game screen card */}
        {gameState === "playing" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem", width: "100%", maxWidth: "340px", marginTop: "1.2rem" }}>
            
            {/* Top Player Drag Joystick (Only in 2P Duel Mode) */}
            {gameMode === "duel" && (
              <div className="neo-card" style={{ padding: "0.6rem", border: "3px solid #121212", backgroundColor: "#fff" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", fontWeight: "800", marginBottom: "4px" }}>
                  <span>RED PLAYER (TOP CONTROLLER)</span>
                  <span>[ A / D ]</span>
                </div>
                <div 
                  onTouchMove={handleTopSliderMove}
                  onTouchStart={handleTopSliderMove}
                  onMouseMove={(e) => e.buttons === 1 && handleTopSliderMove(e)}
                  onMouseDown={handleTopSliderMove}
                  style={{ 
                    pointerEvents: isPaused ? "none" : "auto", 
                    width: "100%", 
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "center", 
                    background: "rgba(255, 107, 107, 0.05)", 
                    padding: "0.8rem 0",
                    border: "2px dashed #121212",
                    borderRadius: "6px",
                    cursor: "ew-resize",
                    touchAction: "none"
                  }}
                >
                  <div style={{ width: "90%", height: "8px", background: "#e2dcd0", border: "2px solid #121212", borderRadius: "4px", position: "relative" }}>
                    <div 
                      style={{ 
                        position: "absolute", 
                        left: `${(p1XRef.current / 260) * 100}%`, 
                        top: "-12px", 
                        width: "30px", 
                        height: "30px", 
                        background: "var(--accent-color)", 
                        border: "2px solid #121212", 
                        borderRadius: "50%",
                        transform: "translateX(-50%)"
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Player Drag Joystick */}
            <div className="neo-card" style={{ padding: "0.6rem", border: "3px solid #121212", backgroundColor: "#fff" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", fontWeight: "800", marginBottom: "4px" }}>
                <span>BLUE PLAYER (BOTTOM CONTROLLER)</span>
                <span>[ ◀ / ▶ ]</span>
              </div>
              <div 
                onTouchMove={handleBottomSliderMove}
                onTouchStart={handleBottomSliderMove}
                onMouseMove={(e) => e.buttons === 1 && handleBottomSliderMove(e)}
                onMouseDown={handleBottomSliderMove}
                style={{ 
                  pointerEvents: isPaused ? "none" : "auto", 
                  width: "100%", 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "center", 
                  background: "rgba(76, 201, 240, 0.05)", 
                  padding: "0.8rem 0",
                  border: "2px dashed #121212",
                  borderRadius: "6px",
                  cursor: "ew-resize",
                  touchAction: "none"
                }}
              >
                <div style={{ width: "90%", height: "8px", background: "#e2dcd0", border: "2px solid #121212", borderRadius: "4px", position: "relative" }}>
                  <div 
                    style={{ 
                      position: "absolute", 
                      left: `${(p2XRef.current / 260) * 100}%`, 
                      top: "-12px", 
                      width: "30px", 
                      height: "30px", 
                      background: "var(--blue-accent)", 
                      border: "2px solid #121212", 
                      borderRadius: "50%",
                      transform: "translateX(-50%)"
                    }}
                  />
                </div>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
