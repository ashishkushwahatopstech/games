import React, { useEffect, useRef, useState } from "react";
import { ArrowLeft, RefreshCw, Trophy, Star, Zap } from "lucide-react";
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
  
  // Game states
  const [gameState, setGameState] = useState<"idle" | "playing" | "gameover" | "victory">("idle");
  const [score, setScore] = useState(0);
  const [coins, setCoins] = useState(0);
  const [isSuper, setIsSuper] = useState(false);
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

  // Retro sound synthesizers
  const playSound = (type: "jump" | "coin" | "stomp" | "death" | "victory" | "brick" | "powerup" | "powerdown") => {
    if (muted || isPausedRef.current) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === "jump") {
        osc.type = "triangle";
        osc.frequency.setValueAtTime(160, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(700, ctx.currentTime + 0.16);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.16);
        osc.start();
        osc.stop(ctx.currentTime + 0.16);
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
        osc.frequency.linearRampToValueAtTime(30, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      } else if (type === "brick") {
        osc.type = "triangle";
        osc.frequency.setValueAtTime(110, ctx.currentTime);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
      } else if (type === "powerup") {
        // High rising retro synth
        const notes = [330, 440, 550, 660, 880];
        notes.forEach((freq, idx) => {
          const oscSeq = ctx.createOscillator();
          const gainSeq = ctx.createGain();
          oscSeq.connect(gainSeq);
          gainSeq.connect(ctx.destination);
          oscSeq.type = "sine";
          oscSeq.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.07);
          gainSeq.gain.setValueAtTime(0.06, ctx.currentTime + idx * 0.07);
          gainSeq.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.07 + 0.15);
          oscSeq.start(ctx.currentTime + idx * 0.07);
          oscSeq.stop(ctx.currentTime + idx * 0.07 + 0.15);
        });
      } else if (type === "powerdown") {
        // Falling retro synth
        const notes = [880, 660, 550, 440, 330];
        notes.forEach((freq, idx) => {
          const oscSeq = ctx.createOscillator();
          const gainSeq = ctx.createGain();
          oscSeq.connect(gainSeq);
          gainSeq.connect(ctx.destination);
          oscSeq.type = "sine";
          oscSeq.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.07);
          gainSeq.gain.setValueAtTime(0.06, ctx.currentTime + idx * 0.07);
          gainSeq.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.07 + 0.15);
          oscSeq.start(ctx.currentTime + idx * 0.07);
          oscSeq.stop(ctx.currentTime + idx * 0.07 + 0.15);
        });
      } else if (type === "death") {
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(450, ctx.currentTime);
        osc.frequency.setValueAtTime(320, ctx.currentTime + 0.12);
        osc.frequency.setValueAtTime(220, ctx.currentTime + 0.24);
        osc.frequency.setValueAtTime(100, ctx.currentTime + 0.36);
        gain.gain.setValueAtTime(0.18, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
        osc.start();
        osc.stop(ctx.currentTime + 0.6);
      } else if (type === "victory") {
        const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98];
        notes.forEach((freq, idx) => {
          const oscSeq = ctx.createOscillator();
          const gainSeq = ctx.createGain();
          oscSeq.connect(gainSeq);
          gainSeq.connect(ctx.destination);
          oscSeq.type = "sine";
          oscSeq.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.1);
          gainSeq.gain.setValueAtTime(0.07, ctx.currentTime + idx * 0.1);
          gainSeq.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.1 + 0.25);
          oscSeq.start(ctx.currentTime + idx * 0.1);
          oscSeq.stop(ctx.currentTime + idx * 0.1 + 0.25);
        });
      }
    } catch (e) {
      console.warn(e);
    }
  };

  // Main Canvas game loops
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;
    let animationFrameId: number;

    // Mario physics
    let playerX = 80;
    let playerY = 100;
    let velocityX = 0;
    let velocityY = 0;
    const gravity = 0.45;
    const friction = 0.85;
    const acceleration = 0.35;
    const maxWalkSpeed = 3.6;
    const jumpStrength = -10.2;
    
    // Invincibility frames after getting hit
    let invulnerableTimer = 0;

    // Get current dimensions
    const getPlayerWidth = () => 20;
    const getPlayerHeight = () => (isSuper ? 44 : 28);

    let isGrounded = false;
    let facingRight = true;
    let walkFrame = 0;

    // Level configuration
    const levelWidth = 3200;
    let cameraX = 0;
    const flagPoleX = 2950;

    // Map structures
    interface Block {
      id: string;
      x: number;
      y: number;
      width: number;
      height: number;
      type: "ground" | "brick" | "question" | "solid" | "pipe";
      item?: "coin" | "mushroom" | null;
      hit?: boolean;
    }

    let blocks: Block[] = [];

    // Procedural level generation
    // Ground mapping with gaps
    let curX = 0;
    while (curX < levelWidth) {
      if (curX > 400 && curX < levelWidth - 400 && Math.random() < 0.15) {
        // Pit spacing
        curX += 96;
        continue;
      }
      blocks.push({ id: `ground-${curX}`, x: curX, y: 280, width: 96, height: 40, type: "ground" });
      curX += 96;
    }

    // Platforms
    const mapItems: Omit<Block, "id" | "width" | "height">[] = [
      // Section 1
      { x: 300, y: 180, type: "question", item: "coin" },
      { x: 340, y: 180, type: "brick" },
      { x: 380, y: 180, type: "question", item: "mushroom" }, // First Mushroom powerup block!
      { x: 420, y: 180, type: "brick" },
      { x: 460, y: 180, type: "question", item: "coin" },

      // Warp Pipe
      { x: 580, y: 220, type: "pipe" },

      // Section 2
      { x: 800, y: 180, type: "brick" },
      { x: 840, y: 180, type: "question", item: "coin" },
      { x: 880, y: 180, type: "brick" },
      { x: 920, y: 100, type: "brick" },
      { x: 960, y: 100, type: "question", item: "mushroom" }, // High level mushroom
      { x: 1000, y: 100, type: "brick" },

      // Warp Pipe
      { x: 1150, y: 200, type: "pipe" },

      // Section 3
      { x: 1400, y: 180, type: "question", item: "coin" },
      { x: 1440, y: 180, type: "question", item: "coin" },
      { x: 1480, y: 180, type: "question", item: "coin" },

      // Pyramid stairs
      { x: 1700, y: 240, type: "solid" },
      { x: 1740, y: 240, type: "solid" },
      { x: 1740, y: 200, type: "solid" },
      { x: 1780, y: 240, type: "solid" },
      { x: 1780, y: 200, type: "solid" },
      { x: 1780, y: 160, type: "solid" },
      { x: 1820, y: 240, type: "solid" },
      { x: 1820, y: 200, type: "solid" },
      { x: 1820, y: 160, type: "solid" },
      { x: 1820, y: 120, type: "solid" },

      // Warp Pipe
      { x: 2050, y: 220, type: "pipe" },

      // Section 4
      { x: 2300, y: 180, type: "brick" },
      { x: 2340, y: 180, type: "question", item: "mushroom" },
      { x: 2380, y: 180, type: "brick" },

      // Final staircase to flag
      { x: 2700, y: 240, type: "solid" },
      { x: 2740, y: 240, type: "solid" },
      { x: 2740, y: 200, type: "solid" },
      { x: 2780, y: 240, type: "solid" },
      { x: 2780, y: 200, type: "solid" },
      { x: 2780, y: 160, type: "solid" },
      { x: 2820, y: 240, type: "solid" },
      { x: 2820, y: 200, type: "solid" },
      { x: 2820, y: 160, type: "solid" },
      { x: 2820, y: 120, type: "solid" }
    ];

    mapItems.forEach((m, idx) => {
      const isPipe = m.type === "pipe";
      blocks.push({
        id: `block-${idx}`,
        x: m.x,
        y: m.y,
        width: isPipe ? 50 : 40,
        height: isPipe ? 280 - m.y : 40,
        type: m.type,
        item: m.item,
        hit: false
      });
    });

    // Goomba Enemies
    interface Goomba {
      x: number;
      y: number;
      width: number;
      height: number;
      vx: number;
      alive: boolean;
      squashTimer: number;
    }

    let goombas: Goomba[] = [
      { x: 420, y: 256, width: 24, height: 24, vx: -1.0, alive: true, squashTimer: 0 },
      { x: 750, y: 256, width: 24, height: 24, vx: -1.0, alive: true, squashTimer: 0 },
      { x: 1050, y: 256, width: 24, height: 24, vx: -1.0, alive: true, squashTimer: 0 },
      { x: 1350, y: 256, width: 24, height: 24, vx: -1.0, alive: true, squashTimer: 0 },
      { x: 1600, y: 256, width: 24, height: 24, vx: -1.0, alive: true, squashTimer: 0 },
      { x: 1950, y: 256, width: 24, height: 24, vx: -1.0, alive: true, squashTimer: 0 },
      { x: 2200, y: 256, width: 24, height: 24, vx: 1.0, alive: true, squashTimer: 0 },
      { x: 2500, y: 256, width: 24, height: 24, vx: -1.0, alive: true, squashTimer: 0 }
    ];

    // Power-up Super Mushroom
    interface Mushroom {
      x: number;
      y: number;
      vx: number;
      vy: number;
      active: boolean;
      spawning: boolean;
      spawnTimer: number;
    }
    let mushroom: Mushroom = { x: 0, y: 0, vx: 1.8, vy: 0, active: false, spawning: false, spawnTimer: 0 };

    // Shattered brick shards particle effects
    interface Shard {
      x: number;
      y: number;
      vx: number;
      vy: number;
      rotation: number;
      vr: number;
      timer: number;
    }
    let shards: Shard[] = [];

    // Popping coins particle effects
    interface CoinParticle {
      x: number;
      y: number;
      vy: number;
      timer: number;
    }
    let coinParticles: CoinParticle[] = [];

    // Dust particles when skidding
    interface DustParticle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      alpha: number;
    }
    let dustParticles: DustParticle[] = [];

    const update = () => {
      if (isPausedRef.current) {
        animationFrameId = requestAnimationFrame(update);
        return;
      }

      // Handle invulnerability blink timer
      if (invulnerableTimer > 0) invulnerableTimer--;

      // 1. Process Horizontal Inputs with Momentum
      const leftKey = keysPressed.current["ArrowLeft"] || keysPressed.current["KeyA"];
      const rightKey = keysPressed.current["ArrowRight"] || keysPressed.current["KeyD"];

      if (leftKey) {
        if (velocityX > 0) {
          // Skid dust effect
          if (isGrounded && Math.random() < 0.3) {
            dustParticles.push({
              x: playerX + getPlayerWidth() / 2,
              y: playerY + getPlayerHeight(),
              vx: Math.random() * 2,
              vy: -Math.random() * 1,
              alpha: 1.0
            });
          }
          velocityX -= acceleration * 1.5; // faster deceleration during skids
        } else {
          velocityX -= acceleration;
        }
        facingRight = false;
        if (isGrounded) walkFrame += 0.2;
      } else if (rightKey) {
        if (velocityX < 0) {
          // Skid dust effect
          if (isGrounded && Math.random() < 0.3) {
            dustParticles.push({
              x: playerX + getPlayerWidth() / 2,
              y: playerY + getPlayerHeight(),
              vx: -Math.random() * 2,
              vy: -Math.random() * 1,
              alpha: 1.0
            });
          }
          velocityX += acceleration * 1.5;
        } else {
          velocityX += acceleration;
        }
        facingRight = true;
        if (isGrounded) walkFrame += 0.2;
      } else {
        velocityX *= friction;
      }

      // Cap speed
      if (velocityX > maxWalkSpeed) velocityX = maxWalkSpeed;
      if (velocityX < -maxWalkSpeed) velocityX = -maxWalkSpeed;

      // 2. Handle Jump & Variable Jump Heights (gravity reduction if key held)
      const jumpKey = keysPressed.current["Space"] || keysPressed.current["ArrowUp"] || keysPressed.current["KeyW"];
      if (jumpKey && isGrounded) {
        velocityY = jumpStrength;
        isGrounded = false;
        playSound("jump");
      } else if (!jumpKey && velocityY < -3) {
        // Let go of jump button early -> cut upward velocity
        velocityY = -3;
      }

      // Apply gravity
      velocityY += gravity;

      // Position update
      playerX += velocityX;
      playerY += velocityY;

      // Map bounds constraints
      if (playerX < 0) {
        playerX = 0;
        velocityX = 0;
      }

      // 3. Update Mushroom Spawning & Physics
      if (mushroom.active) {
        if (mushroom.spawning) {
          mushroom.spawnTimer--;
          mushroom.y -= 1; // rise out of block slowly
          if (mushroom.spawnTimer <= 0) {
            mushroom.spawning = false;
          }
        } else {
          // Normal mushroom physics
          mushroom.vy += gravity;
          mushroom.x += mushroom.vx;
          mushroom.y += mushroom.vy;

          // Block collisions for mushroom
          blocks.forEach(b => {
            const overlapX = mushroom.x + 16 > b.x && mushroom.x < b.x + b.width;
            const overlapY = mushroom.y + 16 > b.y && mushroom.y < b.y + b.height;
            if (overlapX && overlapY) {
              // Resolve collision
              const dy = (mushroom.y + 8) - (b.y + b.height / 2);
              const dx = (mushroom.x + 8) - (b.x + b.width / 2);
              if (Math.abs(dx) > Math.abs(dy)) {
                // Bounce horizontal wall
                mushroom.vx *= -1;
                mushroom.x += mushroom.vx;
              } else {
                // Land vertical
                if (dy < 0) {
                  mushroom.y = b.y - 16;
                  mushroom.vy = 0;
                } else {
                  mushroom.y = b.y + b.height;
                  mushroom.vy = 0.5;
                }
              }
            }
          });

          // Check Mario powerup acquisition
          const pWidth = getPlayerWidth();
          const pHeight = getPlayerHeight();
          const collidesMario = playerX + pWidth > mushroom.x && playerX < mushroom.x + 16 &&
                              playerY + pHeight > mushroom.y && playerY < mushroom.y + 16;
          if (collidesMario) {
            mushroom.active = false;
            playSound("powerup");
            setIsSuper(true);
            setScore(prev => prev + 1000);
          }
        }
      }

      // 4. Resolve Player collisions against blocks
      isGrounded = false;
      const pWidth = getPlayerWidth();
      const pHeight = getPlayerHeight();

      blocks.forEach(b => {
        const overlapX = playerX + pWidth > b.x && playerX < b.x + b.width;
        const overlapY = playerY + pHeight > b.y && playerY < b.y + b.height;

        if (overlapX && overlapY) {
          const midPlayerX = playerX + pWidth / 2;
          const midBlockX = b.x + b.width / 2;
          const midPlayerY = playerY + pHeight / 2;
          const midBlockY = b.y + b.height / 2;

          const widthCombined = (pWidth + b.width) / 2;
          const heightCombined = (pHeight + b.height) / 2;

          const dx = midPlayerX - midBlockX;
          const dy = midPlayerY - midBlockY;

          const wy = widthCombined * dy;
          const hx = heightCombined * dx;

          if (wy > hx) {
            if (wy > -hx) {
              // Bottom collision (bumping block from below)
              playerY = b.y + b.height;
              velocityY = 0.5; // bounce back down

              // Trigger action on block
              if (b.type === "question" && !b.hit) {
                b.hit = true;
                if (b.item === "coin") {
                  playSound("coin");
                  setCoins(c => c + 1);
                  setScore(s => s + 100);
                  coinParticles.push({ x: b.x + 12, y: b.y - 12, vy: -5.5, timer: 28 });
                } else if (b.item === "mushroom") {
                  // Spawn mushroom rising
                  mushroom.x = b.x + 12;
                  mushroom.y = b.y;
                  mushroom.vx = 1.6;
                  mushroom.vy = 0;
                  mushroom.active = true;
                  mushroom.spawning = true;
                  mushroom.spawnTimer = 24; // 24 ticks rising
                  playSound("powerup");
                }
              } else if (b.type === "brick") {
                if (isSuper) {
                  // Shatter brick! Remove block from array
                  playSound("brick");
                  blocks = blocks.filter(x => x.id !== b.id);
                  // Spawn 4 shards flying in directions
                  shards.push(
                    { x: b.x + 8, y: b.y + 8, vx: -2.5, vy: -6, rotation: 0, vr: -0.15, timer: 50 },
                    { x: b.x + 24, y: b.y + 8, vx: 2.5, vy: -6, rotation: 0, vr: 0.15, timer: 50 },
                    { x: b.x + 8, y: b.y + 24, vx: -2.0, vy: -4, rotation: 0, vr: -0.1, timer: 50 },
                    { x: b.x + 24, y: b.y + 24, vx: 2.0, vy: -4, rotation: 0, vr: 0.1, timer: 50 }
                  );
                  setScore(s => s + 50);
                } else {
                  // Small bounce brick tone
                  playSound("brick");
                }
              }
            } else {
              // Left collision
              playerX = b.x - pWidth;
              velocityX = 0;
            }
          } else {
            if (wy > -hx) {
              // Right collision
              playerX = b.x + b.width;
              velocityX = 0;
            } else {
              // Top collision (landing on block top)
              playerY = b.y - pHeight;
              velocityY = 0;
              isGrounded = true;
            }
          }
        }
      });

      // 5. Update Goombas behavior
      goombas.forEach(g => {
        if (!g.alive) {
          if (g.squashTimer > 0) g.squashTimer--;
          return;
        }

        g.x += g.vx;

        // Turn around at edge walls
        if (g.x < 0 || g.x > levelWidth - 32) {
          g.vx *= -1;
        }

        // Mario collision stomps vs hits
        const overlapX = playerX + pWidth > g.x && playerX < g.x + g.width;
        const overlapY = playerY + pHeight > g.y && playerY < g.y + g.height;

        if (overlapX && overlapY) {
          // Stepping on head stomp condition
          if (velocityY > 0 && playerY + pHeight - velocityY <= g.y + 8) {
            g.alive = false;
            g.squashTimer = 35;
            velocityY = jumpStrength * 0.7; // rebound jump force
            playSound("stomp");
            setScore(s => s + 200);
          } else {
            // Hit by Goomba
            if (invulnerableTimer <= 0) {
              if (isSuper) {
                // shrink back to small Mario
                setIsSuper(false);
                invulnerableTimer = 90; // Invincible frames
                playSound("powerdown");
              } else {
                // Small Mario dies
                playSound("death");
                setGameState("gameover");
              }
            }
          }
        }
      });

      // 6. Check Flagpole finish win condition
      if (playerX + pWidth >= flagPoleX) {
        playSound("victory");
        // Final score bonus calculations
        setScore(s => s + 1500 + coins * 100);
        setGameState("victory");
        return;
      }

      // Check pit falls
      if (playerY > canvas.height + 40) {
        playSound("death");
        setGameState("gameover");
        return;
      }

      // 7. Update Particles
      // Dust particles fading
      dustParticles.forEach((dp, idx) => {
        dp.x += dp.vx;
        dp.y += dp.vy;
        dp.alpha -= 0.05;
        if (dp.alpha <= 0) {
          dustParticles.splice(idx, 1);
        }
      });

      // Brick shards fall
      shards.forEach((s, idx) => {
        s.vy += gravity;
        s.x += s.vx;
        s.y += s.vy;
        s.rotation += s.vr;
        s.timer--;
        if (s.timer <= 0) {
          shards.splice(idx, 1);
        }
      });

      // Coin particles path
      coinParticles.forEach((cp, idx) => {
        cp.y += cp.vy;
        cp.vy += 0.35;
        cp.timer--;
        if (cp.timer <= 0) {
          coinParticles.splice(idx, 1);
        }
      });

      // 8. Camera X tracking
      cameraX = playerX - canvas.width / 2 + pWidth / 2;
      if (cameraX < 0) cameraX = 0;
      if (cameraX > levelWidth - canvas.width) cameraX = levelWidth - canvas.width;

      // 9. DRAW CANVAS GRAPHICS
      // Clear
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Sky gradient background
      ctx.fillStyle = "#a5d8ff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw Retro Hills in the distance
      ctx.fillStyle = "#8ce99a";
      ctx.beginPath();
      ctx.arc(200 - cameraX * 0.1, 280, 80, Math.PI, 0);
      ctx.arc(450 - cameraX * 0.1, 280, 100, Math.PI, 0);
      ctx.arc(800 - cameraX * 0.1, 280, 80, Math.PI, 0);
      ctx.arc(1200 - cameraX * 0.1, 280, 110, Math.PI, 0);
      ctx.arc(1600 - cameraX * 0.1, 280, 90, Math.PI, 0);
      ctx.arc(2000 - cameraX * 0.1, 280, 100, Math.PI, 0);
      ctx.arc(2450 - cameraX * 0.1, 280, 75, Math.PI, 0);
      ctx.fill();

      // Draw Clouds
      ctx.fillStyle = "#fff";
      const drawCloud = (cxCoord: number, cyCoord: number) => {
        ctx.beginPath();
        ctx.arc(cxCoord, cyCoord, 16, 0, Math.PI * 2);
        ctx.arc(cxCoord + 12, cyCoord - 6, 20, 0, Math.PI * 2);
        ctx.arc(cxCoord + 30, cyCoord, 16, 0, Math.PI * 2);
        ctx.fill();
      };
      drawCloud(100 - cameraX * 0.18, 60);
      drawCloud(450 - cameraX * 0.18, 80);
      drawCloud(800 - cameraX * 0.18, 50);
      drawCloud(1250 - cameraX * 0.18, 70);
      drawCloud(1700 - cameraX * 0.18, 60);
      drawCloud(2200 - cameraX * 0.18, 80);

      // Draw Blocks
      blocks.forEach(b => {
        if (b.x + b.width < cameraX || b.x > cameraX + canvas.width) return;

        if (b.type === "ground") {
          // Brown soil body
          ctx.fillStyle = "#c87d55";
          ctx.fillRect(b.x - cameraX, b.y, b.width, b.height);
          // Grass border top
          ctx.fillStyle = "#5c940c";
          ctx.fillRect(b.x - cameraX, b.y, b.width, 10);
          
          // Outline detail
          ctx.strokeStyle = "#121212";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(b.x - cameraX, b.y);
          ctx.lineTo(b.x - cameraX + b.width, b.y);
          ctx.stroke();
        } else if (b.type === "brick") {
          // Orange retro brick texture
          ctx.fillStyle = "#e8590c";
          ctx.fillRect(b.x - cameraX, b.y, b.width, b.height);
          ctx.strokeStyle = "#121212";
          ctx.lineWidth = 3;
          ctx.strokeRect(b.x - cameraX, b.y, b.width, b.height);

          // Brick lines details
          ctx.beginPath();
          ctx.moveTo(b.x - cameraX + 20, b.y); ctx.lineTo(b.x - cameraX + 20, b.y + 40);
          ctx.moveTo(b.x - cameraX, b.y + 20); ctx.lineTo(b.x - cameraX + 40, b.y + 20);
          ctx.stroke();
        } else if (b.type === "question") {
          // Question block orange/grey
          ctx.fillStyle = b.hit ? "#868e96" : "#ffd43b";
          ctx.fillRect(b.x - cameraX, b.y, b.width, b.height);
          ctx.strokeStyle = "#121212";
          ctx.lineWidth = 3;
          ctx.strokeRect(b.x - cameraX, b.y, b.width, b.height);

          if (!b.hit) {
            // Shiny white question mark
            ctx.fillStyle = "#fff";
            ctx.font = "800 1.6rem var(--font-ui)";
            ctx.textAlign = "center";
            ctx.fillText("?", b.x - cameraX + 20, b.y + 28);
          }
        } else if (b.type === "solid") {
          // Sturdy block texture
          ctx.fillStyle = "#adb5bd";
          ctx.fillRect(b.x - cameraX, b.y, b.width, b.height);
          ctx.strokeStyle = "#121212";
          ctx.lineWidth = 3;
          ctx.strokeRect(b.x - cameraX, b.y, b.width, b.height);
        } else if (b.type === "pipe") {
          // Green warp pipe
          ctx.fillStyle = "#37b24d";
          ctx.fillRect(b.x - cameraX, b.y, b.width, b.height);
          ctx.strokeStyle = "#121212";
          ctx.lineWidth = 3.5;
          ctx.strokeRect(b.x - cameraX, b.y, b.width, b.height);

          // Top pipe lip
          ctx.fillStyle = "#2b8a3e";
          ctx.fillRect(b.x - cameraX - 4, b.y, b.width + 8, 18);
          ctx.strokeRect(b.x - cameraX - 4, b.y, b.width + 8, 18);
        }
      });

      // Draw Flagpole structure
      ctx.fillStyle = "#ced4da";
      ctx.fillRect(flagPoleX - cameraX, 50, 8, 230);
      ctx.fillStyle = "#e8590c";
      ctx.fillRect(flagPoleX - cameraX - 16, 70, 32, 22);
      ctx.strokeStyle = "#121212";
      ctx.lineWidth = 3;
      ctx.strokeRect(flagPoleX - cameraX - 16, 70, 32, 22);

      // Draw Goal Castle
      ctx.fillStyle = "#868e96"; // Castle bricks
      ctx.fillRect(flagPoleX - cameraX + 80, 180, 120, 100);
      ctx.fillStyle = "#495057"; // Draw castle arches
      ctx.fillRect(flagPoleX - cameraX + 125, 230, 30, 50);
      ctx.strokeStyle = "#121212";
      ctx.lineWidth = 3.5;
      ctx.strokeRect(flagPoleX - cameraX + 80, 180, 120, 100);
      ctx.strokeRect(flagPoleX - cameraX + 125, 230, 30, 50);

      // Draw Dust particles
      dustParticles.forEach(dp => {
        ctx.fillStyle = `rgba(255,255,255,${dp.alpha})`;
        ctx.beginPath();
        ctx.arc(dp.x - cameraX, dp.y, 4, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw Brick Shards
      shards.forEach(s => {
        ctx.save();
        ctx.translate(s.x - cameraX + 8, s.y + 8);
        ctx.rotate(s.rotation);
        ctx.fillStyle = "#e8590c";
        ctx.fillRect(-8, -8, 16, 16);
        ctx.strokeStyle = "#121212";
        ctx.lineWidth = 2;
        ctx.strokeRect(-8, -8, 16, 16);
        ctx.restore();
      });

      // Draw Coins particle effects
      coinParticles.forEach(cp => {
        ctx.fillStyle = "#fcc419";
        ctx.beginPath();
        ctx.arc(cp.x - cameraX + 8, cp.y, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#121212";
        ctx.lineWidth = 2.5;
        ctx.stroke();
      });

      // Draw Mushroom Power-up
      if (mushroom.active) {
        ctx.fillStyle = "#ff8787"; // Red mushroom head
        ctx.fillRect(mushroom.x - cameraX, mushroom.y, 16, 10);
        ctx.fillStyle = "#f1f3f5"; // Mushroom base
        ctx.fillRect(mushroom.x - cameraX + 2, mushroom.y + 10, 12, 6);
        ctx.strokeStyle = "#121212";
        ctx.lineWidth = 2.5;
        ctx.strokeRect(mushroom.x - cameraX, mushroom.y, 16, 16);
      }

      // Draw Goombas
      goombas.forEach(g => {
        if (g.x + g.width < cameraX || g.x > cameraX + canvas.width) return;
        if (g.alive) {
          ctx.fillStyle = "#d9480f"; // Goomba brown body
          ctx.fillRect(g.x - cameraX, g.y, g.width, g.height);
          ctx.fillStyle = "#ffe8cc"; // Face/Eyes
          ctx.fillRect(g.x - cameraX + 4, g.y + 4, 4, 8);
          ctx.fillRect(g.x - cameraX + 16, g.y + 4, 4, 8);
          ctx.fillStyle = "#121212";
          ctx.fillRect(g.x - cameraX + 5, g.y + 6, 2, 4);
          ctx.fillRect(g.x - cameraX + 17, g.y + 6, 2, 4);
          
          ctx.strokeStyle = "#121212";
          ctx.lineWidth = 3;
          ctx.strokeRect(g.x - cameraX, g.y, g.width, g.height);
        } else if (g.squashTimer > 0) {
          ctx.fillStyle = "#d9480f"; // flat squashed Goomba
          ctx.fillRect(g.x - cameraX, g.y + 16, g.width, 8);
          ctx.strokeStyle = "#121212";
          ctx.lineWidth = 2.5;
          ctx.strokeRect(g.x - cameraX, g.y + 16, g.width, 8);
        }
      });

      // Base walk frames bouncing
      const isWalking = Math.abs(velocityX) > 0.2 && isGrounded;
      const walkOffset = isWalking ? Math.sin(walkFrame) * 3 : 0;

      // Draw Mario Player (invulnerability blink check)
      const shouldDrawMario = invulnerableTimer === 0 || Math.floor(invulnerableTimer / 4) % 2 === 0;
      if (shouldDrawMario) {
        ctx.save();
        ctx.translate(playerX - cameraX, playerY + walkOffset);

        // Cap and Shirt (Red)
        ctx.fillStyle = "#e03131";
        ctx.fillRect(0, 0, pWidth, isSuper ? 18 : 10);
        // Overalls (Blue)
        ctx.fillStyle = "#1971c2";
        ctx.fillRect(2, isSuper ? 18 : 10, pWidth - 4, isSuper ? 26 : 18);
        // Skin face
        ctx.fillStyle = "#ffe3e3";
        const fCol = facingRight ? 6 : 0;
        ctx.fillRect(fCol, isSuper ? 6 : 3, pWidth - 6, isSuper ? 10 : 6);

        // Outline drawing
        ctx.strokeStyle = "#121212";
        ctx.lineWidth = 3;
        ctx.strokeRect(0, 0, pWidth, pHeight);
        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(update);
    };

    if (gameState === "playing") {
      animationFrameId = requestAnimationFrame(update);
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
  }, [gameState, isPaused, isSuper]);

  const startGame = () => {
    localStorage.setItem("arcade_has_played", "true");
    setScore(0);
    setCoins(0);
    setIsSuper(false);
    setIsPaused(false);
    isPausedRef.current = false;
    setGameState("playing");
  };

  // Virtual buttons triggers
  const triggerMove = (code: string, pressed: boolean) => {
    keysPressed.current[code] = pressed;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Header Controls */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button onClick={onBack} className="neo-btn secondary" style={{ padding: "0.5rem 1rem" }}>
          <ArrowLeft size={18} /> BACK
        </button>
        <h2 className="game-title-text mobile-hide" style={{ fontSize: "1rem" }}>SUPER MARIO REMASTERED</h2>
        
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
        
        {/* Play Space Arena */}
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
            {/* Header info HUD in playing */}
            {gameState === "playing" && (
              <div style={{ position: "absolute", top: 12, left: 12, display: "flex", gap: "1.2rem", fontWeight: "900", color: "#121212", fontSize: "0.95rem", pointerEvents: "none" }}>
                <div>SCORE: {score}</div>
                <div>🪙 x{coins}</div>
                {isSuper && <div style={{ color: "#e03131", display: "flex", alignItems: "center", gap: "0.2rem" }}><Zap size={14} fill="#e03131"/> SUPER</div>}
              </div>
            )}

            <canvas
              ref={canvasRef}
              width={600}
              height={320}
              style={{ width: "100%", height: "auto", display: "block", background: "#a5d8ff", outline: "none" }}
            />

            {/* Menu Intro screen */}
            {gameState === "idle" && (
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", backgroundColor: "rgba(165, 216, 255, 0.95)", gap: "1.2rem" }}>
                <div style={{ fontFamily: "var(--font-game)", fontSize: "1.6rem", fontWeight: "900", color: "#b23b00", textShadow: "2px 2px 0px #fff", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <Star fill="#ffd43b" color="#121212" size={28}/> MARIO REMASTERED
                </div>
                <p style={{ fontWeight: "700", fontSize: "0.88rem", color: "#121212", textAlign: "center", padding: "0 1.5rem" }}>
                  Walk with Arrow Keys / A & D. Jump with Space / W.<br/>
                  Get Mushrooms to grow into Super Mario and smash bricks!
                </p>
                <button onClick={startGame} className="neo-btn accent">START ADVENTURE</button>
              </div>
            )}

            {/* Game Over screen */}
            {gameState === "gameover" && (
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", backgroundColor: "rgba(18,18,18,0.88)", gap: "1.2rem" }}>
                <div style={{ fontFamily: "var(--font-game)", fontSize: "1.5rem", color: "red" }}>GAME OVER</div>
                <div style={{ fontSize: "1.6rem", fontWeight: "900", color: "#fff" }}>SCORE: {score}</div>
                <button onClick={startGame} className="neo-btn accent"><RefreshCw size={16} /> REPLAY</button>
              </div>
            )}

            {/* Victory Fanfare screen */}
            {gameState === "victory" && (
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", backgroundColor: "rgba(55,178,77,0.92)", gap: "1.2rem" }}>
                <div style={{ fontFamily: "var(--font-game)", fontSize: "1.6rem", color: "#fff", fontWeight: "900" }}>WORLD CLEARED! 🚩</div>
                <div style={{ fontSize: "2rem", fontWeight: "900", color: "#fcc419" }}>SCORE: {score}</div>
                <div style={{ fontSize: "1.1rem", fontWeight: "800", color: "#fff" }}>COINS COLLECTED: {coins}</div>
                <button onClick={startGame} className="neo-btn accent" style={{ backgroundColor: "#fff", color: "#121212" }}><RefreshCw size={16} /> REPLAY</button>
              </div>
            )}
          </div>

          {/* Virtual Controllers Panel */}
          {gameState === "playing" && !isPaused && (
            <div style={{ display: "flex", width: "100%", maxWidth: "420px", justifyContent: "space-between", padding: "0 1rem", boxSizing: "border-box", userSelect: "none" }}>
              {/* D-Pad walk */}
              <div style={{ display: "flex", gap: "0.6rem" }}>
                <button
                  onTouchStart={() => triggerMove("KeyA", true)}
                  onTouchEnd={() => triggerMove("KeyA", false)}
                  onMouseDown={() => triggerMove("KeyA", true)}
                  onMouseUp={() => triggerMove("KeyA", false)}
                  className="neo-btn secondary"
                  style={{ width: "60px", height: "55px", justifyContent: "center", fontSize: "1.2rem", fontWeight: "900", touchAction: "manipulation" }}
                >
                  ◀
                </button>
                <button
                  onTouchStart={() => triggerMove("KeyD", true)}
                  onTouchEnd={() => triggerMove("KeyD", false)}
                  onMouseDown={() => triggerMove("KeyD", true)}
                  onMouseUp={() => triggerMove("KeyD", false)}
                  className="neo-btn secondary"
                  style={{ width: "60px", height: "55px", justifyContent: "center", fontSize: "1.2rem", fontWeight: "900", touchAction: "manipulation" }}
                >
                  ▶
                </button>
              </div>

              {/* Jump button */}
              <button
                onTouchStart={() => triggerMove("Space", true)}
                onTouchEnd={() => triggerMove("Space", false)}
                onMouseDown={() => triggerMove("Space", true)}
                onMouseUp={() => triggerMove("Space", false)}
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
