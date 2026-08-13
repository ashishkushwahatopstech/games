import { StrictMode, useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import '../index.css'
import PageLayout from '../components/PageLayout'
import CyberClicker from '../games/CyberClicker'

function ClickerPage() {
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

    fetch(`${backendUrl}/api/leaderboard/cyber-clicker`)
      .then(res => res.ok ? res.json() : [])
      .then((data: any) => setLeaderboard(data))
      .catch(e => console.warn(e));
  }, []);

  const submitScore = async (score: number) => {
    if (!token) return;
    try {
      await fetch(`${backendUrl}/api/leaderboard/cyber-clicker`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ score })
      });
    } catch (e) {
      console.error(e);
    }
  };

  const refreshLeaderboard = () => {
    fetch(`${backendUrl}/api/leaderboard/cyber-clicker`)
      .then(res => res.ok ? res.json() : [])
      .then((data: any) => setLeaderboard(data))
      .catch(e => console.warn(e));
  };

  return (
    <PageLayout pageTitle="Cyber Clicker">
      <CyberClicker 
        onBack={() => { window.location.href = "/"; }} 
        user={user} 
        submitScore={submitScore} 
        leaderboard={leaderboard} 
        refreshLeaderboard={refreshLeaderboard} 
      />
    </PageLayout>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ClickerPage />
  </StrictMode>,
)
