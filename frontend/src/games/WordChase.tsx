import React, { useState, useEffect } from "react";
import { Trophy, RefreshCw, ArrowLeft } from "lucide-react";

interface WordChaseProps {
  onBack: () => void;
  user: any;
  submitScore: (score: number) => Promise<void>;
  leaderboard: any[];
  refreshLeaderboard: () => void;
}

const WORDS_LIST = ["REACT", "VITEJS", "CLOUD", "FLARE", "GAMES", "PIXEL", "DINOX", "SNAKE", "STAGE", "MATCH", "BOARD", "SMART", "BRAIN", "MOUSE", "CLICK", "STACK", "TOWER", "SWEET", "SPINX", "LEVEL"];

export default function WordChase({ onBack, user, submitScore, leaderboard, refreshLeaderboard }: WordChaseProps) {
  const [targetWord, setTargetWord] = useState("");
  const [guesses, setGuesses] = useState<string[]>([]);
  const [currentGuess, setCurrentGuess] = useState("");
  const [gameStatus, setGameStatus] = useState<"playing" | "won" | "lost">("playing");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const maxGuesses = 6;

  const initGame = () => {
    // Select random 5-letter word
    const filtered = WORDS_LIST.filter(w => w.length === 5);
    const word = filtered[Math.floor(Math.random() * filtered.length)];
    setTargetWord(word);
    setGuesses([]);
    setCurrentGuess("");
    setGameStatus("playing");
    setMessage("");
  };

  useEffect(() => {
    initGame();
  }, []);

  const handleKeyPress = (char: string) => {
    if (gameStatus !== "playing") return;

    if (char === "ENTER") {
      if (currentGuess.length < 5) {
        setMessage("Word must be 5 letters");
        setTimeout(() => setMessage(""), 2000);
        return;
      }
      
      const newGuesses = [...guesses, currentGuess];
      setGuesses(newGuesses);
      setCurrentGuess("");

      if (currentGuess === targetWord) {
        setGameStatus("won");
        setMessage("🎉 Congratulations!");
      } else if (newGuesses.length >= maxGuesses) {
        setGameStatus("lost");
        setMessage(`The word was ${targetWord}`);
      }
    } else if (char === "BACKSPACE" || char === "DEL") {
      setCurrentGuess(currentGuess.slice(0, -1));
    } else if (currentGuess.length < 5) {
      setCurrentGuess(currentGuess + char.toUpperCase());
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameStatus !== "playing") return;
      const key = e.key.toUpperCase();
      if (key === "ENTER") handleKeyPress("ENTER");
      else if (key === "BACKSPACE") handleKeyPress("BACKSPACE");
      else if (/^[A-Z]$/.test(key)) handleKeyPress(key);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentGuess, guesses, gameStatus]);

  const getLetterStatus = (letter: string, index: number, guess: string) => {
    if (targetWord[index] === letter) return "correct"; // green
    if (targetWord.includes(letter)) {
      // Check count logic to avoid double highlighting same letter if target has only one
      const letterCountInTarget = targetWord.split("").filter(l => l === letter).length;
      const lettersBefore = guess.split("").slice(0, index).filter(l => l === letter).length;
      const correctMatches = guess.split("").filter((l, i) => l === letter && targetWord[i] === letter).length;
      
      if (lettersBefore + correctMatches < letterCountInTarget) {
        return "present"; // yellow
      }
    }
    return "absent"; // grey
  };

  // Score calculation: (7 - guess_count) * 100
  const calculatedScore = gameStatus === "won" ? (7 - guesses.length) * 100 : 0;

  const handleScoreSubmit = async () => {
    if (!user || calculatedScore <= 0) return;
    setSubmitting(true);
    try {
      await submitScore(calculatedScore);
      refreshLeaderboard();
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const keyboardRows = [
    ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
    ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
    ["ENTER", "Z", "X", "C", "V", "B", "N", "M", "DEL"]
  ];

  const getKeyStyle = (char: string) => {
    let style: React.CSSProperties = {
      padding: "0.5rem",
      fontSize: "0.9rem",
      fontWeight: "800",
      border: "2px solid var(--border-color)",
      borderRadius: "4px",
      backgroundColor: "#fff",
      cursor: "pointer",
      userSelect: "none"
    };

    // Find if key has been guessed
    let bestStatus: "correct" | "present" | "absent" | null = null;
    guesses.forEach(g => {
      g.split("").forEach((l, idx) => {
        if (l === char) {
          const status = getLetterStatus(l, idx, g);
          if (status === "correct") bestStatus = "correct";
          else if (status === "present" && bestStatus !== "correct") bestStatus = "present";
          else if (bestStatus === null) bestStatus = "absent";
        }
      });
    });

    if (bestStatus === "correct") style.backgroundColor = "var(--secondary-color)";
    else if (bestStatus === "present") style.backgroundColor = "var(--primary-color)";
    else if (bestStatus === "absent") style.backgroundColor = "#ccc";

    return style;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button onClick={onBack} className="neo-btn secondary" style={{ padding: "0.5rem 1rem" }}>
          <ArrowLeft size={18} /> BACK
        </button>
        <h2 className="game-title-text" style={{ fontSize: "1rem" }}>WORD CHASE</h2>
        <button onClick={initGame} className="neo-btn" style={{ padding: "0.5rem" }}><RefreshCw size={18} /></button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: "1.5rem", width: "100%" }} className="game-layout-container">
        {/* Main Grid Area */}
        <div className="neo-card" style={{ display: "flex", flexDirection: "column", alignItems: "center", backgroundColor: "#faf6f0", minHeight: "450px", gap: "1rem", justifyContent: "space-between", padding: "1.5rem 0.5rem" }}>
          
          {message && (
            <div style={{ border: "2px solid #121212", background: "var(--primary-color)", padding: "0.3rem 1rem", fontWeight: "800", borderRadius: "4px" }}>
              {message}
            </div>
          )}

          {/* Guesses Board */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {Array.from({ length: maxGuesses }).map((_, rIdx) => {
              const guess = guesses[rIdx];
              const isCurrent = rIdx === guesses.length;

              return (
                <div key={rIdx} style={{ display: "flex", gap: "6px" }}>
                  {Array.from({ length: 5 }).map((_, cIdx) => {
                    let letter = "";
                    let bgColor = "#fff";
                    let color = "#121212";

                    if (guess) {
                      letter = guess[cIdx];
                      const status = getLetterStatus(letter, cIdx, guess);
                      if (status === "correct") bgColor = "var(--secondary-color)";
                      else if (status === "present") bgColor = "var(--primary-color)";
                      else bgColor = "#b2bec3";
                    } else if (isCurrent) {
                      letter = currentGuess[cIdx] || "";
                    }

                    return (
                      <div
                        key={cIdx}
                        style={{
                          width: "44px",
                          height: "44px",
                          border: "3px solid var(--border-color)",
                          borderRadius: "4px",
                          display: "flex",
                          justifyContent: "center",
                          alignItems: "center",
                          fontWeight: "800",
                          fontSize: "1.2rem",
                          backgroundColor: bgColor,
                          color: color,
                          boxShadow: "2px 2px 0px rgba(0,0,0,0.15)"
                        }}
                      >
                        {letter}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {gameStatus !== "playing" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", alignItems: "center" }}>
              {gameStatus === "won" && user && (
                <button onClick={handleScoreSubmit} disabled={submitting} className="neo-btn accent">
                  {submitting ? "SUBMITTING..." : `SUBMIT SCORE: ${calculatedScore}`}
                </button>
              )}
              <button onClick={initGame} className="neo-btn secondary"><RefreshCw size={16} /> PLAY AGAIN</button>
            </div>
          )}

          {/* Virtual Keyboard */}
          <div style={{ display: "flex", flexDirection: "column", gap: "5px", width: "100%", maxWidth: "460px", padding: "0 5px" }}>
            {keyboardRows.map((row, rIdx) => (
              <div key={rIdx} style={{ display: "flex", gap: "4px", justifyContent: "center" }}>
                {row.map(char => (
                  <button
                    key={char}
                    onClick={() => handleKeyPress(char)}
                    style={getKeyStyle(char)}
                    className="key-btn"
                  >
                    {char}
                  </button>
                ))}
              </div>
            ))}
          </div>

        </div>

        {/* Leaderboards */}
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
