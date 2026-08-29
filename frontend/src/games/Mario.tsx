import React, { useEffect, useRef, useState } from "react";
import { ArrowLeft, RefreshCw, Trophy, Play, Star, AlertCircle } from "lucide-react";
import GameHUDControls from "../components/GameHUDControls";

interface MarioProps {
  onBack: () => void;
  user: any;
  submitScore: (score: number) => Promise<void>;
  leaderboard: any[];
  refreshLeaderboard: () => void;
}

export default function Mario({
  onBack,
  user,
  submitScore,
  leaderboard,
  refreshLeaderboard
}: MarioProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [gameState, setGameState] = useState<"idle" | "playing" | "gameover" | "victory">("idle");
  const [score, setScore] = useState(0);
  const [coins, setCoins] = useState(0);
  const [muted, setMuted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isPausedRef = useRef(false);
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  // Keep tracks of keyboard presses
  const keysPressed = useRef<{ [key: string]: boolean }>({});

  // Auto-submit score on game over or victory
  useEffect(() => {
    if ((gameState === "gameover" || gameState === "victory") && score > 0) {
      localStorage.setItem("arcade_has_played", "true");
      setSubmitting(true);
      submitScore(score)
        .then(() => refreshLeaderboard())
        .catch(e => console.warn("Auto score submit failed", e))
        .finally(() => setSubmitting(false));
    }
  }, [gameState]);

  // Synth audio helper
  const playSound = (type: "jump" | "coin" | "stomp" | "death" | "victory" | "brick") => {
    if (muted || isPausedRef.current) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === "jump") {
        osc.type = "triangle";
        osc.frequency.setValueAtTime(150, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(650, ctx.currentTime + 0.14);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.14);
        osc.start();
        osc.stop(ctx.currentTime + 0.14);
      } else if (type === "coin") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(987.77, ctx.currentTime); // B5
        osc.frequency.setValueAtTime(1318.51, ctx.currentTime + 0.08); // E6
        gain.gain.setValueAtTime(0.06, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      } else if (type === "stomp") {
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(120, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(40, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      } else if (type === "death") {
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(400, ctx.currentTime);
        osc.frequency.setValueAtTime(300, ctx.currentTime + 0.1);
        osc.frequency.setValueAtTime(200, ctx.currentTime + 0.2);
        osc.frequency.setValueAtTime(100, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.18, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        osc.start();
        osc.stop(ctx.currentTime + 0.5);
      } else if (type === "victory") {
        // C Major arpeggio fan fare
        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, idx) => {
          const oscSeq = ctx.createOscillator();
          const gainSeq = ctx.createGain();
          oscSeq.connect(gainSeq);
          gainSeq.connect(ctx.destination);
          oscSeq.type = "sine";
          oscSeq.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.12);
          gainSeq.gain.setValueAtTime(0.08, ctx.currentTime + idx * 0.12);
          gainSeq.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.12 + 0.3);
          oscSeq.start(ctx.currentTime + idx * 0.12);
          oscSeq.stop(ctx.currentTime + idx * 0.12 + 0.3);
        });
      } else if (type === "brick") {
        osc.type = "triangle";
        osc.frequency.setValueAtTime(100, ctx.currentTime);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
        osc.start();
        osc.stop(ctx.currentTime + 0.08);
      }
    } catch (e) {
      console.warn(e);
    }
  };

  // Setup main canvas physics loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;
    let animationFrameId: number;

    // Player parameters
    let playerX = 100;
    let playerY = 150;
    let velocityX = 0;
    let velocityY = 0;
    const gravity = 0.5;
    const friction = 0.85;
    const walkSpeed = 3.5;
    const jumpStrength = -10.5;
    const playerWidth = 24;
    const playerHeight = 36;
    let isGrounded = false;
    let facingRight = true;
    let walkFrame = 0;

    // Viewport camera X offset
    let cameraX = 0;
    const levelWidth = 2400;

    // Level map layout definition
    // Types: "ground", "brick", "question", "solid"
    interface Block {
      x: number;
      y: number;
      width: number;
      height: number;
      type: "ground" | "brick" | "question" | "solid";
      hit?: boolean;
    }

    let blocks: Block[] = [];

    // Construct procedural map structures
    // Ground slabs with some pits/jumps
    let curX = 0;
    while (curX < levelWidth) {
      // 10% chance of a pit of width 90px, except near start and flagpole end
      if (curX > 300 && curX < levelWidth - 300 && Math.random() < 0.14) {
        curX += 90;
        continue;
      }
      blocks.push({ x: curX, y: 280, width: 120, height: 40, type: "ground" });
      curX += 120;
    }

    // Platforms and mystery item blocks
    const platformLocations = [
      { x: 300, y: 180, type: "question" },
      { x: 340, y: 180, type: "brick" },
      { x: 380, y: 180, type: "question" },
      { x: 420, y: 180, type: "brick" },
      { x: 460, y: 180, type: "question" },

      { x: 650, y: 150, type: "brick" },
      { x: 690, y: 150, type: "question" },
      { x: 730, y: 150, type: "brick" },

      { x: 950, y: 180, type: "question" },
      { x: 1100, y: 150, type: "brick" },
      { x: 1140, y: 150, type: "question" },
      { x: 1180, y: 150, type: "brick" },

      // High pyramid stairs
      { x: 1400, y: 240, type: "solid" },
      { x: 1440, y: 240, type: "solid" },
      { x: 1440, y: 200, type: "solid" },
      { x: 1480, y: 240, type: "solid" },
      { x: 1480, y: 200, type: "solid" },
      { x: 1480, y: 160, type: "solid" },

      { x: 1700, y: 180, type: "question" },
      { x: 1740, y: 180, type: "question" }
    ];

    platformLocations.forEach(loc => {
      blocks.push({ x: loc.x, y: loc.y, width: 40, height: 40, type: loc.type as any });
    });

    // Goomba parameters
    interface Goomba {
      x: number;
      y: number;
      width: number;
      height: number;
      dir: number;
      alive: boolean;
      squashTimer: number;
    }

    let goombas: Goomba[] = [
      { x: 450, y: 240, width: 24, height: 24, dir: -1, alive: true, squashTimer: 0 },
      { x: 800, y: 240, width: 24, height: 24, dir: -1, alive: true, squashTimer: 0 },
      { x: 1050, y: 240, width: 24, height: 24, dir: -1, alive: true, squashTimer: 0 },
      { x: 1300, y: 240, width: 24, height: 24, dir: 1, alive: true, squashTimer: 0 },
      { x: 1650, y: 240, width: 24, height: 24, dir: -1, alive: true, squashTimer: 0 },
      { x: 1900, y: 240, width: 24, height: 24, dir: -1, alive: true, squashTimer: 0 }
    ];

    // Spawning items
    interface CoinParticle {
      x: number;
      y: number;
      vy: number;
      timer: number;
    }
    let coinParticles: CoinParticle[] = [];

    // Flagpole endpoint at x = 2200
    const flagPoleX = 2200;

    const gameLoop = () => {
      if (isPausedRef.current) {
        animationFrameId = requestAnimationFrame(gameLoop);
        return;
      }

      // 1. Process player movement keyboard controls
      if (keysPressed.current["ArrowLeft"] || keysPressed.current["KeyA"]) {
        velocityX = -walkSpeed;
        facingRight = false;
        walkFrame += 0.15;
      } else if (keysPressed.current["ArrowRight"] || keysPressed.current["KeyD"]) {
        velocityX = walkSpeed;
        facingRight = true;
        walkFrame += 0.15;
      } else {
        velocityX *= friction;
      }

      // Apply physics constants
      velocityY += gravity;
      playerX += velocityX;
      playerY += velocityY;

      // Restrict coordinate bounds
      if (playerX < 0) playerX = 0;

      // 2. Collision checking (Platform blocks)
      isGrounded = false;
      blocks.forEach(b => {
        // AABB check
        const overlapX = playerX + playerWidth > b.x && playerX < b.x + b.width;
        const overlapY = playerY + playerHeight > b.y && playerY < b.y + b.height;

        if (overlapX && overlapY) {
          // Resolve y axis overlap
          const midPlayerX = playerX + playerWidth / 2;
          const midBlockX = b.x + b.width / 2;
          const midPlayerY = playerY + playerHeight / 2;
          const midBlockY = b.y + b.height / 2;

          const widthCombined = (playerWidth + b.width) / 2;
          const heightCombined = (playerHeight + b.height) / 2;

          const dx = midPlayerX - midBlockX;
          const dy = midPlayerY - midBlockY;

          const wy = widthCombined * dy;
          const hx = heightCombined * dx;

          if (wy > hx) {
            if (wy > -hx) {
              // Collision on bottom of block (player head bumps block)
              playerY = b.y + b.height;
              velocityY = 0.5; // bounce head off
              
              // Handle question or brick blocks bump
              if (b.type === "question" && !b.hit) {
                b.hit = true;
                playSound("coin");
                setCoins(prev => prev + 1);
                setScore(prev => prev + 100);
                coinParticles.push({ x: b.x + 10, y: b.y - 10, vy: -5, timer: 30 });
              } else if (b.type === "brick") {
                playSound("brick");
                setScore(prev => prev + 10);
                // Simple brick bump effect: push it up slightly or delete
              }
            } else {
              // Collision on left side of block
              playerX = b.x - playerWidth;
              velocityX = 0;
            }
          } else {
            if (wy > -hx) {
              // Collision on right side of block
              playerX = b.x + b.width;
              velocityX = 0;
            } else {
              // Collision on top of block (player lands)
              playerY = b.y - playerHeight;
              velocityY = 0;
              isGrounded = true;
            }
          }
        }
      });

      // 3. Fall into pits death check
      if (playerY > canvas.height + 50) {
        playSound("death");
        setGameState("gameover");
        return;
      }

      // Handle Jumps
      if ((keysPressed.current["Space"] || keysPressed.current["ArrowUp"] || keysPressed.current["KeyW"]) && isGrounded) {
        velocityY = jumpStrength;
        isGrounded = false;
        playSound("jump");
        // Consume jump key immediately so they can't jump continuously by holding
        keysPressed.current["Space"] = false;
        keysPressed.current["ArrowUp"] = false;
        keysPressed.current["KeyW"] = false;
      }

      // 4. Update Goombas
      goombas.forEach(g => {
        if (!g.alive) {
          if (g.squashTimer > 0) g.squashTimer--;
          return;
        }

        // Walk left/right
        g.x += g.dir * 1.2;

        // Turn around at borders or pits
        if (g.x < 0 || g.x > levelWidth - 30) {
          g.dir *= -1;
        }

        // Check platform block edges to prevent falling off blocks (keep Goombas local)
        let fallsOff = true;
        blocks.forEach(b => {
          if (g.x + g.width / 2 > b.x && g.x + g.width / 2 < b.x + b.width) {
            if (Math.abs(g.y + g.height - b.y) < 5) {
              fallsOff = false;
            }
          }
        });
        if (fallsOff && g.y === 256) {
          g.dir *= -1;
        }

        // Mario collision checks
        const overlapX = playerX + playerWidth > g.x && playerX < g.x + g.width;
        const overlapY = playerY + playerHeight > g.y && playerY < g.y + g.height;

        if (overlapX && overlapY) {
          // If falling downward on top of Goomba head -> Squished!
          if (velocityY > 0 && playerY + playerHeight - velocityY <= g.y + 6) {
            g.alive = false;
            g.squashTimer = 40;
            velocityY = jumpStrength * 0.75; // small rebound jump
            playSound("stomp");
            setScore(prev => prev + 200);
          } else {
            // Hit from side -> Player dies
            playSound("death");
            setGameState("gameover");
          }
        }
      });

      // 5. Check Flagpole finish win condition
      if (playerX + playerWidth >= flagPoleX) {
        playSound("victory");
        // Win bonus points for quick time
        setScore(prev => prev + 1000 + coins * 50);
        setGameState("victory");
        return;
      }

      // 6. Camera follows player centered (offset X boundary constraints)
      cameraX = playerX - canvas.width / 2 + playerWidth / 2;
      if (cameraX < 0) cameraX = 0;
      if (cameraX > levelWidth - canvas.width) cameraX = levelWidth - canvas.width;

      // 7. RENDER ELEMENTS ON CANVAS
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw Sky & Clouds
      ctx.fillStyle = "#a5d8ff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = "#fff";
      // Render simple vector clouds
      ctx.fillRect(100 - cameraX * 0.2, 50, 60, 20);
      ctx.fillRect(400 - cameraX * 0.2, 70, 75, 25);
      ctx.fillRect(700 - cameraX * 0.2, 40, 50, 20);
      ctx.fillRect(1100 - cameraX * 0.2, 60, 80, 30);
      ctx.fillRect(1500 - cameraX * 0.2, 50, 65, 22);

      // Draw Blocks
      blocks.forEach(b => {
        // Only draw blocks inside the visible viewport area
        if (b.x + b.width < cameraX || b.x > cameraX + canvas.width) return;

        if (b.type === "ground") {
          // Brown brick vector floor
          ctx.fillStyle = "#c87d55";
          ctx.fillRect(b.x - cameraX, b.y, b.width, b.height);
          // Dark green top grass layer
          ctx.fillStyle = "#5c940c";
          ctx.fillRect(b.x - cameraX, b.y, b.width, 10);
        } else if (b.type === "brick") {
          ctx.fillStyle = "#b23b00";
          ctx.fillRect(b.x - cameraX, b.y, b.width, b.height);
          // Draw standard brick grids
          ctx.strokeStyle = "#121212";
          ctx.lineWidth = 2.5;
          ctx.strokeRect(b.x - cameraX, b.y, b.width, b.height);
          ctx.beginPath();
          ctx.moveTo(b.x - cameraX + 20, b.y);
          ctx.lineTo(b.x - cameraX + 20, b.y + 40);
          ctx.moveTo(b.x - cameraX, b.y + 20);
          ctx.lineTo(b.x - cameraX + 40, b.y + 20);
          ctx.stroke();
        } else if (b.type === "question") {
          ctx.fillStyle = b.hit ? "#7a7a7a" : "#fca000";
          ctx.fillRect(b.x - cameraX, b.y, b.width, b.height);
          ctx.strokeStyle = "#121212";
          ctx.lineWidth = 3;
          ctx.strokeRect(b.x - cameraX, b.y, b.width, b.height);
          
          if (!b.hit) {
            // Draw Question "?" sign
            ctx.fillStyle = "#fff";
            ctx.font = "bold 1.8rem var(--font-ui)";
            ctx.textAlign = "center";
            ctx.fillText("?", b.x - cameraX + 20, b.y + 30);
          }
        } else if (b.type === "solid") {
          ctx.fillStyle = "#8a8a8a";
          ctx.fillRect(b.x - cameraX, b.y, b.width, b.height);
          ctx.strokeStyle = "#121212";
          ctx.lineWidth = 3;
          ctx.strokeRect(b.x - cameraX, b.y, b.width, b.height);
        }
      });

      // Draw Flagpole castle exit goal
      ctx.fillStyle = "#74b816";
      ctx.fillRect(flagPoleX - cameraX, 50, 8, 230);
      ctx.fillStyle = "#ff922b";
      ctx.fillRect(flagPoleX - cameraX - 12, 60, 24, 16); // Exit flag banner
      ctx.strokeStyle = "#121212";
      ctx.lineWidth = 3;
      ctx.strokeRect(flagPoleX - cameraX - 12, 60, 24, 16);

      // Draw Goombas
      goombas.forEach(g => {
        if (g.x + g.width < cameraX || g.x > cameraX + canvas.width) return;
        
        if (g.alive) {
          ctx.fillStyle = "#862e00"; // Dark brown body Goomba
          ctx.fillRect(g.x - cameraX, g.y, g.width, g.height);
          ctx.fillStyle = "#ffc0ad"; // Light feet
          ctx.fillRect(g.x - cameraX + 2, g.y + 18, 6, 6);
          ctx.fillRect(g.x - cameraX + 16, g.y + 18, 6, 6);
          ctx.strokeStyle = "#121212";
          ctx.lineWidth = 2.5;
          ctx.strokeRect(g.x - cameraX, g.y, g.width, g.height);
        } else if (g.squashTimer > 0) {
          // Render flat squashed shape Goomba
          ctx.fillStyle = "#862e00";
          ctx.fillRect(g.x - cameraX, g.y + 16, g.width, 8);
          ctx.strokeStyle = "#121212";
          ctx.lineWidth = 2;
          ctx.strokeRect(g.x - cameraX, g.y + 16, g.width, 8);
        }
      });

      // Draw popping Coin Particles
      coinParticles.forEach((part, index) => {
        part.y += part.vy;
        part.vy += 0.3; // Gravity pull
        part.timer--;
        
        // Draw gold coin circle
        ctx.fillStyle = "#ffd43b";
        ctx.strokeStyle = "#121212";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(part.x - cameraX + 10, part.y, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        if (part.timer <= 0) {
          coinParticles.splice(index, 1);
        }
      });

      // Draw Mario Player character sprite
      // Base walk frames bouncing
      const isWalking = Math.abs(velocityX) > 0.2 && isGrounded;
      const walkOffset = isWalking ? Math.sin(walkFrame) * 3 : 0;

      ctx.fillStyle = "red"; // Cap and Shirt
      ctx.fillRect(playerX - cameraX, playerY + walkOffset, playerWidth, 18);
      ctx.fillStyle = "blue"; // Overalls
      ctx.fillRect(playerX - cameraX + 3, playerY + 18 + walkOffset, playerWidth - 6, 18);
      ctx.fillStyle = "#ffd8a8"; // Skin face
      const faceOffset = facingRight ? 6 : 0;
      ctx.fillRect(playerX - cameraX + faceOffset, playerY + 6 + walkOffset, playerWidth - 6, 8);

      // Retro outline border
      ctx.strokeStyle = "#121212";
      ctx.lineWidth = 3;
      ctx.strokeRect(playerX - cameraX, playerY + walkOffset, playerWidth, playerHeight);

      animationFrameId = requestAnimationFrame(gameLoop);
    };

    if (gameState === "playing") {
      animationFrameId = requestAnimationFrame(gameLoop);
    }

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
      cancelAnimationFrame(animationFrameId);
    };
  }, [gameState, isPaused]);

  const startGame = () => {
    localStorage.setItem("arcade_has_played", "true");
    setScore(0);
    setCoins(0);
    setIsPaused(false);
    isPausedRef.current = false;
    setGameState("playing");
  };

  // Mobile virtual buttons handlers (triggers mock keyboard event loops)
  const triggerMovement = (code: string, isPress: boolean) => {
    keysPressed.current[code] = isPress;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Header Panel */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button onClick={onBack} className="neo-btn secondary" style={{ padding: "0.5rem 1rem" }}>
          <ArrowLeft size={18} /> BACK
        </button>
        <h2 className="game-title-text mobile-hide" style={{ fontSize: "1rem" }}>SUPER MARIO BROS</h2>
        
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
        
        {/* Play Area */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem", width: "100%" }}>
          <div 
            className="neo-card game-view-box" 
            style={{ 
              padding: "0", 
              overflow: "hidden", 
              position: "relative", 
              backgroundColor: "#a5d8ff", 
              display: "flex", 
              flexDirection: "column", 
              alignItems: "center",
              width: "100%",
              maxWidth: "600px",
              boxSizing: "border-box",
              border: "4px solid #121212",
              boxShadow: "6px 6px 0px 0px #121212"
            }}
          >
            <canvas
              ref={canvasRef}
              width={600}
              height={320}
              style={{ width: "100%", height: "auto", display: "block", background: "#a5d8ff", outline: "none" }}
            />

            {/* Title / Intro screen overlay */}
            {gameState === "idle" && (
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", backgroundColor: "rgba(165, 216, 255, 0.95)", gap: "1rem" }}>
                <div style={{ fontFamily: "var(--font-game)", fontSize: "1.5rem", fontWeight: "900", color: "#b23b00", textShadow: "2px 2px 0px #fff" }}>SUPER MARIO</div>
                <p style={{ fontWeight: "700", fontSize: "0.85rem", color: "#121212" }}>Walk with Arrow Keys / A & D. Jump with Space / W.</p>
                <button onClick={startGame} className="neo-btn accent">START PLAYING</button>
              </div>
            )}

            {/* Game Over screen overlay */}
            {gameState === "gameover" && (
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", backgroundColor: "rgba(18,18,18,0.85)", gap: "1rem" }}>
                <div style={{ fontFamily: "var(--font-game)", fontSize: "1.4rem", color: "red" }}>GAME OVER</div>
                <div style={{ fontSize: "1.5rem", fontWeight: "800", color: "#fff" }}>SCORE: {score}</div>
                <button onClick={startGame} className="neo-btn accent"><RefreshCw size={16} /> REPLAY</button>
              </div>
            )}

            {/* Level Clear screen overlay */}
            {gameState === "victory" && (
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", backgroundColor: "rgba(92,148,12,0.9)", gap: "1rem" }}>
                <div style={{ fontFamily: "var(--font-game)", fontSize: "1.5rem", color: "#fff", fontWeight: "900" }}>STAGE CLEAR!</div>
                <div style={{ fontSize: "1.8rem", fontWeight: "900", color: "#ffd43b" }}>SCORE: {score}</div>
                <div style={{ fontSize: "1rem", fontWeight: "800", color: "#fff" }}>COINS: {coins}</div>
                <button onClick={startGame} className="neo-btn accent" style={{ backgroundColor: "#fff", color: "#121212" }}><RefreshCw size={16} /> REPLAY</button>
              </div>
            )}
          </div>

          {/* Virtual Mobile Controllers D-pad */}
          {gameState === "playing" && !isPaused && (
            <div style={{ display: "flex", width: "100%", maxWidth: "420px", justifyContent: "space-between", padding: "0 1rem", boxSizing: "border-box", userSelect: "none" }}>
              {/* Walk buttons */}
              <div style={{ display: "flex", gap: "0.6rem" }}>
                <button
                  onTouchStart={() => triggerMovement("KeyA", true)}
                  onTouchEnd={() => triggerMovement("KeyA", false)}
                  onMouseDown={() => triggerMovement("KeyA", true)}
                  onMouseUp={() => triggerMovement("KeyA", false)}
                  className="neo-btn secondary"
                  style={{ width: "60px", height: "55px", justifyContent: "center", fontSize: "1.2rem", fontWeight: "900", touchAction: "manipulation" }}
                >
                  ◀
                </button>
                <button
                  onTouchStart={() => triggerMovement("KeyD", true)}
                  onTouchEnd={() => triggerMovement("KeyD", false)}
                  onMouseDown={() => triggerMovement("KeyD", true)}
                  onMouseUp={() => triggerMovement("KeyD", false)}
                  className="neo-btn secondary"
                  style={{ width: "60px", height: "55px", justifyContent: "center", fontSize: "1.2rem", fontWeight: "900", touchAction: "manipulation" }}
                >
                  ▶
                </button>
              </div>

              {/* Jump button */}
              <button
                onTouchStart={() => triggerMovement("Space", true)}
                onTouchEnd={() => triggerMovement("Space", false)}
                onMouseDown={() => triggerMovement("Space", true)}
                onMouseUp={() => triggerMovement("Space", false)}
                className="neo-btn accent"
                style={{ width: "100px", height: "55px", justifyContent: "center", fontSize: "1.1rem", fontWeight: "900", touchAction: "manipulation" }}
              >
                JUMP 🚀
              </button>
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
                    <span>{entry.score} pts</span>
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
