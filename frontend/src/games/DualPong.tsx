import React, { useEffect, useRef, useState } from "react";
import { ArrowLeft, RefreshCw, Volume2, VolumeX } from "lucide-react";

interface DualPongProps {
  onBack: () => void;
}

export default function DualPong({ onBack }: DualPongProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [gameState, setGameState] = useState<"idle" | "playing" | "gameover">("idle");
  const [score1, setScore1] = useState(0); // Top Player
  const [score2, setScore2] = useState(0); // Bottom Player
  const [winner, setWinner] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);

  // Paddle widths/positions
  const paddleWidth = 80;
  const paddleHeight = 12;

  // Key tracking
  const keysPressed = useRef<{ [key: string]: boolean }>({});

  const playSound = (type: "hit" | "score") => {
    if (muted) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === "hit") {
        osc.type = "triangle";
        osc.frequency.setValueAtTime(330, ctx.currentTime); // E4
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
      } else if (type === "score") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(440, ctx.currentTime); // A4
        osc.frequency.setValueAtTime(554.37, ctx.currentTime + 0.08); // C#5
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

    // Paddle starting positions (centered horizontally)
    let p1X = (canvas.width - paddleWidth) / 2; // top paddle
    let p2X = (canvas.width - paddleWidth) / 2; // bottom paddle
    const pSpeed = 6;

    // Ball state
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

      // 1. Move Top Paddle (Player 1)
      // Controls: 'KeyA' / 'KeyD'
      if (keysPressed.current["KeyA"]) p1X = Math.max(0, p1X - pSpeed);
      if (keysPressed.current["KeyD"]) p1X = Math.min(canvas.width - paddleWidth, p1X + pSpeed);

      // 2. Move Bottom Paddle (Player 2)
      // Controls: 'ArrowLeft' / 'ArrowRight'
      if (keysPressed.current["ArrowLeft"]) p2X = Math.max(0, p2X - pSpeed);
      if (keysPressed.current["ArrowRight"]) p2X = Math.min(canvas.width - paddleWidth, p2X + pSpeed);

      // 3. Move Ball
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

      // Top Paddle Collision (Player 1)
      if (
        ballY - ballRadius <= 20 &&
        ballY - ballRadius >= 20 - paddleHeight &&
        ballX >= p1X &&
        ballX <= p1X + paddleWidth
      ) {
        ballSpeedY = -ballSpeedY;
        // Increase speed slightly
        ballSpeedX *= 1.05;
        ballSpeedY *= 1.05;
        playSound("hit");
      }

      // Bottom Paddle Collision (Player 2)
      if (
        ballY + ballRadius >= canvas.height - 20 - paddleHeight &&
        ballY + ballRadius <= canvas.height - 20 &&
        ballX >= p2X &&
        ballX <= p2X + paddleWidth
      ) {
        ballSpeedY = -ballSpeedY;
        ballSpeedX *= 1.05;
        ballSpeedY *= 1.05;
        playSound("hit");
      }

      // Score Check
      if (ballY - ballRadius < 0) {
        // Player 2 Scores!
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
        // Player 1 Scores!
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

      // Board Background
      ctx.fillStyle = "#faf6f0";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Center dash line
      ctx.strokeStyle = "rgba(18,18,18,0.2)";
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 8]);
      ctx.beginPath();
      ctx.moveTo(0, canvas.height / 2);
      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Top Paddle
      ctx.fillStyle = "var(--accent-color)";
      ctx.fillRect(p1X, 20 - paddleHeight, paddleWidth, paddleHeight);
      ctx.strokeStyle = "#121212";
      ctx.lineWidth = 3;
      ctx.strokeRect(p1X, 20 - paddleHeight, paddleWidth, paddleHeight);

      // Bottom Paddle
      ctx.fillStyle = "var(--blue-accent)";
      ctx.fillRect(p2X, canvas.height - 20, paddleWidth, paddleHeight);
      ctx.strokeRect(p2X, canvas.height - 20, paddleWidth, paddleHeight);

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
      // Draw initial static board layout
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#faf6f0";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "var(--accent-color)";
      ctx.fillRect(p1X, 20 - paddleHeight, paddleWidth, paddleHeight);
      ctx.strokeStyle = "#121212";
      ctx.lineWidth = 3;
      ctx.strokeRect(p1X, 20 - paddleHeight, paddleWidth, paddleHeight);
      ctx.fillStyle = "var(--blue-accent)";
      ctx.fillRect(p2X, canvas.height - 20, paddleWidth, paddleHeight);
      ctx.strokeRect(p2X, canvas.height - 20, paddleWidth, paddleHeight);
    }

    return () => cancelAnimationFrame(animationFrameId);
  }, [gameState]);

  const startGame = () => {
    setScore1(0);
    setScore2(0);
    setWinner(null);
    setGameState("playing");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button onClick={onBack} className="neo-btn secondary" style={{ padding: "0.5rem 1rem" }}>
          <ArrowLeft size={18} /> BACK
        </button>
        <h2 className="game-title-text" style={{ fontSize: "1rem" }}>DUAL PONG (LOCAL 1v1)</h2>
        <button onClick={() => setMuted(!muted)} className="neo-btn" style={{ padding: "0.5rem" }}>
          {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
        
        {/* Score Board HUD */}
        <div style={{ display: "flex", justifyContent: "space-between", width: "100%", maxWidth: "340px", fontWeight: "800", marginBottom: "0.5rem" }}>
          <div style={{ color: "var(--accent-color)" }}>TOP PLAYER: {score1}</div>
          <div style={{ color: "var(--blue-accent)" }}>BOTTOM PLAYER: {score2}</div>
        </div>

        {/* Fully Responsive aspect-ratio locked Game Container */}
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
            style={{ display: "block", width: "100%", height: "100%" }}
          />

          {/* Full Quadrant Touch/Click Zones */}
          {gameState === "playing" && (
            <div style={{ position: "absolute", inset: 0, display: "grid", gridTemplateRows: "1fr 1fr", pointerEvents: "none" }}>
              
              {/* Top Player (Player 1 - Red) Touch Area */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", pointerEvents: "auto", borderBottom: "2px dashed rgba(18,18,18,0.15)" }}>
                {/* Top Left: moves top paddle left */}
                <div 
                  onTouchStart={() => { keysPressed.current["KeyA"] = true; }}
                  onTouchEnd={() => { keysPressed.current["KeyA"] = false; }}
                  onMouseDown={() => { keysPressed.current["KeyA"] = true; }}
                  onMouseUp={() => { keysPressed.current["KeyA"] = false; }}
                  onMouseLeave={() => { keysPressed.current["KeyA"] = false; }}
                  style={{ display: "flex", justifyContent: "center", alignItems: "center", backgroundColor: "rgba(255, 107, 107, 0.02)", cursor: "pointer", borderRight: "1px dashed rgba(18,18,18,0.1)" }}
                >
                  <span style={{ transform: "rotate(180deg)", color: "rgba(255, 107, 107, 0.2)", fontWeight: "900", fontSize: "1.5rem", userSelect: "none" }}>➡️</span>
                </div>
                {/* Top Right: moves top paddle right */}
                <div 
                  onTouchStart={() => { keysPressed.current["KeyD"] = true; }}
                  onTouchEnd={() => { keysPressed.current["KeyD"] = false; }}
                  onMouseDown={() => { keysPressed.current["KeyD"] = true; }}
                  onMouseUp={() => { keysPressed.current["KeyD"] = false; }}
                  onMouseLeave={() => { keysPressed.current["KeyD"] = false; }}
                  style={{ display: "flex", justifyContent: "center", alignItems: "center", backgroundColor: "rgba(255, 107, 107, 0.02)", cursor: "pointer" }}
                >
                  <span style={{ color: "rgba(255, 107, 107, 0.2)", fontWeight: "900", fontSize: "1.5rem", userSelect: "none" }}>➡️</span>
                </div>
              </div>

              {/* Bottom Player (Player 2 - Blue) Touch Area */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", pointerEvents: "auto" }}>
                {/* Bottom Left: moves bottom paddle left */}
                <div 
                  onTouchStart={() => { keysPressed.current["ArrowLeft"] = true; }}
                  onTouchEnd={() => { keysPressed.current["ArrowLeft"] = false; }}
                  onMouseDown={() => { keysPressed.current["ArrowLeft"] = true; }}
                  onMouseUp={() => { keysPressed.current["ArrowLeft"] = false; }}
                  onMouseLeave={() => { keysPressed.current["ArrowLeft"] = false; }}
                  style={{ display: "flex", justifyContent: "center", alignItems: "center", backgroundColor: "rgba(76, 201, 240, 0.02)", cursor: "pointer", borderRight: "1px dashed rgba(18,18,18,0.1)" }}
                >
                  <span style={{ transform: "rotate(180deg)", color: "rgba(76, 201, 240, 0.3)", fontWeight: "900", fontSize: "1.5rem", userSelect: "none" }}>➡️</span>
                </div>
                {/* Bottom Right: moves bottom paddle right */}
                <div 
                  onTouchStart={() => { keysPressed.current["ArrowRight"] = true; }}
                  onTouchEnd={() => { keysPressed.current["ArrowRight"] = false; }}
                  onMouseDown={() => { keysPressed.current["ArrowRight"] = true; }}
                  onMouseUp={() => { keysPressed.current["ArrowRight"] = false; }}
                  onMouseLeave={() => { keysPressed.current["ArrowRight"] = false; }}
                  style={{ display: "flex", justifyContent: "center", alignItems: "center", backgroundColor: "rgba(76, 201, 240, 0.02)", cursor: "pointer" }}
                >
                  <span style={{ color: "rgba(76, 201, 240, 0.3)", fontWeight: "900", fontSize: "1.5rem", userSelect: "none" }}>➡️</span>
                </div>
              </div>

            </div>
          )}

          {gameState === "idle" && (
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", backgroundColor: "rgba(250, 246, 240, 0.95)", gap: "1rem" }}>
              <h3 style={{ fontFamily: "var(--font-game)", fontSize: "0.85rem", textAlign: "center" }}>DUAL PONG</h3>
              <p style={{ fontWeight: "600", fontSize: "0.85rem", textAlign: "center", maxWidth: "250px" }}>
                Top Player: A / D keys or Tap left/right half.<br />Bottom Player: Arrow keys or Tap left/right half.
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
