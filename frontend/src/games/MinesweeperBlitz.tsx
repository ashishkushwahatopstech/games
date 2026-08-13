import React, { useState, useEffect } from "react";
import { Trophy, RefreshCw, Flag, ArrowLeft } from "lucide-react";

interface MinesweeperProps {
  onBack: () => void;
  user: any;
  submitScore: (score: number) => Promise<void>;
  leaderboard: any[];
  refreshLeaderboard: () => void;
}

interface Cell {
  x: number;
  y: number;
  isMine: boolean;
  isRevealed: boolean;
  isFlagged: boolean;
  neighborMines: number;
}

export default function MinesweeperBlitz({ onBack, user, submitScore, leaderboard, refreshLeaderboard }: MinesweeperProps) {
  const [board, setBoard] = useState<Cell[][]>([]);
  const [gameState, setGameState] = useState<"playing" | "won" | "lost">("playing");
  const [score, setScore] = useState(0);
  const [time, setTime] = useState(0);
  const [flagMode, setFlagMode] = useState(false); // Mobile flag toggling helper
  const [submitting, setSubmitting] = useState(false);

  const size = 9;
  const mineCount = 10;

  const initBoard = () => {
    // 1. Create grid of empty cells
    let newBoard: Cell[][] = Array.from({ length: size }, (_, y) =>
      Array.from({ length: size }, (_, x) => ({
        x,
        y,
        isMine: false,
        isRevealed: false,
        isFlagged: false,
        neighborMines: 0
      }))
    );

    // 2. Distribute mines randomly
    let placedMines = 0;
    while (placedMines < mineCount) {
      const rx = Math.floor(Math.random() * size);
      const ry = Math.floor(Math.random() * size);
      if (!newBoard[ry][rx].isMine) {
        newBoard[ry][rx].isMine = true;
        placedMines++;
      }
    }

    // 3. Calculate neighbor mine counts
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (newBoard[y][x].isMine) continue;
        let neighbors = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const ny = y + dy;
            const nx = x + dx;
            if (ny >= 0 && ny < size && nx >= 0 && nx < size) {
              if (newBoard[ny][nx].isMine) neighbors++;
            }
          }
        }
        newBoard[y][x].neighborMines = neighbors;
      }
    }

    setBoard(newBoard);
    setGameState("playing");
    setScore(0);
    setTime(0);
  };

  useEffect(() => {
    initBoard();
  }, []);

  // Timer loop
  useEffect(() => {
    if (gameState !== "playing") return;
    const t = setInterval(() => {
      setTime(prev => prev + 1);
    }, 1000);
    return () => clearInterval(t);
  }, [gameState]);

  // Flood fill blank cells when clicked
  const revealCell = (grid: Cell[][], x: number, y: number) => {
    if (x < 0 || x >= size || y < 0 || y >= size) return;
    const cell = grid[y][x];
    if (cell.isRevealed || cell.isFlagged) return;

    cell.isRevealed = true;

    if (cell.neighborMines === 0 && !cell.isMine) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          revealCell(grid, x + dx, y + dy);
        }
      }
    }
  };

  const handleCellClick = (x: number, y: number) => {
    if (gameState !== "playing") return;
    const cell = board[y][x];

    if (flagMode) {
      // Toggle flag
      const newBoard = board.map(row =>
        row.map(c => (c.x === x && c.y === y ? { ...c, isFlagged: !c.isFlagged } : c))
      );
      setBoard(newBoard);
      return;
    }

    if (cell.isFlagged || cell.isRevealed) return;

    const newBoard = board.map(row => row.map(c => ({ ...c })));
    const clickedCell = newBoard[y][x];

    if (clickedCell.isMine) {
      // Game Over: reveal all mines
      newBoard.forEach(row =>
        row.forEach(c => {
          if (c.isMine) c.isRevealed = true;
        })
      );
      setBoard(newBoard);
      setGameState("lost");
      return;
    }

    // Reveal cell and connected blanks
    revealCell(newBoard, x, y);

    // Calculate score (revealed cells count * 10)
    let revealedCount = 0;
    newBoard.forEach(row =>
      row.forEach(c => {
        if (c.isRevealed && !c.isMine) revealedCount++;
      })
    );
    const newScore = revealedCount * 10;
    setScore(newScore);

    // Check Win
    const safeCellsCount = size * size - mineCount;
    if (revealedCount === safeCellsCount) {
      setGameState("won");
      // Bonus for fast completion
      const timeBonus = Math.max(0, 500 - time);
      setScore(newScore + timeBonus);
    } else {
      setBoard(newBoard);
    }
  };

  const handleRightClick = (e: React.MouseEvent, x: number, y: number) => {
    e.preventDefault();
    if (gameState !== "playing") return;
    const newBoard = board.map(row =>
      row.map(c => (c.x === x && c.y === y ? { ...c, isFlagged: !c.isFlagged } : c))
    );
    setBoard(newBoard);
  };

  const handleScoreSubmit = async () => {
    if (!user || score <= 0) return;
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
        <h2 className="game-title-text" style={{ fontSize: "1rem" }}>MINESWEEPER</h2>
        <div style={{ display: "flex", gap: "1rem", fontWeight: "800" }}>
          <div>TIME: {time}s</div>
          <div>SCORE: {score}</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: "1.5rem", width: "100%" }} className="game-layout-container">
        {/* Play Board */}
        <div className="neo-card" style={{ display: "flex", flexDirection: "column", alignItems: "center", position: "relative", backgroundColor: "#faf6f0", minHeight: "340px", justifyContent: "center", gap: "1rem" }}>
          
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              onClick={() => setFlagMode(!flagMode)}
              className={`neo-btn ${flagMode ? "accent" : "secondary"}`}
              style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem" }}
            >
              <Flag size={14} /> {flagMode ? "FLAG MODE: ON" : "FLAG MODE: OFF"}
            </button>
            <button onClick={initBoard} className="neo-btn" style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem" }}>
              <RefreshCw size={14} /> RESET
            </button>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${size}, 1fr)`,
              gridTemplateRows: `repeat(${size}, 1fr)`,
              gap: "4px",
              width: "280px",
              height: "280px",
              border: "4px solid var(--border-color)",
              padding: "4px",
              backgroundColor: "var(--border-color)",
              borderRadius: "8px"
            }}
          >
            {board.map((row, y) =>
              row.map((cell, x) => {
                let cellBg = "#fff";
                let text = "";
                let textColor = "#121212";

                if (cell.isRevealed) {
                  if (cell.isMine) {
                    cellBg = "var(--accent-color)";
                    text = "💣";
                  } else {
                    cellBg = "#eae3d7";
                    if (cell.neighborMines > 0) {
                      text = cell.neighborMines.toString();
                      const colors = ["", "#0984e3", "#27ae60", "#d63031", "#130f40", "#6c5ce7", "#d35400", "#16a085", "#2c3e50"];
                      textColor = colors[cell.neighborMines];
                    }
                  }
                } else if (cell.isFlagged) {
                  text = "🚩";
                  cellBg = "var(--primary-color)";
                }

                return (
                  <button
                    key={`${x}-${y}`}
                    onClick={() => handleCellClick(x, y)}
                    onContextMenu={(e) => handleRightClick(e, x, y)}
                    style={{
                      backgroundColor: cellBg,
                      border: "none",
                      borderRadius: "3px",
                      fontWeight: "800",
                      fontSize: "1rem",
                      color: textColor,
                      cursor: gameState === "playing" ? "pointer" : "default",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      padding: 0
                    }}
                  />
                );
              })
            )}
          </div>

          {gameState !== "playing" && (
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", backgroundColor: "rgba(250, 246, 240, 0.9)", gap: "1rem" }}>
              <div
                style={{
                  fontFamily: "var(--font-game)",
                  fontSize: "1.2rem",
                  color: gameState === "won" ? "var(--secondary-color)" : "var(--accent-color)"
                }}
              >
                {gameState === "won" ? "🏆 WINNER!" : "💥 GAME OVER"}
              </div>
              <div style={{ fontSize: "1.5rem", fontWeight: "800" }}>SCORE: {score}</div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button onClick={initBoard} className="neo-btn accent"><RefreshCw size={16} /> REPLAY</button>
                {user && gameState === "won" && (
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
              <p style={{ color: "#666", fontSize: "0.9rem" }}>No highscores yet.</p>
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
