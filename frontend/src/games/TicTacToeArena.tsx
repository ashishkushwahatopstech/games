import React, { useState, useEffect } from "react";
import { ArrowLeft, RefreshCw, Trophy, Users, AlertCircle } from "lucide-react";

interface TicTacToeArenaProps {
  onBack: () => void;
  user: any;
  backendUrl: string;
  token: string | null;
  triggerLogin: () => void;
  leaderboard: any[];
  refreshLeaderboard: () => void;
}

export default function TicTacToeArena({
  onBack,
  user,
  backendUrl,
  token,
  triggerLogin,
  leaderboard,
  refreshLeaderboard
}: TicTacToeArenaProps) {
  const [matchState, setMatchState] = useState<any>(null);
  const [status, setStatus] = useState<"idle" | "searching" | "matched" | "gameover">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [submittingMove, setSubmittingMove] = useState(false);

  // Matchmaking status polling loop
  useEffect(() => {
    if (status !== "searching" && status !== "matched") return;

    const pollStatus = async () => {
      if (!token) return;
      try {
        const res = await fetch(`${backendUrl}/api/matchmaking/status`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json() as any;

        if (data.error) {
          setErrorMsg(data.error);
          setStatus("idle");
          return;
        }

        if (data.status === "waiting") {
          setStatus("searching");
          setMatchState(null);
        } else if (data.status === "matched") {
          setStatus("matched");
          setMatchState(data);
        } else {
          setStatus("idle");
          setMatchState(null);
        }
      } catch (e) {
        console.error("Matchmaking status check failed", e);
      }
    };

    pollStatus(); // initial check
    const interval = setInterval(pollStatus, 1500);
    return () => clearInterval(interval);
  }, [status, token, backendUrl]);

  const joinQueue = async () => {
    if (!user) {
      triggerLogin();
      return;
    }
    setErrorMsg("");
    setStatus("searching");

    try {
      const res = await fetch(`${backendUrl}/api/matchmaking/join`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json() as any;

      if (data.error) {
        setErrorMsg(data.error);
        setStatus("idle");
      }
    } catch (e) {
      setErrorMsg("Connection to server failed.");
      setStatus("idle");
    }
  };

  const leaveQueueOrResign = async () => {
    if (!token) return;
    try {
      await fetch(`${backendUrl}/api/matchmaking/leave`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      setStatus("idle");
      setMatchState(null);
    } catch (e) {
      console.error(e);
    }
  };

  const makeMove = async (cellIndex: number) => {
    if (!token || !matchState || submittingMove) return;
    if (matchState.currentTurn !== user.email) return; // not my turn
    if (matchState.boardState.board[cellIndex] !== null) return; // occupied

    setSubmittingMove(true);
    try {
      const res = await fetch(`${backendUrl}/api/matchmaking/move`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ matchId: matchState.matchId, cellIndex })
      });
      const data = await res.json() as any;

      if (data.error) {
        setErrorMsg(data.error);
      } else {
        setMatchState(data);
      }
    } catch (e) {
      setErrorMsg("Failed to record move");
    } finally {
      setSubmittingMove(false);
    }
  };

  // Check if player won
  const isMyTurn = matchState && matchState.currentTurn === user?.email;
  const isPlayer1 = matchState && matchState.player1 === user?.email;
  const mySymbol = isPlayer1 ? "X" : "O";
  const opponentSymbol = isPlayer1 ? "O" : "X";

  // When game finishes, report scoreboard updates
  useEffect(() => {
    if (matchState && matchState.winner) {
      setStatus("gameover");
      if (matchState.winner === user?.email) {
        // Record 100 points on scoreboard for win
        fetch(`${backendUrl}/api/leaderboard/tic-tac-toe-online`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ score: 100 })
        }).then(() => refreshLeaderboard());
      }
    }
  }, [matchState?.winner]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button onClick={onBack} className="neo-btn secondary" style={{ padding: "0.5rem 1rem" }}>
          <ArrowLeft size={18} /> BACK
        </button>
        <h2 className="game-title-text" style={{ fontSize: "0.9rem" }}>TIC-TAC-TOE ARENA</h2>
        <div style={{ fontWeight: "800", display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <Users size={16} /> ONLINE 1v1
        </div>
      </div>

      {!user ? (
        <div className="neo-card" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem", backgroundColor: "#faf6f0", padding: "3rem 1rem" }}>
          <AlertCircle size={48} color="var(--accent-color)" />
          <h3 style={{ fontWeight: "800" }}>Login Required</h3>
          <p style={{ fontWeight: "600", fontSize: "0.9rem", color: "#666", textAlign: "center", maxWidth: "300px" }}>
            You must be logged in to matchmake and play against other real-time players online.
          </p>
          <button onClick={triggerLogin} className="neo-btn accent">LOG IN TO PLAY</button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: "1.5rem", width: "100%" }} className="game-layout-container">
          {/* Main Board */}
          <div className="neo-card" style={{ display: "flex", flexDirection: "column", alignItems: "center", backgroundColor: "#faf6f0", minHeight: "420px", padding: "1.5rem", justifyContent: "center", position: "relative" }}>
            {errorMsg && (
              <div style={{ border: "2px solid #121212", background: "var(--accent-color)", color: "#fff", padding: "0.4rem 1rem", fontWeight: "800", borderRadius: "4px", marginBottom: "1rem", fontSize: "0.85rem" }}>
                {errorMsg}
              </div>
            )}

            {status === "idle" && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1.5rem" }}>
                <h3 style={{ fontWeight: "800", fontSize: "1.3rem" }}>Ready to Arena?</h3>
                <p style={{ fontWeight: "600", fontSize: "0.9rem", color: "#666", textAlign: "center", maxWidth: "250px" }}>
                  Find a live opponent online. Wins grant +100 points on the global leaderboard!
                </p>
                <button onClick={joinQueue} className="neo-btn accent">FIND OPPONENT</button>
              </div>
            )}

            {status === "searching" && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1.5rem" }}>
                <div style={{ animation: "spin 2s linear infinite" }} className="spin-loader">
                  <RefreshCw size={48} color="var(--blue-accent)" />
                </div>
                <h3 style={{ fontWeight: "800" }}>Searching for match...</h3>
                <p style={{ fontWeight: "600", fontSize: "0.9rem", color: "#666" }}>Waiting for another player to join.</p>
                <button onClick={leaveQueueOrResign} className="neo-btn secondary">CANCEL</button>
              </div>
            )}

            {status === "matched" && matchState && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1.5rem", width: "100%" }}>
                {/* Players HUD */}
                <div style={{ display: "flex", justifyContent: "space-between", width: "100%", maxWidth: "300px", fontWeight: "800", fontSize: "0.85rem" }}>
                  <div style={{ padding: "0.3rem 0.6rem", border: "2px solid #121212", background: isPlayer1 ? "var(--primary-color)" : "#fff", borderRadius: "4px" }}>
                    PLAYER 1: {isPlayer1 ? "You (X)" : "Opponent (X)"}
                  </div>
                  <div style={{ padding: "0.3rem 0.6rem", border: "2px solid #121212", background: !isPlayer1 ? "var(--primary-color)" : "#fff", borderRadius: "4px" }}>
                    PLAYER 2: {!isPlayer1 ? "You (O)" : "Opponent (O)"}
                  </div>
                </div>

                {/* Status Bar */}
                <div style={{ fontSize: "1rem", fontWeight: "800", color: isMyTurn ? "var(--secondary-color)" : "#666" }}>
                  {isMyTurn ? "👉 IT IS YOUR TURN!" : "⏳ Opponent is thinking..."}
                </div>

                {/* Grid */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: "6px",
                    width: "240px",
                    height: "240px",
                    border: "4px solid var(--border-color)",
                    padding: "6px",
                    backgroundColor: "var(--border-color)",
                    borderRadius: "8px"
                  }}
                >
                  {matchState.boardState.board.map((cell: any, idx: number) => (
                    <button
                      key={idx}
                      onClick={() => makeMove(idx)}
                      disabled={!isMyTurn || cell !== null}
                      style={{
                        backgroundColor: cell === "X" ? "var(--accent-color)" : cell === "O" ? "var(--blue-accent)" : "#fff",
                        border: "none",
                        borderRadius: "4px",
                        fontSize: "2rem",
                        fontWeight: "900",
                        color: "#fff",
                        cursor: isMyTurn && cell === null ? "pointer" : "default"
                      }}
                    >
                      {cell}
                    </button>
                  ))}
                </div>

                <button onClick={leaveQueueOrResign} className="neo-btn secondary" style={{ fontSize: "0.85rem" }}>RESIGN MATCH</button>
              </div>
            )}

            {status === "gameover" && matchState && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
                <h2 style={{ fontFamily: "var(--font-game)", fontSize: "1.2rem", color: matchState.winner === user.email ? "var(--secondary-color)" : "var(--accent-color)" }}>
                  {matchState.winner === "DRAW" ? "🤝 DRAW MATCH!" : matchState.winner === user.email ? "🏆 YOU WON!" : "💀 YOU LOST!"}
                </h2>
                <p style={{ fontWeight: "700" }}>Game concluded.</p>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button onClick={joinQueue} className="neo-btn accent">FIND NEW MATCH</button>
                  <button onClick={() => setStatus("idle")} className="neo-btn secondary">DASHBOARD</button>
                </div>
              </div>
            )}
          </div>

          {/* Leaderboards */}
          <div className="neo-card" style={{ display: "flex", flexDirection: "column", gap: "1rem", height: "fit-content" }}>
            <h3 style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "1.2rem" }}>
              <Trophy size={20} color="var(--primary-color)" /> TOP WINNERS
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {leaderboard.length === 0 ? (
                <p style={{ color: "#666", fontSize: "0.9rem" }}>No match history recorded.</p>
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
                    <span>{entry.score} wins</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
