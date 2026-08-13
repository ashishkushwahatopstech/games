import React, { useState, useEffect } from "react";
import { ArrowLeft, RefreshCw, Trophy, Users, AlertCircle, RefreshCcw, Cpu } from "lucide-react";

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
  // Mode selection: "lobby" (selection screen), "online_searching", "online_matched", "online_gameover", "bot_playing", "bot_gameover"
  const [arenaMode, setArenaMode] = useState<"lobby" | "online" | "bot">("lobby");
  const [matchState, setMatchState] = useState<any>(null);
  const [status, setStatus] = useState<"idle" | "searching" | "matched" | "gameover">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [submittingMove, setSubmittingMove] = useState(false);

  // Bot Local State variables
  const [botBoard, setBotBoard] = useState<(string | null)[]>(Array(9).fill(null));
  const [botTurn, setBotTurn] = useState<"player" | "bot">("player"); // player is X, bot is O
  const [botWinner, setBotWinner] = useState<string | null>(null); // null, "X", "O", or "DRAW"

  // Polling loop for online matches
  useEffect(() => {
    if (arenaMode !== "online") return;
    if (status !== "searching" && status !== "matched" && status !== "gameover") return;

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
          setArenaMode("lobby");
          return;
        }

        if (data.status === "waiting") {
          setStatus("searching");
          setMatchState(null);
        } else if (data.status === "matched") {
          setStatus("matched");
          setMatchState(data);
        } else if (data.status === "gameover") {
          setStatus("gameover");
          setMatchState(data);
        } else {
          if (status !== "gameover") {
            setStatus("idle");
            setArenaMode("lobby");
            setMatchState(null);
          }
        }
      } catch (e) {
        console.error("Matchmaking status check failed", e);
      }
    };

    pollStatus();
    const interval = setInterval(pollStatus, 1500);
    return () => clearInterval(interval);
  }, [status, token, backendUrl, arenaMode]);

  const joinQueue = async () => {
    if (!user) {
      triggerLogin();
      return;
    }
    setErrorMsg("");
    setArenaMode("online");
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
        setArenaMode("lobby");
      }
    } catch (e) {
      setErrorMsg("Connection to server failed.");
      setStatus("idle");
      setArenaMode("lobby");
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
      setArenaMode("lobby");
      setMatchState(null);
    } catch (e) {
      console.error(e);
    }
  };

  const makeMove = async (cellIndex: number) => {
    if (!token || !matchState || submittingMove) return;
    if (matchState.currentTurn !== user.email) return;
    if (matchState.boardState.board[cellIndex] !== null) return;

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
        if (data.winner) {
          setStatus("gameover");
        }
      }
    } catch (e) {
      setErrorMsg("Failed to record move");
    } finally {
      setSubmittingMove(false);
    }
  };

  const requestRematch = async () => {
    if (!token || !matchState) return;
    try {
      const res = await fetch(`${backendUrl}/api/matchmaking/rematch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ matchId: matchState.matchId })
      });
      const data = await res.json() as any;
      if (data.success) {
        setMatchState((prev: any) => ({
          ...prev,
          rematchStatus: {
            ...prev?.rematchStatus,
            me: true
          }
        }));
      }
    } catch (e) {
      console.warn("Rematch request failed", e);
    }
  };

  // ----------------------------------------------------
  // Bot Offline Game Mode Logic
  // ----------------------------------------------------
  const startBotGame = () => {
    localStorage.setItem("arcade_has_played", "true");
    setBotBoard(Array(9).fill(null));
    setBotTurn("player");
    setBotWinner(null);
    setArenaMode("bot");
  };

  const checkWinner = (board: (string | null)[]) => {
    const winLines = [
      [0,1,2], [3,4,5], [6,7,8], // Rows
      [0,3,6], [1,4,7], [2,5,8], // Columns
      [0,4,8], [2,4,6]           // Diagonals
    ];
    for (const line of winLines) {
      const [a, b, c] = line;
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return board[a]; // Returns "X" or "O"
      }
    }
    if (board.every(cell => cell !== null)) {
      return "DRAW";
    }
    return null;
  };

  const makeBotMove = (currentBoard: (string | null)[]) => {
    const winLines = [
      [0,1,2], [3,4,5], [6,7,8],
      [0,3,6], [1,4,7], [2,5,8],
      [0,4,8], [2,4,6]
    ];

    // 1. Can Bot Win?
    for (const line of winLines) {
      const [a, b, c] = line;
      const vals = [currentBoard[a], currentBoard[b], currentBoard[c]];
      if (vals.filter(v => v === "O").length === 2 && vals.filter(v => v === null).length === 1) {
        const emptyIdx = line[vals.indexOf(null)];
        return emptyIdx;
      }
    }

    // 2. Can Bot Block Player?
    for (const line of winLines) {
      const [a, b, c] = line;
      const vals = [currentBoard[a], currentBoard[b], currentBoard[c]];
      if (vals.filter(v => v === "X").length === 2 && vals.filter(v => v === null).length === 1) {
        const emptyIdx = line[vals.indexOf(null)];
        return emptyIdx;
      }
    }

    // 3. Take Center (4)
    if (currentBoard[4] === null) return 4;

    // 4. Take Corners
    const corners = [0, 2, 6, 8].filter(idx => currentBoard[idx] === null);
    if (corners.length > 0) {
      return corners[Math.floor(Math.random() * corners.length)];
    }

    // 5. Take Random
    const empties = currentBoard.map((c, i) => c === null ? i : null).filter(v => v !== null) as number[];
    return empties[Math.floor(Math.random() * empties.length)];
  };

  const handlePlayerGridClick = (idx: number) => {
    if (botTurn !== "player" || botBoard[idx] !== null || botWinner) return;

    const nextBoard = [...botBoard];
    nextBoard[idx] = "X";
    setBotBoard(nextBoard);

    const win = checkWinner(nextBoard);
    if (win) {
      setBotWinner(win);
    } else {
      setBotTurn("bot");
    }
  };

  // Trigger Bot thinking loop when it is the Bot's turn
  useEffect(() => {
    if (arenaMode !== "bot" || botTurn !== "bot" || botWinner) return;

    const botThinkingTimeout = setTimeout(() => {
      const nextBoard = [...botBoard];
      const botMoveIdx = makeBotMove(nextBoard);
      
      if (botMoveIdx !== undefined && botMoveIdx !== -1) {
        nextBoard[botMoveIdx] = "O";
        setBotBoard(nextBoard);
      }

      const win = checkWinner(nextBoard);
      if (win) {
        setBotWinner(win);
      } else {
        setBotTurn("player");
      }
    }, 600);

    return () => clearTimeout(botThinkingTimeout);
  }, [botTurn, botBoard, botWinner, arenaMode]);

  // Online active turn checks
  const isOnlineTurn = matchState && matchState.currentTurn === user?.email;
  const isPlayer1 = matchState && matchState.player1 === user?.email;

  // Record stats on online win
  useEffect(() => {
    if (arenaMode === "online" && matchState && matchState.winner && matchState.winner === user?.email) {
      fetch(`${backendUrl}/api/leaderboard/tic-tac-toe-online`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ score: 100 })
      })
        .then(() => refreshLeaderboard())
        .catch(err => console.warn(err));
    }
  }, [matchState?.winner, arenaMode]);

  // Highlight Box Styles depending on Active Turn
  const activeStyle: React.CSSProperties = {
    padding: "0.5rem 0.8rem",
    border: "3px solid #121212",
    backgroundColor: "var(--primary-color)",
    boxShadow: "4px 4px 0px #121212",
    borderRadius: "6px",
    fontWeight: "900",
    transform: "scale(1.05)",
    transition: "all 0.15s ease"
  };

  const inactiveStyle: React.CSSProperties = {
    padding: "0.5rem 0.8rem",
    border: "2px solid #ccc",
    backgroundColor: "#fff",
    opacity: 0.6,
    borderRadius: "6px",
    fontWeight: "800",
    transform: "scale(1)",
    transition: "all 0.15s ease"
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button onClick={onBack} className="neo-btn secondary" style={{ padding: "0.5rem 1rem" }}>
          <ArrowLeft size={18} /> BACK
        </button>
        <h2 className="game-title-text mobile-hide" style={{ fontSize: "0.9rem" }}>TIC-TAC-TOE ARENA</h2>
        <div style={{ fontWeight: "800", display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <Users size={16} /> ARENA 1v1
        </div>
      </div>

      {arenaMode === "lobby" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: "1.5rem", width: "100%" }} className="game-layout-container">
          <div className="neo-card" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2rem", backgroundColor: "#faf6f0", padding: "3rem 1rem", justifyContent: "center" }}>
            <div style={{ textAlign: "center" }}>
              <h3 style={{ fontWeight: "900", fontSize: "1.5rem" }}>CHOOSE YOUR ARENA</h3>
              <p style={{ fontWeight: "600", fontSize: "0.90rem", color: "#666", marginTop: "0.5rem" }}>
                Play real-time PVP with players globally, or practice offline against the AI.
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", width: "100%", maxWidth: "260px" }}>
              <button onClick={joinQueue} className="neo-btn accent" style={{ justifyContent: "center", gap: "0.5rem", padding: "0.8rem" }}>
                <Users size={18} /> PLAY ONLINE (PVP)
              </button>
              <button onClick={startBotGame} className="neo-btn secondary" style={{ justifyContent: "center", gap: "0.5rem", padding: "0.8rem" }}>
                <Cpu size={18} /> PLAY VS BOT (OFFLINE)
              </button>
            </div>
          </div>

          {/* Leaders */}
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

      {/* Online Searching */}
      {arenaMode === "online" && status === "searching" && (
        <div className="neo-card" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1.5rem", padding: "3rem 1rem", backgroundColor: "#faf6f0" }}>
          <div style={{ animation: "spin 2s linear infinite" }} className="spin-loader">
            <RefreshCw size={48} color="var(--blue-accent)" />
          </div>
          <h3 style={{ fontWeight: "800" }}>Searching for match...</h3>
          <p style={{ fontWeight: "600", fontSize: "0.9rem", color: "#666" }}>Waiting for another player to join.</p>
          <button onClick={leaveQueueOrResign} className="neo-btn secondary">CANCEL</button>
        </div>
      )}

      {/* Online PVP Gameplay */}
      {arenaMode === "online" && (status === "matched" || status === "gameover") && matchState && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: "1.5rem", width: "100%" }} className="game-layout-container">
          <div className="neo-card" style={{ display: "flex", flexDirection: "column", alignItems: "center", backgroundColor: "#faf6f0", minHeight: "420px", padding: "1.5rem", justifyContent: "center" }}>
            
            {status === "matched" && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1.5rem", width: "100%" }}>
                {/* Visual active turn side HUD */}
                <div style={{ display: "flex", justifyContent: "space-between", width: "100%", maxWidth: "300px", fontSize: "0.85rem", alignItems: "center" }}>
                  <div style={matchState.currentTurn === matchState.player1 ? activeStyle : inactiveStyle}>
                    {isPlayer1 ? "You (X)" : "Opponent (X)"}
                  </div>
                  <span style={{ fontSize: "1.2rem", fontWeight: "900" }}>VS</span>
                  <div style={matchState.currentTurn === matchState.player2 ? activeStyle : inactiveStyle}>
                    {!isPlayer1 ? "You (O)" : "Opponent (O)"}
                  </div>
                </div>

                <div style={{ fontSize: "1rem", fontWeight: "800", color: isOnlineTurn ? "var(--secondary-color)" : "#666" }}>
                  {isOnlineTurn ? "👉 IT IS YOUR TURN!" : "⏳ Opponent is thinking..."}
                </div>

                {/* Grid */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gridTemplateRows: "repeat(3, 1fr)",
                    gap: "8px",
                    width: "240px",
                    height: "240px",
                    border: "4px solid var(--border-color)",
                    padding: "8px",
                    backgroundColor: "var(--border-color)",
                    borderRadius: "8px",
                    boxSizing: "border-box"
                  }}
                >
                  {matchState.boardState.board.map((cell: any, idx: number) => (
                    <button
                      key={idx}
                      onClick={() => makeMove(idx)}
                      disabled={!isOnlineTurn || cell !== null}
                      style={{
                        backgroundColor: cell === "X" ? "var(--accent-color)" : cell === "O" ? "var(--blue-accent)" : "#fff",
                        border: "3px solid #121212",
                        borderRadius: "6px",
                        fontSize: "2rem",
                        fontWeight: "900",
                        color: "#fff",
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        boxSizing: "border-box",
                        cursor: isOnlineTurn && cell === null ? "pointer" : "default"
                      }}
                    >
                      {cell}
                    </button>
                  ))}
                </div>

                <button onClick={leaveQueueOrResign} className="neo-btn secondary" style={{ fontSize: "0.85rem" }}>RESIGN MATCH</button>
              </div>
            )}

            {status === "gameover" && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1.2rem" }}>
                <h2 style={{ fontFamily: "var(--font-game)", fontSize: "1.2rem", color: matchState.winner === user.email ? "var(--secondary-color)" : "var(--accent-color)" }}>
                  {matchState.winner === "DRAW" ? "🤝 DRAW MATCH!" : matchState.winner === user.email ? "🏆 YOU WON!" : "💀 YOU LOST!"}
                </h2>
                
                {matchState.rematchStatus && (
                  <div style={{ fontSize: "0.85rem", fontWeight: "800", color: "#666", padding: "0.2rem 0.6rem", border: "2px dashed #121212", borderRadius: "4px" }}>
                    {matchState.rematchStatus.me && !matchState.rematchStatus.opponent && "Waiting for opponent rematch decision..."}
                    {!matchState.rematchStatus.me && matchState.rematchStatus.opponent && "Opponent wants a rematch!"}
                    {matchState.rematchStatus.me && matchState.rematchStatus.opponent && "Rematch agreed! Starting..."}
                  </div>
                )}

                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", width: "100%", maxWidth: "250px" }}>
                  <button 
                    onClick={requestRematch} 
                    disabled={matchState.rematchStatus?.me}
                    className="neo-btn accent" 
                    style={{ justifyContent: "center", gap: "0.5rem" }}
                  >
                    <RefreshCcw size={16} /> 
                    {matchState.rematchStatus?.me ? "REMATCH REQUESTED" : "PLAY AGAIN"}
                  </button>
                  <button onClick={joinQueue} className="neo-btn secondary" style={{ justifyContent: "center" }}>
                    SEARCH NEW OPPONENT
                  </button>
                  <button onClick={() => { setArenaMode("lobby"); setStatus("idle"); }} className="neo-btn" style={{ justifyContent: "center", backgroundColor: "#ccc" }}>
                    EXIT TO LOBBY
                  </button>
                </div>
              </div>
            )}

          </div>

          {/* Leaders */}
          <div className="neo-card" style={{ display: "flex", flexDirection: "column", gap: "1rem", height: "fit-content" }}>
            <h3 style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "1.2rem" }}>
              <Trophy size={20} color="var(--primary-color)" /> TOP WINNERS
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {leaderboard.map((entry, idx) => (
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
                  <span>#{idx + 1} {entry.user_name}</span>
                  <span>{entry.score} wins</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bot Offline Gameplay */}
      {arenaMode === "bot" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: "1.5rem", width: "100%" }} className="game-layout-container">
          <div className="neo-card" style={{ display: "flex", flexDirection: "column", alignItems: "center", backgroundColor: "#faf6f0", minHeight: "420px", padding: "1.5rem", justifyContent: "center" }}>
            
            {!botWinner ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1.5rem", width: "100%" }}>
                
                {/* Visual active turn side HUD */}
                <div style={{ display: "flex", justifyContent: "space-between", width: "100%", maxWidth: "300px", fontSize: "0.85rem", alignItems: "center" }}>
                  <div style={botTurn === "player" ? activeStyle : inactiveStyle}>
                    You (X)
                  </div>
                  <span style={{ fontSize: "1.2rem", fontWeight: "900" }}>VS</span>
                  <div style={botTurn === "bot" ? activeStyle : inactiveStyle}>
                    Bot AI (O)
                  </div>
                </div>

                <div style={{ fontSize: "1rem", fontWeight: "800", color: botTurn === "player" ? "var(--secondary-color)" : "#666" }}>
                  {botTurn === "player" ? "👉 IT IS YOUR TURN!" : "⏳ Bot is thinking..."}
                </div>

                {/* Fixed Grid */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gridTemplateRows: "repeat(3, 1fr)",
                    gap: "8px",
                    width: "240px",
                    height: "240px",
                    border: "4px solid var(--border-color)",
                    padding: "8px",
                    backgroundColor: "var(--border-color)",
                    borderRadius: "8px",
                    boxSizing: "border-box"
                  }}
                >
                  {botBoard.map((cell, idx) => (
                    <button
                      key={idx}
                      onClick={() => handlePlayerGridClick(idx)}
                      disabled={botTurn !== "player" || cell !== null}
                      style={{
                        backgroundColor: cell === "X" ? "var(--accent-color)" : cell === "O" ? "var(--blue-accent)" : "#fff",
                        border: "3px solid #121212",
                        borderRadius: "6px",
                        fontSize: "2rem",
                        fontWeight: "900",
                        color: "#fff",
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        boxSizing: "border-box",
                        cursor: botTurn === "player" && cell === null ? "pointer" : "default"
                      }}
                    >
                      {cell}
                    </button>
                  ))}
                </div>

                <button onClick={() => setArenaMode("lobby")} className="neo-btn secondary" style={{ fontSize: "0.85rem" }}>RESIGN MATCH</button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1.2rem" }}>
                <h2 style={{ fontFamily: "var(--font-game)", fontSize: "1.2rem", color: botWinner === "X" ? "var(--secondary-color)" : botWinner === "O" ? "var(--accent-color)" : "inherit" }}>
                  {botWinner === "DRAW" ? "🤝 DRAW MATCH!" : botWinner === "X" ? "🏆 YOU WON!" : "💀 BOT WON!"}
                </h2>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", width: "100%", maxWidth: "250px" }}>
                  <button onClick={startBotGame} className="neo-btn accent" style={{ justifyContent: "center" }}>
                    PLAY AGAIN
                  </button>
                  <button onClick={() => setArenaMode("lobby")} className="neo-btn secondary" style={{ justifyContent: "center" }}>
                    BACK TO LOBBY
                  </button>
                </div>
              </div>
            )}

          </div>

          {/* Leaders */}
          <div className="neo-card" style={{ display: "flex", flexDirection: "column", gap: "1rem", height: "fit-content" }}>
            <h3 style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "1.2rem" }}>
              <Trophy size={20} color="var(--primary-color)" /> TOP WINNERS
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {leaderboard.map((entry, idx) => (
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
                  <span>#{idx + 1} {entry.user_name}</span>
                  <span>{entry.score} wins</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
