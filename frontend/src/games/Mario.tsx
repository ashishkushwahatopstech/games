import React, { useRef, useState, useEffect } from "react";
import { ArrowLeft, Trophy } from "lucide-react";
import GameHUDControls from "../components/GameHUDControls";

interface MarioProps {
  onBack: () => void;
  user: any;
  submitScore: (score: number) => Promise<void>;
  leaderboard: any[];
  refreshLeaderboard: () => void;
}

// NES button constant mappings matching JSNES values
const NES_BUTTON_A = 0;
const NES_BUTTON_B = 1;
const NES_BUTTON_SELECT = 2;
const NES_BUTTON_START = 3;
const NES_BUTTON_UP = 4;
const NES_BUTTON_DOWN = 5;
const NES_BUTTON_LEFT = 6;
const NES_BUTTON_RIGHT = 7;

export default function Mario({
  onBack,
  user,
  submitScore,
  leaderboard,
  refreshLeaderboard
}: MarioProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [muted, setMuted] = useState(false);

  // Live game stats extracted from the NES emulator memory
  const [score, setScore] = useState(0);
  const [coins, setCoins] = useState(0);
  const [world, setWorld] = useState(1);
  const [level, setLevel] = useState(1);
  const [lives, setLives] = useState(3);

  // Send virtual controller event messages to JSNES iframe
  const triggerMove = (buttonCode: number, pressed: boolean) => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage({
        action: pressed ? "buttonDown" : "buttonUp",
        button: buttonCode
      }, "*");
    }
  };

  // Listen to postMessages from JSNES emulator containing live game stats
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      const data = e.data;
      if (data && data.action === "stats") {
        setScore(data.score);
        setCoins(data.coins);
        setWorld(data.world);
        setLevel(data.level);
        setLives(data.lives);

        // Submit highscore updates to the backend leaderboard dynamically
        if (data.score > 0) {
          submitScore(data.score).then(() => {
            refreshLeaderboard();
          });
        }
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [submitScore, refreshLeaderboard]);

  return (
    <div ref={containerRef} style={{ display: "flex", flexDirection: "column", gap: "1rem" }} className="fullscreen-compat">
      {/* Header Panel - Centered to game width to prevent options from getting cut off */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", maxWidth: "640px", margin: "0 auto", boxSizing: "border-box", padding: "0 0.5rem" }}>
        <button onClick={onBack} className="neo-btn secondary" style={{ padding: "0.5rem 1rem" }}>
          <ArrowLeft size={18} /> BACK
        </button>
        <h2 className="game-title-text mobile-hide" style={{ fontSize: "1rem", margin: 0 }}>SUPER MARIO BROS</h2>
        
        <GameHUDControls 
          isPaused={false}
          onTogglePause={undefined}
          onRestart={undefined}
          muted={muted}
          onToggleMute={() => setMuted(!muted)}
          containerRef={containerRef}
        />
      </div>

      {/* Live NES status HUD */}
      <div 
        style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center", 
          width: "100%", 
          maxWidth: "640px", 
          margin: "0 auto",
          backgroundColor: "#121212", 
          color: "#fff", 
          padding: "0.5rem 1rem", 
          border: "4px solid #121212",
          boxShadow: "4px 4px 0px 0px #121212",
          boxSizing: "border-box",
          fontFamily: "var(--font-game)",
          fontSize: "0.75rem",
          fontWeight: "bold",
          gap: "0.5rem",
          borderRadius: "4px"
        }}
      >
        <div>MARIO {score.toString().padStart(6, '0')}</div>
        <div>🪙 x{coins.toString().padStart(2, '0')}</div>
        <div>WORLD {world}-{level}</div>
        <div>LIVES x{lives}</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: "1.5rem", width: "100%" }} className="game-layout-container">
        
        {/* Play Space Arena (Embed NES Emulator hosted on our server) */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem", width: "100%" }}>
          <div 
            className="neo-card game-view-box" 
            style={{ 
              padding: "0", 
              overflow: "hidden", 
              position: "relative", 
              backgroundColor: "#000", 
              display: "flex", 
              flexDirection: "column", 
              alignItems: "center",
              width: "100%",
              maxWidth: "640px",
              aspectRatio: "4 / 3",
              boxSizing: "border-box",
              border: "4px solid #121212",
              boxShadow: "6px 6px 0px 0px #121212"
            }}
          >
            <iframe
              ref={iframeRef}
              src="/mario-emu.html"
              width="100%"
              height="100%"
              frameBorder="0"
              allowFullScreen={true}
              allow="autoplay; fullscreen; gamepad"
              style={{
                display: "block",
                width: "100%",
                height: "100%",
                backgroundColor: "#000",
                border: "none",
              }}
            />
          </div>

          {/* Controls description */}
          <div style={{ textAlign: "center", fontSize: "0.82rem", fontWeight: "700", color: "#666", padding: "0 1rem" }}>
            🎮 <strong>Keyboard:</strong> Use <strong>Arrow Keys / WASD</strong> for D-Pad, <strong>Space / Z</strong> to Jump, <strong>X</strong> to Run, <strong>Enter / Shift</strong> for Start / Select.
          </div>

          {/* Virtual Mobile Controllers Panel */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", width: "100%", maxWidth: "420px", marginTop: "0.5rem", userSelect: "none", WebkitUserSelect: "none" }}>
            
            {/* Action controls (D-Pad Left/Right and Jump/Run buttons) */}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "0 1rem", boxSizing: "border-box" }}>
              {/* D-Pad */}
              <div style={{ display: "flex", gap: "0.6rem" }}>
                <button
                  onTouchStart={() => triggerMove(NES_BUTTON_LEFT, true)}
                  onTouchEnd={() => triggerMove(NES_BUTTON_LEFT, false)}
                  onMouseDown={() => triggerMove(NES_BUTTON_LEFT, true)}
                  onMouseUp={() => triggerMove(NES_BUTTON_LEFT, false)}
                  className="neo-btn secondary"
                  style={{ width: "60px", height: "55px", justifyContent: "center", fontSize: "1.2rem", fontWeight: "900", touchAction: "manipulation" }}
                >
                  ◀
                </button>
                <button
                  onTouchStart={() => triggerMove(NES_BUTTON_RIGHT, true)}
                  onTouchEnd={() => triggerMove(NES_BUTTON_RIGHT, false)}
                  onMouseDown={() => triggerMove(NES_BUTTON_RIGHT, true)}
                  onMouseUp={() => triggerMove(NES_BUTTON_RIGHT, false)}
                  className="neo-btn secondary"
                  style={{ width: "60px", height: "55px", justifyContent: "center", fontSize: "1.2rem", fontWeight: "900", touchAction: "manipulation" }}
                >
                  ▶
                </button>
              </div>

              {/* Action Buttons (A/Jump, B/Run) */}
              <div style={{ display: "flex", gap: "0.6rem" }}>
                <button
                  onTouchStart={() => triggerMove(NES_BUTTON_B, true)}
                  onTouchEnd={() => triggerMove(NES_BUTTON_B, false)}
                  onMouseDown={() => triggerMove(NES_BUTTON_B, true)}
                  onMouseUp={() => triggerMove(NES_BUTTON_B, false)}
                  className="neo-btn secondary"
                  style={{ width: "55px", height: "55px", borderRadius: "50%", justifyContent: "center", fontSize: "1rem", fontWeight: "900", backgroundColor: "#ffd166", touchAction: "manipulation" }}
                >
                  B
                </button>
                <button
                  onTouchStart={() => triggerMove(NES_BUTTON_A, true)}
                  onTouchEnd={() => triggerMove(NES_BUTTON_A, false)}
                  onMouseDown={() => triggerMove(NES_BUTTON_A, true)}
                  onMouseUp={() => triggerMove(NES_BUTTON_A, false)}
                  className="neo-btn accent"
                  style={{ width: "55px", height: "55px", borderRadius: "50%", justifyContent: "center", fontSize: "1rem", fontWeight: "900", touchAction: "manipulation" }}
                >
                  A
                </button>
              </div>
            </div>

            {/* Menu controls (Select, Start) */}
            <div style={{ display: "flex", justifyContent: "center", gap: "1rem", width: "100%", marginTop: "0.4rem" }}>
              <button
                onTouchStart={() => triggerMove(NES_BUTTON_SELECT, true)}
                onTouchEnd={() => triggerMove(NES_BUTTON_SELECT, false)}
                onMouseDown={() => triggerMove(NES_BUTTON_SELECT, true)}
                onMouseUp={() => triggerMove(NES_BUTTON_SELECT, false)}
                className="neo-btn secondary"
                style={{ padding: "0.4rem 1rem", fontSize: "0.8rem", fontWeight: "800", height: "35px" }}
              >
                SELECT
              </button>
              <button
                onTouchStart={() => triggerMove(NES_BUTTON_START, true)}
                onTouchEnd={() => triggerMove(NES_BUTTON_START, false)}
                onMouseDown={() => triggerMove(NES_BUTTON_START, true)}
                onMouseUp={() => triggerMove(NES_BUTTON_START, false)}
                className="neo-btn secondary"
                style={{ padding: "0.4rem 1rem", fontSize: "0.8rem", fontWeight: "800", height: "35px" }}
              >
                START
              </button>
            </div>

          </div>

        </div>

        {/* Highscores Board */}
        <div className="neo-card" style={{ display: "flex", flexDirection: "column", gap: "1rem", height: "fit-content" }}>
          <h3 style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "1.2rem" }}>
            <Trophy size={20} color="var(--primary-color)" /> LEADERBOARD
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {leaderboard.length === 0 ? (
              <p style={{ color: "#666", fontSize: "0.9rem" }}>No scores recorded yet.</p>
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
