import React, { useState, useEffect } from "react";
import { Trophy, RefreshCw, ArrowLeft } from "lucide-react";

interface HexMergeProps {
  onBack: () => void;
  user: any;
  submitScore: (score: number) => Promise<void>;
  leaderboard: any[];
  refreshLeaderboard: () => void;
}

interface Tile {
  id: number;
  value: number;
  row: number;
  col: number;
  merged?: boolean;
}

export default function HexMerge({ onBack, user, submitScore, leaderboard, refreshLeaderboard }: HexMergeProps) {
  // A beautiful hexagonal grid layout 2048 variant
  // Grid size: a hexagon has rings. A grid with radius 2 has 19 hexes total.
  // Hex coordinates can be (q, r, s) where q + r + s = 0.
  // Row/Col representation for a hex grid is easiest to render:
  // Center is (0,0). Neighbors are at: (1, 0), (-1, 0), (0, 1), (0, -1), (1, -1), (-1, 1).
  const [board, setBoard] = useState<{ [key: string]: number }>({});
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // List of active hex positions (radius 2 hexagon)
  // Coordinates (q, r):
  //       (0,-2)  (1,-2)  (2,-2)
  //    (-1,-1) (0,-1)  (1,-1)  (2,-1)
  // (-2,0)  (-1,0)  (0,0)   (1,0)   (2,0)
  //    (-2,1)  (-1,1)  (0,1)   (1,1)
  //       (-2,2)  (-1,2)  (0,2)
  const hexCoordinates = [
    { q: 0, r: -2 }, { q: 1, r: -2 }, { q: 2, r: -2 },
    { q: -1, r: -1 }, { q: 0, r: -1 }, { q: 1, r: -1 }, { q: 2, r: -1 },
    { q: -2, r: 0 }, { q: -1, r: 0 }, { q: 0, r: 0 }, { q: 1, r: 0 }, { q: 2, r: 0 },
    { q: -2, r: 1 }, { q: -1, r: 1 }, { q: 0, r: 1 }, { q: 1, r: 1 },
    { q: -2, r: 2 }, { q: -1, r: 2 }, { q: 0, r: 2 }
  ];

  const initializeGame = () => {
    const newBoard: { [key: string]: number } = {};
    hexCoordinates.forEach(coord => {
      newBoard[`${coord.q},${coord.r}`] = 0;
    });
    setBoard(newBoard);
    setScore(0);
    setGameOver(false);
    // Add two random tiles
    addRandomTile(newBoard);
    addRandomTile(newBoard);
  };

  useEffect(() => {
    initializeGame();
  }, []);

  const addRandomTile = (currentBoard: { [key: string]: number }) => {
    const emptyCoords = hexCoordinates.filter(coord => {
      const key = `${coord.q},${coord.r}`;
      return currentBoard[key] === 0;
    });

    if (emptyCoords.length > 0) {
      const randomCoord = emptyCoords[Math.floor(Math.random() * emptyCoords.length)];
      const key = `${randomCoord.q},${randomCoord.r}`;
      currentBoard[key] = Math.random() < 0.9 ? 2 : 4;
      setBoard({ ...currentBoard });
    }
  };

  // Get tiles aligned in a specific direction
  // We support 6 directions of shift:
  // W: Up-Left, E: Up-Right, A: Left, D: Right, Z: Down-Left, X: Down-Right
  // In axial coordinates (q, r):
  // Left: q-1, r (dir: -1, 0)
  // Right: q+1, r (dir: 1, 0)
  // Up-Left: q, r-1 (dir: 0, -1)
  // Up-Right: q+1, r-1 (dir: 1, -1)
  // Down-Left: q-1, r+1 (dir: -1, 1)
  // Down-Right: q, r+1 (dir: 0, 1)
  const shift = (dq: number, dr: number) => {
    if (gameOver) return;

    let hasChanged = false;
    const newBoard = { ...board };
    let newScore = score;

    // Sorting order is important!
    // We sort coordinates based on direction to process tiles from the edge inwards
    const sortedCoords = [...hexCoordinates].sort((a, b) => {
      // Project coordinate onto direction vector
      const projA = a.q * dq + a.r * dr;
      const projB = b.q * dq + b.r * dr;
      return projB - projA; // descending order
    });

    const mergedKeys = new Set<string>();

    sortedCoords.forEach(coord => {
      const key = `${coord.q},${coord.r}`;
      const val = newBoard[key];
      if (val === 0) return;

      let currentQ = coord.q;
      let currentR = coord.r;

      while (true) {
        const nextQ = currentQ + dq;
        const nextR = currentR + dr;
        const nextKey = `${nextQ},${nextR}`;

        // Out of bounds check
        if (!(nextKey in newBoard)) break;

        const nextVal = newBoard[nextKey];

        if (nextVal === 0) {
          // Slide into empty cell
          newBoard[nextKey] = val;
          newBoard[`${currentQ},${currentR}`] = 0;
          currentQ = nextQ;
          currentR = nextR;
          hasChanged = true;
        } else if (nextVal === val && !mergedKeys.has(nextKey)) {
          // Merge identical values
          const mergedVal = val * 2;
          newBoard[nextKey] = mergedVal;
          newBoard[`${currentQ},${currentR}`] = 0;
          mergedKeys.add(nextKey);
          newScore += mergedVal;
          hasChanged = true;
          break;
        } else {
          // Blocked by another block
          break;
        }
      }
    });

    if (hasChanged) {
      setScore(newScore);
      addRandomTile(newBoard);
      checkGameOver(newBoard);
    }
  };

  const checkGameOver = (currentBoard: { [key: string]: number }) => {
    // Game is over if no cell is 0 and no adjacent cells can merge
    const directions = [
      { q: -1, r: 0 }, { q: 1, r: 0 },
      { q: 0, r: -1 }, { q: 1, r: -1 },
      { q: -1, r: 1 }, { q: 0, r: 1 }
    ];

    const hasEmpty = hexCoordinates.some(c => currentBoard[`${c.q},${c.r}`] === 0);
    if (hasEmpty) return;

    const canMerge = hexCoordinates.some(c => {
      const val = currentBoard[`${c.q},${c.r}`];
      return directions.some(d => {
        const adjacentVal = currentBoard[`${c.q + d.q},${c.r + d.r}`];
        return adjacentVal === val;
      });
    });

    if (!canMerge) {
      setGameOver(true);
    }
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

  const getTileColor = (val: number) => {
    switch (val) {
      case 2: return "#eee4da";
      case 4: return "#ede0c8";
      case 8: return "#f2b179";
      case 16: return "#f59563";
      case 32: return "#f67c5f";
      case 64: return "#f65e3b";
      case 128: return "#edcf72";
      case 256: return "#edcc61";
      case 512: return "#edc850";
      case 1024: return "#edc53f";
      case 2048: return "#edc22e";
      default: return "#3c3a32";
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button onClick={onBack} className="neo-btn secondary" style={{ padding: "0.5rem 1rem" }}>
          <ArrowLeft size={18} /> BACK
        </button>
        <h2 className="game-title-text" style={{ fontSize: "1rem" }}>HEX MERGE</h2>
        <div style={{ fontSize: "1.1rem", fontWeight: "800" }}>SCORE: {score}</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: "1.5rem", width: "100%" }} className="game-layout-container">
        {/* Hex Play Board */}
        <div className="neo-card" style={{ display: "flex", flexDirection: "column", alignItems: "center", position: "relative", backgroundColor: "#faf6f0", minHeight: "420px", justifyContent: "center" }}>
          
          {/* Controls helper */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1rem", justifyContent: "center" }}>
            <button onClick={() => shift(0, -1)} className="neo-btn" style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem" }}>↖️ UL</button>
            <button onClick={() => shift(1, -1)} className="neo-btn" style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem" }}>↗️ UR</button>
            <button onClick={() => shift(-1, 0)} className="neo-btn" style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem" }}>⬅️ L</button>
            <button onClick={() => shift(1, 0)} className="neo-btn" style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem" }}>➡️ R</button>
            <button onClick={() => shift(-1, 1)} className="neo-btn" style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem" }}>↙️ DL</button>
            <button onClick={() => shift(0, 1)} className="neo-btn" style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem" }}>↘️ DR</button>
          </div>

          {/* Hex layout */}
          <div style={{ position: "relative", width: "320px", height: "300px", marginTop: "10px" }}>
            {hexCoordinates.map(coord => {
              const key = `${coord.q},${coord.r}`;
              const val = board[key] || 0;
              
              // Calculate Hex positions on canvas:
              // q points along X, r points along Y with a diagonal offset
              const size = 30; // Radius of hex
              const xOffset = 160 + coord.q * size * 1.732 + (coord.r * size * 1.732) / 2;
              const yOffset = 150 + coord.r * size * 1.5;

              return (
                <div
                  key={key}
                  style={{
                    position: "absolute",
                    left: `${xOffset - size}px`,
                    top: `${yOffset - size}px`,
                    width: `${size * 2}px`,
                    height: `${size * 2}px`,
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    backgroundColor: val > 0 ? getTileColor(val) : "#e0dcd3",
                    border: "2px solid #121212",
                    clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
                    fontWeight: "bold",
                    fontSize: val > 100 ? "0.85rem" : "1.1rem",
                    color: val > 4 ? "#fff" : "#121212",
                    boxShadow: "inset 0 0 5px rgba(0,0,0,0.15)",
                    transition: "all 0.15s ease-in-out",
                    zIndex: val > 0 ? 10 : 1
                  }}
                >
                  {val > 0 ? val : ""}
                </div>
              );
            })}
          </div>

          {gameOver && (
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", backgroundColor: "rgba(250, 246, 240, 0.9)", gap: "1rem" }}>
              <div style={{ fontFamily: "var(--font-game)", fontSize: "1.2rem", color: "var(--accent-color)" }}>GAME OVER</div>
              <div style={{ fontSize: "1.5rem", fontWeight: "800" }}>SCORE: {score}</div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button onClick={initializeGame} className="neo-btn accent"><RefreshCw size={16} /> RESTART</button>
                {user && score > 0 && (
                  <button onClick={handleScoreSubmit} disabled={submitting} className="neo-btn secondary">
                    {submitting ? "SUBMITTING..." : "SUBMIT SCORE"}
                  </button>
                )}
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
              <p style={{ color: "#666", fontSize: "0.9rem" }}>No highscores yet. Start sliding!</p>
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
