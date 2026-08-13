import { StrictMode, useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import '../index.css'
import PageLayout from '../components/PageLayout'
import TicTacToeArena from '../games/TicTacToeArena'

function TicTacToePage() {
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [showLoginModal, setShowLoginModal] = useState(false);

  const backendUrl = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" 
    ? "http://127.0.0.1:8787" 
    : "https://play-backend.flowmaticai.workers.dev";

  useEffect(() => {
    const savedUser = localStorage.getItem("arcade_user");
    const savedToken = localStorage.getItem("arcade_token");
    if (savedUser && savedToken) {
      setUser(JSON.parse(savedUser));
      setToken(savedToken);
    }

    fetch(`${backendUrl}/api/leaderboard/tic-tac-toe-online`)
      .then(res => res.ok ? res.json() : [])
      .then((data: any) => setLeaderboard(data))
      .catch(e => console.warn(e));
  }, []);

  const refreshLeaderboard = () => {
    fetch(`${backendUrl}/api/leaderboard/tic-tac-toe-online`)
      .then(res => res.ok ? res.json() : [])
      .then((data: any) => setLeaderboard(data))
      .catch(e => console.warn(e));
  };

  return (
    <PageLayout pageTitle="Tic-Tac-Toe Arena">
      <TicTacToeArena 
        onBack={() => { window.location.href = "/"; }} 
        user={user} 
        backendUrl={backendUrl}
        token={token}
        triggerLogin={() => setShowLoginModal(true)}
        leaderboard={leaderboard} 
        refreshLeaderboard={refreshLeaderboard} 
      />

      {showLoginModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <h3 style={{ fontSize: "1.4rem", fontWeight: "800" }}>Sign In to Profile</h3>
            <p style={{ color: "#666", fontWeight: "600", fontSize: "0.9rem" }}>
              Please sign in using the header buttons at the top right to start playing.
            </p>
            <button 
              onClick={() => setShowLoginModal(false)} 
              className="neo-btn" 
              style={{ width: "100%", justifyContent: "center" }}
            >
              CLOSE
            </button>
          </div>
        </div>
      )}
    </PageLayout>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TicTacToePage />
  </StrictMode>,
)
