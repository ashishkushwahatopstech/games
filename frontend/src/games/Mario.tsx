import React, { useRef, useState } from "react";
import { ArrowLeft, Trophy } from "lucide-react";
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
  leaderboard,
  refreshLeaderboard
}: MarioProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [muted, setMuted] = useState(false);

  return (
    <div ref={containerRef} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }} className="fullscreen-compat">
      {/* Header Panel */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button onClick={onBack} className="neo-btn secondary" style={{ padding: "0.5rem 1rem" }}>
          <ArrowLeft size={18} /> BACK
        </button>
        <h2 className="game-title-text mobile-hide" style={{ fontSize: "1rem" }}>SUPER MARIO BROS</h2>
        
        <GameHUDControls 
          isPaused={false}
          onTogglePause={undefined}
          onRestart={undefined}
          muted={muted}
          onToggleMute={() => setMuted(!muted)}
          containerRef={containerRef}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: "1.5rem", width: "100%" }} className="game-layout-container">
        
        {/* Play Space Arena (Embed NES Emulator) */}
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
              src="https://archive.org/embed/smb_nes_4"
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
          <div style={{ textAlign: "center", fontSize: "0.85rem", fontWeight: "700", color: "#666", padding: "0 1rem" }}>
            🎮 <strong>Keyboard Controls:</strong> Use <strong>Arrow Keys</strong> for D-Pad, <strong>Z / X</strong> for A / B actions, and <strong>Enter / Shift</strong> for Start / Select. Supports gamepads!
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
