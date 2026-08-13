import React, { useState, useEffect } from "react";
import { ArrowLeft, RefreshCw, Trophy, AlertCircle, HelpCircle } from "lucide-react";

interface NutsBoltsProps {
  onBack: () => void;
  user: any;
  submitScore: (score: number) => void;
  leaderboard: any[];
  refreshLeaderboard: () => void;
}

// Colors representing the colorful nuts
const NUT_COLORS = ["#e63946", "#3700b3", "#4caf50", "#ffb703"]; // Red, Blue, Green, Yellow

export default function NutsBolts({
  onBack,
  user,
  submitScore,
  leaderboard,
  refreshLeaderboard
}: NutsBoltsProps) {
  const [gameState, setGameState] = useState<"idle" | "playing" | "solved">("idle");
  const [bolts, setBolts] = useState<string[][]>([]); // Bolts holding nuts of different colors
  const [selectedBoltIdx, setSelectedBoltIdx] = useState<number | null>(null);
  const [moves, setMoves] = useState(0);

  // Initialize board: 5 bolts, 4 filled with shuffled nuts, 1 fully empty
  const startNewGame = () => {
    localStorage.setItem("arcade_has_played", "true");
    
    // We want 4 sets of 4 nuts of matching colors
    let pool: string[] = [];
    NUT_COLORS.forEach(color => {
      for (let i = 0; i < 4; i++) {
        pool.push(color);
      }
    });

    // Shuffle pool
    pool.sort(() => Math.random() - 0.5);

    // Populate 4 bolts with 4 nuts each, leaving 1 extra bolt empty
    const initBolts: string[][] = [];
    for (let i = 0; i < 4; i++) {
      initBolts.push(pool.slice(i * 4, (i + 1) * 4));
    }
    initBolts.push([]); // Empty helper bolt

    setBolts(initBolts);
    setSelectedBoltIdx(null);
    setMoves(0);
    setGameState("playing");
  };

  const handleBoltClick = (boltIdx: number) => {
    if (gameState !== "playing") return;

    if (selectedBoltIdx === null) {
      // Selecting the top nut of a bolt
      if (bolts[boltIdx].length === 0) return; // Cannot select from empty bolt
      setSelectedBoltIdx(boltIdx);
    } else {
      // Trying to move selected nut to this bolt
      if (selectedBoltIdx === boltIdx) {
        // Deselect
        setSelectedBoltIdx(null);
        return;
      }

      const sourceBolt = bolts[selectedBoltIdx];
      const targetBolt = bolts[boltIdx];

      // Rules verification:
      // 1. Target bolt must not be full (max 4 nuts)
      if (targetBolt.length >= 4) {
        setSelectedBoltIdx(null);
        return;
      }

      const topNutColor = sourceBolt[sourceBolt.length - 1];

      // 2. Target bolt must be empty, OR target's top nut color must match source's top nut color
      if (targetBolt.length > 0 && targetBolt[targetBolt.length - 1] !== topNutColor) {
        setSelectedBoltIdx(null);
        return;
      }

      // Execute move
      const nextBolts = bolts.map((b, idx) => {
        if (idx === selectedBoltIdx) {
          return b.slice(0, -1);
        }
        if (idx === boltIdx) {
          return [...b, topNutColor];
        }
        return b;
      });

      setBolts(nextBolts);
      setSelectedBoltIdx(null);
      setMoves(prev => prev + 1);

      // Check win condition:
      // All bolts are either fully empty or hold exactly 4 nuts of the same color
      const isSolved = nextBolts.every(bolt => {
        if (bolt.length === 0) return true;
        if (bolt.length === 4) {
          const firstColor = bolt[0];
          return bolt.every(c => c === firstColor);
        }
        return false;
      });

      if (isSolved) {
        setGameState("solved");
        const finalScore = Math.max(10, 200 - moves);
        submitScore(finalScore);
        refreshLeaderboard();
      }
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button onClick={onBack} className="neo-btn secondary" style={{ padding: "0.5rem 1rem" }}>
          <ArrowLeft size={18} /> BACK
        </button>
        <h2 className="game-title-text mobile-hide" style={{ fontSize: "0.9rem" }}>NUTS AND BOLTS</h2>
        <div style={{ fontWeight: "800", display: "flex", alignItems: "center", gap: "0.3rem" }}>
          🔧 Sort Puzzle
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: "1.5rem" }} className="game-layout-container">
        
        {/* Arena */}
        <div 
          className="neo-card game-view-box" 
          style={{ 
            display: "flex", 
            flexDirection: "column", 
            alignItems: "center", 
            backgroundColor: "#faf6f0", 
            padding: "1.5rem",
            justifyContent: "center",
            width: "100%",
            boxSizing: "border-box",
            border: "4px solid #121212",
            boxShadow: "6px 6px 0px 0px #121212",
            minHeight: "360px"
          }}
        >
          {gameState === "idle" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", alignItems: "center", textAlign: "center" }}>
              <h3 style={{ fontWeight: "900", fontSize: "1.3rem" }}>NUTS & BOLTS SORT</h3>
              <p style={{ fontSize: "0.85rem", fontWeight: "700", color: "#666" }}>
                Sort the colorful nuts into the matching bolts. You can only stack matching colors or drop nuts on empty bolts!
              </p>
              <button onClick={startNewGame} className="neo-btn accent">START PLAYING</button>
            </div>
          )}

          {gameState === "playing" && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2rem", width: "100%" }}>
              <div style={{ display: "flex", justifyContent: "space-between", width: "100%", fontWeight: "800", fontSize: "0.85rem", borderBottom: "2px dashed #ccc", paddingBottom: "0.5rem" }}>
                <div>MOVES: {moves}</div>
                <button onClick={startNewGame} className="neo-btn secondary" style={{ padding: "0.2rem 0.5rem", fontSize: "0.75rem" }}>RESET</button>
              </div>

              {/* Render Bolts */}
              <div style={{ display: "flex", gap: "1.2rem", justifyContent: "center", alignItems: "flex-end", minHeight: "180px", width: "100%" }}>
                {bolts.map((bolt, boltIdx) => {
                  const isSelected = selectedBoltIdx === boltIdx;
                  return (
                    <div 
                      key={boltIdx} 
                      onClick={() => handleBoltClick(boltIdx)}
                      style={{ 
                        display: "flex", 
                        flexDirection: "column-reverse", 
                        alignItems: "center", 
                        position: "relative",
                        cursor: "pointer",
                        width: "36px",
                        height: "150px",
                        backgroundColor: "#e0d6c5",
                        border: isSelected ? "3px solid var(--accent-color)" : "3px solid #121212",
                        borderRadius: "8px 8px 0 0",
                        boxSizing: "border-box",
                        transition: "all 0.15s ease",
                        boxShadow: isSelected ? "0 0 8px var(--accent-color)" : "none"
                      }}
                    >
                      {/* Thread details inside bolt */}
                      <div style={{ position: "absolute", top: 10, bottom: 10, width: "6px", backgroundColor: "rgba(18,18,18,0.15)", borderRadius: "2px" }} />

                      {/* Nuts stacked on this bolt */}
                      {bolt.map((color, nutIdx) => {
                        // If selected top nut, slide it up slightly
                        const isTopNut = nutIdx === bolt.length - 1;
                        const offset = (isTopNut && isSelected) ? "-20px" : "0px";

                        return (
                          <div 
                            key={nutIdx}
                            style={{
                              width: "48px",
                              height: "24px",
                              backgroundColor: color,
                              border: "3px solid #121212",
                              borderRadius: "4px",
                              marginBottom: "2px",
                              zIndex: 2,
                              boxShadow: "inset 0 4px 0 rgba(255,255,255,0.2)",
                              transform: `translateY(${offset})`,
                              transition: "transform 0.1s ease-out"
                            }}
                          />
                        );
                      })}
                    </div>
                  );
                })}
              </div>

              <div style={{ fontSize: "0.8rem", fontWeight: "700", color: "#666" }}>
                Select a bolt to lift the nut, then tap another bolt to drop it.
              </div>
            </div>
          )}

          {gameState === "solved" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", alignItems: "center" }}>
              <h3 style={{ fontWeight: "900", fontSize: "1.4rem", color: "var(--secondary-color)" }}>SORT COMPLETE!</h3>
              <p style={{ fontSize: "0.9rem", fontWeight: "700" }}>MOVES TAKEN: {moves}</p>
              <button onClick={startNewGame} className="neo-btn accent">PLAY AGAIN</button>
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
                    <span>{entry.user_name}</span>
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
