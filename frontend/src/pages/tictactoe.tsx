import { StrictMode, useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import '../index.css'
import PageLayout from '../components/PageLayout'
import TicTacToeArena from '../games/TicTacToeArena'

import GameGuide from '../components/GameGuide'

function TicTacToePage() {
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

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
        triggerLogin={() => window.dispatchEvent(new CustomEvent("trigger-login-modal"))}
        leaderboard={leaderboard} 
        refreshLeaderboard={refreshLeaderboard} 
      />
      <GameGuide gameId="tic-tac-toe-online" />
    </PageLayout>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TicTacToePage />
  </StrictMode>,
)
