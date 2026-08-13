import React from "react";
import { Smartphone, Monitor, ChevronRight, Play } from "lucide-react";

interface GameCardProps {
  game: {
    id: string;
    name: string;
    is_active: number;
    is_mobile_friendly: number;
  };
  topScore?: number;
  onPlay: (gameId: string) => void;
}

export default function GameCard({ game, topScore, onPlay }: GameCardProps) {
  const isMobileFriendly = !!game.is_mobile_friendly;
  const isActive = !!game.is_active;

  return (
    <div
      className="neo-card"
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        gap: "1rem",
        backgroundColor: isActive ? "#fff" : "#f1ede6",
        opacity: isActive ? 1 : 0.7,
        borderWidth: "3px"
      }}
    >
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
          {isMobileFriendly ? (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.25rem",
                background: "var(--secondary-color)",
                color: "#121212",
                fontSize: "0.75rem",
                fontWeight: "800",
                padding: "0.2rem 0.5rem",
                border: "2px solid #121212",
                borderRadius: "4px"
              }}
            >
              <Smartphone size={12} /> MOBILE FRIENDLY
            </span>
          ) : (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.25rem",
                background: "var(--accent-color)",
                color: "#fff",
                fontSize: "0.75rem",
                fontWeight: "800",
                padding: "0.2rem 0.5rem",
                border: "2px solid #121212",
                borderRadius: "4px"
              }}
            >
              <Monitor size={12} /> DESKTOP PREFERRED
            </span>
          )}

          {!isActive && (
            <span
              style={{
                background: "#ccc",
                fontSize: "0.75rem",
                fontWeight: "800",
                padding: "0.2rem 0.5rem",
                border: "2px solid #121212",
                borderRadius: "4px"
              }}
            >
              MAINTENANCE
            </span>
          )}
        </div>

        <h3
          className="game-title-text"
          style={{ fontSize: "0.95rem", lineHeight: "1.3", margin: "0.5rem 0", color: "var(--border-color)" }}
        >
          {game.name}
        </h3>

        {topScore !== undefined && topScore > 0 && (
          <p style={{ fontSize: "0.85rem", fontWeight: "700", color: "#666" }}>
            🏆 HIGH SCORE: <span style={{ color: "var(--border-color)", fontWeight: "800" }}>{topScore}</span>
          </p>
        )}
      </div>

      <button
        onClick={() => onPlay(game.id)}
        disabled={!isActive}
        className="neo-btn"
        style={{
          width: "100%",
          justifyContent: "center",
          backgroundColor: isActive ? "var(--primary-color)" : "#e0e0e0"
        }}
      >
        <Play size={16} fill="currentColor" /> PLAY NOW
      </button>
    </div>
  );
}
