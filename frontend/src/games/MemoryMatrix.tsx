import React, { useEffect, useState } from "react";
import { Trophy, RefreshCw, ArrowLeft } from "lucide-react";

interface MemoryMatrixProps {
  onBack: () => void;
  user: any;
  submitScore: (score: number) => Promise<void>;
  leaderboard: any[];
  refreshLeaderboard: () => void;
}

export default function MemoryMatrix({ onBack, user, submitScore, leaderboard, refreshLeaderboard }: MemoryMatrixProps) {
  const [gameState, setGameState] = useState<"idle" | "memorize" | "player" | "gameover">("idle");
  const [score, setScore] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const [gridSize, setGridSize] = useState(3); // start with 3x3
  const [activeTiles, setActiveTiles] = useState<number[]>([]);
  const [selectedTiles, setSelectedTiles] = useState<number[]>([]);
  const [strikes, setStrikes] = useState(0);
  const maxStrikes = 3;

  const startLevel = (nextScore: number) => {
    // Determine grid size based on score
    // 0-3: 3x3 grid, 3 tiles
    // 4-8: 4x4 grid, 4-5 tiles
    // 9+: 5x5 grid, 6-7 tiles
    let size = 3;
    let tileCount = 3;

    if (nextScore > 8) {
      size = 5;
      tileCount = 6 + Math.floor((nextScore - 9) / 4);
    } else if (nextScore > 3) {
      size = 4;
      tileCount = 4 + Math.floor((nextScore - 4) / 3);
    }

    setGridSize(size);
    setSelectedTiles([]);
    setGameState("memorize");

    // Generate random distinct tiles
    const totalCells = size * size;
    const tiles: number[] = [];
    while (tiles.length < tileCount) {
      const idx = Math.floor(Math.random() * totalCells);
      if (!tiles.includes(idx)) {
        tiles.push(idx);
      }
    }
    setActiveTiles(tiles);

    // After 1.5 seconds, hide pattern and let player guess
    setTimeout(() => {
      setGameState("player");
    }, 1500);
  };

  const handleTileClick = (idx: number) => {
    if (gameState !== "player") return;

    // Already selected
    if (selectedTiles.includes(idx)) return;

    if (activeTiles.includes(idx)) {
      // Correct tile!
      const newSelected = [...selectedTiles, idx];
      setSelectedTiles(newSelected);

      // Check if level completed
      if (newSelected.length === activeTiles.length) {
        setScore(s => {
          const nextScore = s + 1;
          // Go to next level
          setTimeout(() => startLevel(nextScore), 800);
          return nextScore;
        });
      }
    } else {
      // Wrong tile! Strike
      setStrikes(s => {
        const nextStrikes = s + 1;
        if (nextStrikes >= maxStrikes) {
          setGameState("gameover");
        }
        return nextStrikes;
      });
      // Flash the wrong tile or show user they made a mistake
      setSelectedTiles([...selectedTiles, idx]);
    }
  };

  const startGame = () => {
    setScore(0);
    setStrikes(0);
    startLevel(0);
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
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button onClick={onBack} className="neo-btn secondary" style={{ padding: "0.5rem 1rem" }}>
          <ArrowLeft size={18} /> BACK
        </button>
        <h2 className="game-title-text" style={{ fontSize: "1rem" }}>MEMORY MATRIX</h2>
        <div style={{ display: "flex", gap: "1rem", fontWeight: "800" }}>
          <div>STRIKES: {strikes}/{maxStrikes}</div>
          <div>LEVEL: {score}</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: "1.5rem", width: "100%" }} className="game-layout-container">
        {/* Play Area */}
        <div className="neo-card" style={{ display: "flex", flexDirection: "column", alignItems: "center", position: "relative", backgroundColor: "#faf6f0", minHeight: "340px", justifyContent: "center" }}>
          
          {gameState === "idle" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", alignItems: "center" }}>
              <div style={{ fontFamily: "var(--font-game)", fontSize: "1.2rem", fontWeight: "bold" }}>MEMORY MATRIX</div>
              <p style={{ fontWeight: "600", textAlign: "center", maxWidth: "250px", fontSize: "0.85rem" }}>
                Memorize the active tiles and click them when the grid hides them!
              </p>
              <button onClick={startGame} className="neo-btn accent">START CHALLENGE</button>
            </div>
          )}

          {gameState === "gameover" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", alignItems: "center" }}>
              <div style={{ fontFamily: "var(--font-game)", fontSize: "1.2rem", color: "var(--accent-color)" }}>OUT OF TRIES!</div>
              <div style={{ fontSize: "1.5rem", fontWeight: "800" }}>LEVEL REACHED: {score}</div>
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

          {(gameState === "memorize" || gameState === "player") && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
              <div style={{ fontSize: "1rem", fontWeight: "800" }}>
                {gameState === "memorize" ? "👀 MEMORIZE THE BLUE CELLS..." : "👉 CLICK THE TILES!"}
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
                  gridTemplateRows: `repeat(${gridSize}, 1fr)`,
                  gap: "6px",
                  width: "280px",
                  height: "280px",
                  border: "4px solid var(--border-color)",
                  padding: "6px",
                  backgroundColor: "var(--border-color)",
                  borderRadius: "8px"
                }}
              >
                {Array.from({ length: gridSize * gridSize }).map((_, idx) => {
                  const isActive = activeTiles.includes(idx);
                  const isSelected = selectedTiles.includes(idx);
                  
                  let cellBg = "#fff";
                  if (gameState === "memorize" && isActive) {
                    cellBg = "var(--blue-accent)";
                  } else if (gameState === "player" && isSelected) {
                    cellBg = isActive ? "var(--secondary-color)" : "var(--accent-color)";
                  }

                  return (
                    <div
                      key={idx}
                      onClick={() => handleTileClick(idx)}
                      style={{
                        backgroundColor: cellBg,
                        borderRadius: "4px",
                        cursor: gameState === "player" ? "pointer" : "default",
                        transition: "background-color 0.15s ease",
                        border: isSelected && !isActive ? "3px solid #121212" : "none"
                      }}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Highscores */}
        <div className="neo-card" style={{ display: "flex", flexDirection: "column", gap: "1rem", height: "fit-content" }}>
          <h3 style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "1.2rem" }}>
            <Trophy size={20} color="var(--primary-color)" /> LEADERBOARD
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {leaderboard.length === 0 ? (
              <p style={{ color: "#666", fontSize: "0.9rem" }}>No highscores yet. Play to set one!</p>
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
