import React, { useState, useEffect } from "react";
import { ArrowLeft, RefreshCw, Trophy, BookOpen, AlertCircle, PenTool, CheckCircle } from "lucide-react";
import GameHUDControls from "../components/GameHUDControls";

interface SudokuProps {
  onBack: () => void;
  user: any;
  submitScore: (score: number) => void;
  leaderboard: any[];
  refreshLeaderboard: () => void;
}

// Pre-generated template boards for Easy, Medium, Hard to ensure instant load time on all devices
const SUDOKU_TEMPLATES = [
  {
    solution: [
      5,3,4, 6,7,8, 9,1,2,
      6,7,2, 1,9,5, 3,4,8,
      1,9,8, 3,4,2, 5,6,7,

      8,5,9, 7,6,1, 4,2,3,
      4,2,6, 8,5,3, 7,9,1,
      7,1,3, 9,2,4, 8,5,6,

      9,6,1, 5,3,7, 2,8,4,
      2,8,7, 4,1,9, 6,3,5,
      3,4,5, 2,8,6, 1,7,9
    ],
    // Indexes to remove for levels (0 = empty, 1 = keep)
    easyMask: [
      1,1,0, 1,1,1, 0,1,1,
      1,0,1, 1,1,0, 1,1,0,
      1,1,1, 0,1,1, 1,0,1,
      0,1,1, 1,1,1, 0,1,1,
      1,1,0, 1,0,1, 1,1,1,
      1,1,1, 0,1,1, 1,1,0,
      1,0,1, 1,1,0, 1,1,1,
      1,1,0, 1,1,1, 0,1,1,
      0,1,1, 1,1,1, 1,0,1
    ]
  },
  {
    solution: [
      1,5,2, 4,8,9, 3,7,6,
      7,3,9, 2,5,6, 8,4,1,
      4,6,8, 3,7,1, 2,9,5,

      3,8,7, 1,2,4, 5,6,9,
      5,9,1, 7,6,3, 4,2,8,
      2,4,6, 8,9,5, 7,1,3,

      9,1,4, 5,3,7, 6,8,2,
      6,2,5, 9,1,8, 7,3,4,
      8,7,3, 6,2,4, 1,5,9
    ],
    easyMask: [
      1,1,1, 0,1,1, 1,0,1,
      1,0,1, 1,1,1, 0,1,1,
      1,1,0, 1,0,1, 1,1,1,
      1,1,1, 1,1,0, 1,1,0,
      0,1,1, 1,1,1, 1,0,1,
      1,1,0, 1,1,1, 0,1,1,
      1,0,1, 1,1,0, 1,1,1,
      1,1,1, 0,1,1, 1,1,1,
      0,1,1, 1,1,1, 1,0,1
    ]
  }
];

