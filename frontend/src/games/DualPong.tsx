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

    // Set pixel-art rendering for crispy scaling
    ctx.imageSmoothingEnabled = false;

    let animationFrameId: number;
    const pSpeed = 6;

    let ballX = canvas.width / 2;
    let ballY = canvas.height / 2;
    let ballRadius = 7;
    let ballSpeedX = 2.5 * (Math.random() > 0.5 ? 1 : -1);
    let ballSpeedY = 2.5 * (Math.random() > 0.5 ? 1 : -1);

    const resetBall = (direction: number) => {
      ballX = canvas.width / 2;
      ballY = canvas.height / 2;
      ballSpeedX = (2.5 + levelRef.current * 0.2) * (Math.random() > 0.5 ? 1 : -1);
      ballSpeedY = (2.5 + levelRef.current * 0.2) * direction;
    };

    const updateGame = () => {
      if (gameState !== "playing") return;

      if (isPausedRef.current) {
        ctx.fillStyle = "rgba(18, 18, 18, 0.02)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = "#121212";
        ctx.font = "bold 24px var(--font-ui)";
        ctx.textAlign = "center";
        ctx.fillText("|| PAUSED", canvas.width / 2, canvas.height / 2);
        animationFrameId = requestAnimationFrame(updateGame);
        return;
      }

      // Move player paddle (bottom) with buttons or keys
      if (keysPressed.current["ArrowLeft"] || keysPressed.current["KeyA"]) {
        p2XRef.current = Math.max(0, p2XRef.current - pSpeed);
      }
      if (keysPressed.current["ArrowRight"] || keysPressed.current["KeyD"]) {
        p2XRef.current = Math.min(canvas.width - paddleWidth, p2XRef.current + pSpeed);
      }

      // Move top opponent paddle (if in Duel mode)
      if (gameModeRef.current === "duel") {
        if (keysPressed.current["KeyJ"]) {
          p1XRef.current = Math.max(0, p1XRef.current - pSpeed);
        }
        if (keysPressed.current["KeyL"]) {
          p1XRef.current = Math.min(canvas.width - paddleWidth, p1XRef.current + pSpeed);
        }
      }

      // Move Ball
      ballX += ballSpeedX;
      ballY += ballSpeedY;

      // Side Wall Bouncing
      if (ballX - ballRadius <= 0) {
        ballX = ballRadius;
        ballSpeedX = -ballSpeedX;
        playSound("hit");
      }
      if (ballX + ballRadius >= canvas.width) {
        ballX = canvas.width - ballRadius;
        ballSpeedX = -ballSpeedX;
        playSound("hit");
      }

      // Mode-specific bounce rules
      if (gameModeRef.current === "bricks") {
        // Bounce off top wall in Single Player
        if (ballY - ballRadius <= 0) {
          ballY = ballRadius;
          ballSpeedY = -ballSpeedY;
          playSound("hit");
        }

        // Brick collision checks
        for (let i = 0; i < bricksRef.current.length; i++) {
          const brick = bricksRef.current[i];
          if (!brick.active) continue;

          if (
            ballX + ballRadius >= brick.x &&
            ballX - ballRadius <= brick.x + brick.width &&
            ballY + ballRadius >= brick.y &&
            ballY - ballRadius <= brick.y + brick.height
          ) {
            brick.active = false;
            ballSpeedY = -ballSpeedY;
            playSound("hit");

            // Increase score
            setScore2(s => {
              const next = s + 10;
              return next;
            });

            // Check if level clear
            const anyActive = bricksRef.current.some(b => b.active);
            if (!anyActive) {
              playSound("level");
              levelRef.current += 1;
              setScore1(levelRef.current);
              resetBall(1);
              generateBricks(levelRef.current);
            }
            break;
          }
        }
      } else {
        // Duel mode collision with top paddle (Player 1)
        if (
          ballY - ballRadius <= 20 &&
          ballY - ballRadius >= 20 - paddleHeight &&
          ballX >= p1XRef.current &&
          ballX <= p1XRef.current + paddleWidth
        ) {
          ballSpeedY = -ballSpeedY;
          ballSpeedX *= 1.05;
          ballSpeedY *= 1.05;
          playSound("hit");
        }
      }

      // Bottom Paddle Collision (Player 2)
      if (
        ballY + ballRadius >= canvas.height - 20 - paddleHeight &&
        ballY + ballRadius <= canvas.height - 20 &&
        ballX >= p2XRef.current &&
        ballX <= p2XRef.current + paddleWidth
      ) {
        ballSpeedY = -ballSpeedY;
        ballSpeedX *= 1.04;
        ballSpeedY *= 1.04;
        playSound("hit");
      }

      // Scoring & Life boundaries
      if (gameModeRef.current === "bricks") {
        if (ballY + ballRadius > canvas.height) {
          playSound("crash");
          livesRef.current -= 1;
          setLives(livesRef.current);
          if (livesRef.current <= 0) {
            setWinner(`PLAYER`);
            setGameState("gameover");
          } else {
            resetBall(-1);
          }
        }
      } else {
        // Duel scoring check
        if (ballY - ballRadius < 0) {
          playSound("score");
          setScore2(s => {
            const next = s + 1;
            if (next >= 5) {
              setWinner("PLAYER 2 (BOTTOM)");
              setGameState("gameover");
            } else {
              resetBall(1);
            }
            return next;
          });
        } else if (ballY + ballRadius > canvas.height) {
          playSound("score");
          setScore1(s => {
            const next = s + 1;
            if (next >= 5) {
              setWinner("PLAYER 1 (TOP)");
              setGameState("gameover");
            } else {
              resetBall(-1);
            }
            return next;
          });
        }
      }

      // Draw everything
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#faf6f0";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Dash dividing line in duel mode
      if (gameModeRef.current === "duel") {
        ctx.strokeStyle = "rgba(18,18,18,0.15)";
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 8]);
        ctx.beginPath();
        ctx.moveTo(0, canvas.height / 2);
        ctx.lineTo(canvas.width, canvas.height / 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Top Paddle (Red)
        ctx.fillStyle = "var(--accent-color)";
        ctx.fillRect(p1XRef.current, 20 - paddleHeight, paddleWidth, paddleHeight);
        ctx.strokeStyle = "#121212";
        ctx.lineWidth = 3;
        ctx.strokeRect(p1XRef.current, 20 - paddleHeight, paddleWidth, paddleHeight);
      } else {
        // Draw Bricks in Single Player mode
        bricksRef.current.forEach(brick => {
          if (!brick.active) return;
          ctx.fillStyle = brick.color;
          ctx.fillRect(brick.x, brick.y, brick.width, brick.height);
          ctx.strokeStyle = "#121212";
          ctx.lineWidth = 2.5;
          ctx.strokeRect(brick.x, brick.y, brick.width, brick.height);
        });
      }

      // Bottom Paddle (Blue)
      ctx.fillStyle = "var(--blue-accent)";
      ctx.fillRect(p2XRef.current, canvas.height - 20, paddleWidth, paddleHeight);
      ctx.strokeStyle = "#121212";
      ctx.lineWidth = 3;
      ctx.strokeRect(p2XRef.current, canvas.height - 20, paddleWidth, paddleHeight);

      // Ball
      ctx.beginPath();
      ctx.arc(ballX, ballY, ballRadius, 0, Math.PI * 2);
      ctx.fillStyle = "var(--secondary-color)";
      ctx.fill();
      ctx.strokeStyle = "#121212";
      ctx.lineWidth = 3;
      ctx.stroke();

      animationFrameId = requestAnimationFrame(updateGame);
    };

    if (gameState === "playing") {
      animationFrameId = requestAnimationFrame(updateGame);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#faf6f0";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      if (gameModeRef.current === "duel") {
        ctx.fillStyle = "var(--accent-color)";
        ctx.fillRect(p1XRef.current, 20 - paddleHeight, paddleWidth, paddleHeight);
        ctx.strokeStyle = "#121212";
        ctx.lineWidth = 3;
        ctx.strokeRect(p1XRef.current, 20 - paddleHeight, paddleWidth, paddleHeight);
      } else {
        generateBricks(levelRef.current);
        bricksRef.current.forEach(b => {
          ctx.fillStyle = b.color;
          ctx.fillRect(b.x, b.y, b.width, b.height);
          ctx.strokeStyle = "#121212";
          ctx.strokeRect(b.x, b.y, b.width, b.height);
        });
      }
      ctx.fillStyle = "var(--blue-accent)";
      ctx.fillRect(p2XRef.current, canvas.height - 20, paddleWidth, paddleHeight);
      ctx.strokeStyle = "#121212";
      ctx.lineWidth = 3;
      ctx.strokeRect(p2XRef.current, canvas.height - 20, paddleWidth, paddleHeight);
    }

    return () => cancelAnimationFrame(animationFrameId);
  }, [gameState, gameMode, isPaused]);

  const startGame = () => {
    setWinner(null);
    p1XRef.current = 130;
    p2XRef.current = 130;
    setIsPaused(false);
    isPausedRef.current = false;

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

          {/* Interactive Drag Sliders (Joysticks) */}
          {gameState === "playing" && (
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "space-between", pointerEvents: "none" }}>
              
              {/* Top Drag Joystick (Only in 2P Duel Mode) */}
              {gameMode === "duel" ? (
                <div 
                  onTouchMove={handleTopSliderMove}
                  onTouchStart={handleTopSliderMove}
                  onMouseMove={(e) => e.buttons === 1 && handleTopSliderMove(e)}
                  onMouseDown={handleTopSliderMove}
                  style={{ 
                    pointerEvents: isPaused ? "none" : "auto", 
                    width: "100%", 
                    height: "75px", 
                    display: "flex", 
                    flexDirection: "column", 
                    justifyContent: "center", 
                    alignItems: "center", 
                    background: "rgba(255, 107, 107, 0.05)", 
                    borderBottom: "3px dashed #121212",
                    cursor: "ew-resize"
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
                  <span style={{ fontSize: "0.65rem", fontWeight: "800", color: "#666", marginTop: "4px", transform: "rotate(180deg)" }}>DRAG TO SLIDE</span>
                </div>
              ) : (
                <div style={{ height: "75px" }} /> // Empty spacer when top controls are disabled
              )}

              {/* Bottom Drag Joystick */}
              <div 
                onTouchMove={handleBottomSliderMove}
                onTouchStart={handleBottomSliderMove}
                onMouseMove={(e) => e.buttons === 1 && handleBottomSliderMove(e)}
                onMouseDown={handleBottomSliderMove}
                style={{ 
                  pointerEvents: isPaused ? "none" : "auto", 
                  width: "100%", 
                  height: "75px", 
                  display: "flex", 
                  flexDirection: "column", 
                  justifyContent: "center", 
                  alignItems: "center", 
                  background: "rgba(76, 201, 240, 0.05)", 
                  borderTop: "3px dashed #121212",
                  cursor: "ew-resize"
                }}
              >
                <span style={{ fontSize: "0.65rem", fontWeight: "800", color: "#666", marginBottom: "4px" }}>DRAG TO SLIDE</span>
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
          )}

          {gameState === "idle" && (
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", backgroundColor: "rgba(250, 246, 240, 0.95)", gap: "1rem" }}>
              <h3 style={{ fontFamily: "var(--font-game)", fontSize: "0.85rem", textAlign: "center" }}>
                {gameMode === "duel" ? "DUAL PONG (2P)" : "BRICKS BREAKER (1P)"}
              </h3>
              <p style={{ fontWeight: "600", fontSize: "0.8rem", textAlign: "center", maxWidth: "250px" }}>
                {gameMode === "duel" 
                  ? "Local 1v1 split screen game! Move paddles using sliders or keys." 
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
      </div>
    </div>
  );
}
