import React, { useEffect, useRef, useState } from "react";
import { ArrowLeft, RefreshCw } from "lucide-react";
import GameHUDControls from "../components/GameHUDControls";

interface DualPongProps {
  onBack: () => void;
}

export default function DualPong({ onBack }: DualPongProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [gameState, setGameState] = useState<"idle" | "playing" | "gameover">("idle");
  const [isPaused, setIsPaused] = useState(false);
  const [score1, setScore1] = useState(0); // Top Player
  const [score2, setScore2] = useState(0); // Bottom Player
  const [winner, setWinner] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);

  const paddleWidth = 80;
  const paddleHeight = 12;

  const p1XRef = useRef(130);
  const p2XRef = useRef(130);

  const isPausedRef = useRef(false);
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  const keysPressed = useRef<{ [key: string]: boolean }>({});

  const playSound = (type: "hit" | "score") => {
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
      }
    } catch (e) {
      console.warn(e);
    }
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

    let animationFrameId: number;
    const pSpeed = 6;

    let ballX = canvas.width / 2;
    let ballY = canvas.height / 2;
    let ballRadius = 8;
    let ballSpeedX = 3 * (Math.random() > 0.5 ? 1 : -1);
    let ballSpeedY = 3 * (Math.random() > 0.5 ? 1 : -1);

    const resetBall = (direction: number) => {
      ballX = canvas.width / 2;
      ballY = canvas.height / 2;
      ballSpeedX = 3 * (Math.random() > 0.5 ? 1 : -1);
      ballSpeedY = 3 * direction;
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

      // 1. Move paddles keys
      if (keysPressed.current["KeyA"]) {
        p1XRef.current = Math.max(0, p1XRef.current - pSpeed);
      }
      if (keysPressed.current["KeyD"]) {
        p1XRef.current = Math.min(canvas.width - paddleWidth, p1XRef.current + pSpeed);
      }
      if (keysPressed.current["ArrowLeft"]) {
        p2XRef.current = Math.max(0, p2XRef.current - pSpeed);
      }
      if (keysPressed.current["ArrowRight"]) {
        p2XRef.current = Math.min(canvas.width - paddleWidth, p2XRef.current + pSpeed);
      }

      // 2. Move Ball
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

      // Top Paddle Collision
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

      // Bottom Paddle Collision
      if (
        ballY + ballRadius >= canvas.height - 20 - paddleHeight &&
        ballY + ballRadius <= canvas.height - 20 &&
        ballX >= p2XRef.current &&
        ballX <= p2XRef.current + paddleWidth
      ) {
        ballSpeedY = -ballSpeedY;
        ballSpeedX *= 1.05;
        ballSpeedY *= 1.05;
        playSound("hit");
      }

      // Score Check
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

      // Render Canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = "#faf6f0";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.strokeStyle = "rgba(18,18,18,0.2)";
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 8]);
      ctx.beginPath();
      ctx.moveTo(0, canvas.height / 2);
      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // paddles
      ctx.fillStyle = "var(--accent-color)";
      ctx.fillRect(p1XRef.current, 20 - paddleHeight, paddleWidth, paddleHeight);
      ctx.strokeStyle = "#121212";
      ctx.lineWidth = 3;
      ctx.strokeRect(p1XRef.current, 20 - paddleHeight, paddleWidth, paddleHeight);

      ctx.fillStyle = "var(--blue-accent)";
      ctx.fillRect(p2XRef.current, canvas.height - 20, paddleWidth, paddleHeight);
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
      ctx.fillStyle = "var(--accent-color)";
      ctx.fillRect(p1XRef.current, 20 - paddleHeight, paddleWidth, paddleHeight);
      ctx.strokeStyle = "#121212";
      ctx.lineWidth = 3;
      ctx.strokeRect(p1XRef.current, 20 - paddleHeight, paddleWidth, paddleHeight);
      ctx.fillStyle = "var(--blue-accent)";
      ctx.fillRect(p2XRef.current, canvas.height - 20, paddleWidth, paddleHeight);
      ctx.strokeRect(p2XRef.current, canvas.height - 20, paddleWidth, paddleHeight);
    }

    return () => cancelAnimationFrame(animationFrameId);
  }, [gameState, isPaused]);

  const startGame = () => {
    setScore1(0);
    setScore2(0);
    setWinner(null);
    p1XRef.current = 130;
    p2XRef.current = 130;
    setIsPaused(false);
    isPausedRef.current = false;
    setGameState("playing");
  };

  const handleTopSliderMove = (e: React.TouchEvent<HTMLDivElement> | React.MouseEvent<HTMLDivElement>) => {
    if (gameState !== "playing" || isPaused) return;
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
    <div ref={containerRef} style={{ display: "flex", flexDirection: "column", gap: "1.5rem", userSelect: "none", WebkitUserSelect: "none", padding: "1rem", backgroundColor: "var(--bg-color)" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button onClick={onBack} className="neo-btn secondary" style={{ padding: "0.5rem 1rem" }}>
          <ArrowLeft size={18} /> BACK
        </button>
        <h2 className="game-title-text" style={{ fontSize: "1rem" }}>DUAL PONG (LOCAL 1v1)</h2>
        
        <GameHUDControls 
          isPaused={isPaused}
          onTogglePause={gameState === "playing" ? () => setIsPaused(!isPaused) : undefined}
          onRestart={gameState !== "idle" ? startGame : undefined}
          muted={muted}
          onToggleMute={() => setMuted(!muted)}
          containerRef={containerRef}
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
        
        {/* Score Board HUD */}
        <div style={{ display: "flex", justifyContent: "space-between", width: "100%", maxWidth: "340px", fontWeight: "800", marginBottom: "0.5rem" }}>
          <div style={{ color: "var(--accent-color)" }}>TOP PLAYER: {score1}</div>
          <div style={{ color: "var(--blue-accent)" }}>BOTTOM PLAYER: {score2}</div>
        </div>

        {/* Game Container */}
        <div 
          className="neo-card" 
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

          {/* Drag Sliders */}
          {gameState === "playing" && (
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "space-between", pointerEvents: "none" }}>
              
              {/* Top Drag Joystick */}
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
              <h3 style={{ fontFamily: "var(--font-game)", fontSize: "0.85rem", textAlign: "center" }}>DUAL PONG</h3>
              <p style={{ fontWeight: "600", fontSize: "0.85rem", textAlign: "center", maxWidth: "250px" }}>
                Top & Bottom players slide their joysticks left and right to control paddles!
              </p>
              <button onClick={startGame} className="neo-btn accent">START DUEL</button>
            </div>
          )}

          {gameState === "gameover" && (
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", backgroundColor: "rgba(250, 246, 240, 0.95)", gap: "1rem" }}>
              <div style={{ fontFamily: "var(--font-game)", fontSize: "0.85rem", color: "var(--accent-color)" }}>DUEL ENDED</div>
              <div style={{ fontSize: "1.2rem", fontWeight: "800" }}>{winner} WINS!</div>
              <button onClick={startGame} className="neo-btn accent"><RefreshCw size={16} /> REPLAY</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