export default function Sudoku({
  onBack,
  user,
  submitScore,
  leaderboard,
  refreshLeaderboard
}: SudokuProps) {
  const [gameState, setGameState] = useState<"idle" | "playing" | "solved">("idle");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("easy");
  const [board, setBoard] = useState<number[]>(Array(81).fill(0));
  const [solution, setSolution] = useState<number[]>(Array(81).fill(0));
  const [initialMask, setInitialMask] = useState<boolean[]>(Array(81).fill(false)); // true if cell is initial value
  const [selectedCell, setSelectedCell] = useState<number | null>(null);
  const [notes, setNotes] = useState<{ [key: number]: number[] }>({});
  const [notesMode, setNotesMode] = useState(false);
  const [mistakes, setMistakes] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [playTime, setPlayTime] = useState(0);

  // Initialize board based on difficulty
  const startNewGame = () => {
    localStorage.setItem("arcade_has_played", "true");
    const template = SUDOKU_TEMPLATES[Math.floor(Math.random() * SUDOKU_TEMPLATES.length)];
    const sol = [...template.solution];
    
    // We can swap digits randomly to generate unique solutions
    const swaps: { [key: number]: number } = {};
    const numbers = [1,2,3,4,5,6,7,8,9];
    const shuffled = [...numbers].sort(() => Math.random() - 0.5);
    numbers.forEach((num, index) => {
      swaps[num] = shuffled[index];
    });

    const randomizedSolution = sol.map(val => swaps[val]);
    const initBoard = Array(81).fill(0);
    const mask = Array(81).fill(false);

    // Set mask removal rate depending on difficulty
    // Easy removes ~30, Medium removes ~42, Hard removes ~52
    let removeChance = 0.35;
    if (difficulty === "medium") removeChance = 0.52;
    if (difficulty === "hard") removeChance = 0.65;

    for (let i = 0; i < 81; i++) {
      if (Math.random() > removeChance || template.easyMask[i] === 1) {
        initBoard[i] = randomizedSolution[i];
        mask[i] = true;
      } else {
        initBoard[i] = 0;
        mask[i] = false;
      }
    }

    setSolution(randomizedSolution);
    setBoard(initBoard);
    setInitialMask(mask);
    setNotes({});
    setSelectedCell(null);
    setMistakes(0);
    setPlayTime(0);
    setGameState("playing");
  };

  // Timer loop
  useEffect(() => {
    if (gameState !== "playing" || isPaused) return;
    const interval = setInterval(() => {
      setPlayTime(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [gameState, isPaused]);

  // Input numbers handler
  const handleNumberInput = (num: number) => {
    if (gameState !== "playing" || isPaused || selectedCell === null) return;
    if (initialMask[selectedCell]) return; // Cannot edit initial cells

    if (notesMode) {
      // Toggle note
      const currentNotes = notes[selectedCell] || [];
      const nextNotes = currentNotes.includes(num)
        ? currentNotes.filter(n => n !== num)
        : [...currentNotes, num].sort();
      setNotes({
        ...notes,
        [selectedCell]: nextNotes
      });
      // Clear value if note added
      const nextBoard = [...board];
      nextBoard[selectedCell] = 0;
      setBoard(nextBoard);
    } else {
      // Clear notes for this cell
      setNotes({
        ...notes,
        [selectedCell]: []
      });

      const nextBoard = [...board];
      nextBoard[selectedCell] = num;
      setBoard(nextBoard);

      // Check if value is correct
      if (num !== solution[selectedCell]) {
        setMistakes(prev => prev + 1);
        if (!isMuted) playTone(180, 150); // Warning tone
        
        // Max 5 mistakes
        if (mistakes + 1 >= 5) {
          alert("Too many mistakes! Resetting board.");
          startNewGame();
        }
      } else {
        if (!isMuted) playTone(520, 80); // Correct tone
        // Check win condition
        const updatedBoard = nextBoard;
        const isFinished = updatedBoard.every((val, idx) => val === solution[idx]);
        if (isFinished) {
          setGameState("solved");
          const finalScore = Math.max(100, 1000 - playTime - mistakes * 50);
          submitScore(finalScore);
          refreshLeaderboard();
        }
      }
    }
  };

  const handleClearCell = () => {
    if (gameState !== "playing" || isPaused || selectedCell === null) return;
    if (initialMask[selectedCell]) return;

    const nextBoard = [...board];
    nextBoard[selectedCell] = 0;
    setBoard(nextBoard);
    setNotes({
      ...notes,
      [selectedCell]: []
    });
  };

  // Keyboard controls listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== "playing" || isPaused) return;
      if (selectedCell === null) return;

      const num = Number(e.key);
      if (num >= 1 && num <= 9) {
        handleNumberInput(num);
      } else if (e.key === "Backspace" || e.key === "Delete") {
        handleClearCell();
      } else if (e.key === "n" || e.key === "N") {
        setNotesMode(prev => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedCell, board, notesMode, gameState, isPaused, mistakes]);

  // Audio tone generator
  const playTone = (freq: number, duration: number) => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration / 1000);
    } catch (e) {
      // Ignored
    }
  };

  // Highlight check helper
  const shouldHighlightCell = (idx: number) => {
    if (selectedCell === null) return false;
    if (selectedCell === idx) return true;

    const selRow = Math.floor(selectedCell / 9);
    const selCol = selectedCell % 9;
    const curRow = Math.floor(idx / 9);
    const curCol = idx % 9;

    // Same row or col
    if (selRow === curRow || selCol === curCol) return true;

    // Same 3x3 box
    const selBoxRow = Math.floor(selRow / 3);
    const selBoxCol = Math.floor(selCol / 3);
    const curBoxRow = Math.floor(curRow / 3);
    const curBoxCol = Math.floor(curCol / 3);
    if (selBoxRow === curBoxRow && selBoxCol === curBoxCol) return true;

    return false;
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Header controls */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button onClick={onBack} className="neo-btn secondary" style={{ padding: "0.5rem 1rem" }}>
          <ArrowLeft size={18} /> BACK
        </button>
        <h2 className="game-title-text mobile-hide" style={{ fontSize: "0.9rem" }}>SUDOKU</h2>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button 
            onClick={() => setDifficulty(difficulty === "easy" ? "medium" : difficulty === "medium" ? "hard" : "easy")} 
            className="neo-btn secondary" 
            style={{ padding: "0.3rem 0.6rem", fontSize: "0.8rem", textTransform: "uppercase" }}
          >
            ⚙️ {difficulty}
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: "1.5rem" }} className="game-layout-container">
        
        {/* Play Area */}
        <div 
          className="neo-card game-view-box" 
          style={{ 
            display: "flex", 
            flexDirection: "column", 
            alignItems: "center", 
            gap: "1rem", 
            backgroundColor: "#faf6f0", 
            padding: "1rem",
            width: "100%",
            boxSizing: "border-box",
            border: "4px solid #121212",
            boxShadow: "6px 6px 0px 0px #121212"
          }}
        >
          {gameState === "idle" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", alignItems: "center", minHeight: "340px", justifyContent: "center" }}>
              <BookOpen size={48} color="var(--primary-color)" />
              <h3 style={{ fontWeight: "900", fontSize: "1.3rem" }}>SUDOKU RETRO</h3>
              <p style={{ fontSize: "0.85rem", fontWeight: "700", textAlign: "center", color: "#666" }}>
                Solve the logic puzzle! Highlighted cells indicate intersecting lines. Note entry supported.
              </p>
              <button onClick={startNewGame} className="neo-btn accent">START PLAYING</button>
            </div>
          )}

          {gameState === "playing" && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem", width: "100%" }}>
              
              {/* HUD / Timer / Mistakes */}
              <div style={{ display: "flex", justifyContent: "space-between", width: "100%", fontWeight: "800", fontSize: "0.85rem", borderBottom: "2px dashed #ccc", paddingBottom: "0.5rem" }}>
                <div>MISTAKES: <span style={{ color: "var(--accent-color)" }}>{mistakes}/5</span></div>
                <div>TIME: {formatTime(playTime)}</div>
              </div>

              {/* Grid 9x9 */}
              <div 
                style={{ 
                  display: "grid", 
                  gridTemplateColumns: "repeat(9, 1fr)", 
                  gap: "1px", 
                  backgroundColor: "#121212", 
                  border: "4px solid #121212", 
                  borderRadius: "6px",
                  aspectRatio: "1 / 1",
                  width: "100%",
                  maxWidth: "340px",
                  boxSizing: "border-box"
                }}
              >
                {board.map((val, idx) => {
                  const isInitial = initialMask[idx];
                  const isWrong = val !== 0 && val !== solution[idx];
                  const isHighlighted = shouldHighlightCell(idx);
                  const isSelected = selectedCell === idx;

                  // 3x3 grid borders styling helper
                  const col = idx % 9;
                  const row = Math.floor(idx / 9);
                  const rightBorder = (col === 2 || col === 5) ? "2px solid #121212" : "none";
                  const bottomBorder = (row === 2 || row === 5) ? "2px solid #121212" : "none";

                  return (
                    <div
                      key={idx}
                      onClick={() => setSelectedCell(idx)}
                      style={{
                        backgroundColor: isSelected ? "var(--secondary-color)" : isHighlighted ? "#fff3db" : "#fff",
                        borderRight: rightBorder,
                        borderBottom: bottomBorder,
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        cursor: "pointer",
                        fontWeight: isInitial ? "900" : "700",
                        color: isWrong ? "var(--accent-color)" : isInitial ? "#121212" : "var(--blue-accent)",
                        fontSize: "1.1rem",
                        position: "relative",
                        userSelect: "none"
                      }}
                    >
                      {val !== 0 ? (
                        val
                      ) : (
                        // Render notes pencil marks
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", width: "100%", height: "100%", padding: "2px", boxSizing: "border-box", fontSize: "0.55rem", lineHeight: "1", color: "#888", fontWeight: "700" }}>
                          {[1,2,3,4,5,6,7,8,9].map(n => (
                            <span key={n} style={{ opacity: notes[idx]?.includes(n) ? 1 : 0, textAlign: "center" }}>{n}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Pad & Note controller drawer */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", width: "100%", maxWidth: "340px" }}>
                <div style={{ display: "flex", gap: "0.4rem", justifyContent: "space-between" }}>
                  <button 
                    onClick={() => setNotesMode(!notesMode)} 
                    className={`neo-btn ${notesMode ? "accent" : "secondary"}`}
                    style={{ flex: 1, padding: "0.4rem", fontSize: "0.8rem", gap: "0.25rem", justifyContent: "center" }}
                  >
                    <PenTool size={14} /> Notes: {notesMode ? "ON" : "OFF"}
                  </button>
                  <button 
                    onClick={handleClearCell} 
                    className="neo-btn secondary"
                    style={{ flex: 1, padding: "0.4rem", fontSize: "0.8rem", justifyContent: "center" }}
                  >
                    CLEAR CELL
                  </button>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(9, 1fr)", gap: "4px" }}>
                  {[1,2,3,4,5,6,7,8,9].map(num => (
                    <button
                      key={num}
                      onClick={() => handleNumberInput(num)}
                      className="neo-btn"
                      style={{ padding: "0.5rem 0", justifyContent: "center", fontSize: "1rem", fontWeight: "900" }}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

            </div>
          )}

          {gameState === "solved" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", alignItems: "center", minHeight: "340px", justifyContent: "center" }}>
              <CheckCircle size={48} color="var(--secondary-color)" />
              <h3 style={{ fontWeight: "900", fontSize: "1.4rem" }}>PUZZLE SOLVED!</h3>
              <p style={{ fontSize: "0.9rem", fontWeight: "700" }}>TIME TAKEN: {formatTime(playTime)}</p>
              <button onClick={startNewGame} className="neo-btn accent">PLAY AGAIN</button>
            </div>
          )}

        </div>

        {/* Leaderboard Panel */}
        <div className="neo-card" style={{ display: "flex", flexDirection: "column", gap: "1rem", height: "fit-content" }}>
          <h3 style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "1.2rem" }}>
            <Trophy size={20} color="var(--primary-color)" /> TOP RANKINGS
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {leaderboard.length === 0 ? (
              <p style={{ color: "#666", fontSize: "0.9rem" }}>No highscores yet. Be the first!</p>
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
                  <span>{entry.score} pts</span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
