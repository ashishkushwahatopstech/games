import React, { useEffect, useState } from "react";
import { Gamepad2, ShieldAlert, LogIn, LogOut, Smartphone, Monitor } from "lucide-react";

// Components
import GameCard from "./components/GameCard";
import MobileOverlay from "./components/MobileOverlay";
import AdminPanel from "./components/AdminPanel";

// Games
import DinoDash from "./games/DinoDash";
import Stacker from "./games/Stacker";
import HexMerge from "./games/HexMerge";
import RetroSnake from "./games/RetroSnake";
import MemoryMatrix from "./games/MemoryMatrix";
import WordChase from "./games/WordChase";
import MinesweeperBlitz from "./games/MinesweeperBlitz";
import CyberClicker from "./games/CyberClicker";
import TicTacToeArena from "./games/TicTacToeArena";
import DualPong from "./games/DualPong";

// Configured local fallback lists of games
const FALLBACK_GAMES = [
  { id: "dino-dash", name: "Dino Dash", is_active: 1, is_mobile_friendly: 1 },
  { id: "stacker", name: "Stacker 3D", is_active: 1, is_mobile_friendly: 1 },
  { id: "hex-merge", name: "Hex Merge (2048)", is_active: 1, is_mobile_friendly: 1 },
  { id: "retro-snake", name: "Retro Snake", is_active: 1, is_mobile_friendly: 1 },
  { id: "memory-matrix", name: "Memory Matrix", is_active: 1, is_mobile_friendly: 1 },
  { id: "word-chase", name: "Word Chase", is_active: 1, is_mobile_friendly: 1 },
  { id: "minesweeper", name: "Minesweeper Blitz", is_active: 1, is_mobile_friendly: 1 },
  { id: "cyber-clicker", name: "Cyber Clicker", is_active: 1, is_mobile_friendly: 1 },
  { id: "tic-tac-toe-online", name: "Tic-Tac-Toe Arena (Online 1v1)", is_active: 1, is_mobile_friendly: 1 },
  { id: "dual-pong", name: "Dual Pong (Local 1v1)", is_active: 1, is_mobile_friendly: 1 }
];

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [activeGameId, setActiveGameId] = useState<string | null>(null);
  const [isAdminView, setIsAdminView] = useState(false);
  const [games, setGames] = useState<any[]>(FALLBACK_GAMES);
  const [leaderboards, setLeaderboards] = useState<{ [key: string]: any[] }>({});
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileOverlay, setShowMobileOverlay] = useState(false);
  const [pendingGameId, setPendingGameId] = useState<string | null>(null);
  
  // Login modal / Mock options state
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [mockEmail, setMockEmail] = useState("");
  const [loginError, setLoginError] = useState("");

  const backendUrl = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" 
    ? "http://127.0.0.1:8787" 
    : "https://play-backend.flowmaticai.workers.dev";

  // Check mobile viewport width
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Sync token and profile from local storage on launch
  useEffect(() => {
    const savedUser = localStorage.getItem("arcade_user");
    const savedToken = localStorage.getItem("arcade_token");
    if (savedUser && savedToken) {
      setUser(JSON.parse(savedUser));
      setToken(savedToken);
    }
  }, []);

  // Fetch games list and leaderboards
  const fetchGamesAndScores = async () => {
    try {
      const res = await fetch(`${backendUrl}/api/games`);
      if (res.ok) {
        const data = await res.json() as any;
        setGames(data);
      }
    } catch (e) {
      console.warn("Could not fetch games list from server, using local fallbacks.", e);
    }

    // Fetch leaderboards for each game
    FALLBACK_GAMES.forEach(async (g) => {
      try {
        const res = await fetch(`${backendUrl}/api/leaderboard/${g.id}`);
        if (res.ok) {
          const data = await res.json() as any;
          setLeaderboards(prev => ({ ...prev, [g.id]: data }));
        }
      } catch (e) {
        console.warn(`Could not fetch leaderboard for ${g.id}`);
      }
    });
  };

  useEffect(() => {
    fetchGamesAndScores();
  }, [backendUrl]);

  // Google Login Initialize
  useEffect(() => {
    const initGoogleAuth = () => {
      if (!(window as any).google) return;
      (window as any).google.accounts.id.initialize({
        client_id: "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com", // User updates this later
        callback: handleGoogleLoginResponse,
        cancel_on_tap_outside: true,
      });
    };

    // Retry in case SDK takes time to load
    const interval = setInterval(() => {
      if ((window as any).google) {
        initGoogleAuth();
        clearInterval(interval);
      }
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const handleGoogleLoginResponse = async (response: any) => {
    try {
      setLoginError("");
      const res = await fetch(`${backendUrl}/api/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: response.credential })
      });
      const data = await res.json() as any;
      if (data.error) {
        setLoginError(data.error);
        return;
      }
      setUser(data);
      setToken(response.credential);
      localStorage.setItem("arcade_user", JSON.stringify(data));
      localStorage.setItem("arcade_token", response.credential);
      setShowLoginModal(false);
      fetchGamesAndScores();
    } catch (e) {
      setLoginError("Failed to authenticate with backend server.");
    }
  };

  const handleMockLogin = async (email: string) => {
    setLoginError("");
    const mockCredential = `mock_${email.split("@")[0]}`;
    try {
      const res = await fetch(`${backendUrl}/api/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: mockCredential })
      });
      const data = await res.json() as any;
      if (data.error) {
        setLoginError(data.error);
        return;
      }
      setUser(data);
      setToken(mockCredential);
      localStorage.setItem("arcade_user", JSON.stringify(data));
      localStorage.setItem("arcade_token", mockCredential);
      setShowLoginModal(false);
      fetchGamesAndScores();
    } catch (e) {
      setLoginError("Could not connect to local test server.");
    }
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("arcade_user");
    localStorage.removeItem("arcade_token");
    setIsAdminView(false);
  };

  // Launch game checking mobile limitations
  const handlePlayGame = (gameId: string) => {
    const selected = games.find(g => g.id === gameId);
    if (!selected) return;

    if (isMobile && !selected.is_mobile_friendly) {
      setPendingGameId(gameId);
      setShowMobileOverlay(true);
    } else {
      setActiveGameId(gameId);
    }
  };

  const confirmPlayAnyway = () => {
    if (pendingGameId) {
      setActiveGameId(pendingGameId);
      setPendingGameId(null);
    }
    setShowMobileOverlay(false);
  };

  const submitScore = async (score: number) => {
    if (!token || !activeGameId) return;
    try {
      await fetch(`${backendUrl}/api/leaderboard/${activeGameId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ score })
      });
    } catch (e) {
      console.error("Score submission failed", e);
    }
  };

  const refreshLeaderboard = async () => {
    if (!activeGameId) return;
    try {
      const res = await fetch(`${backendUrl}/api/leaderboard/${activeGameId}`);
      if (res.ok) {
        const data = await res.json() as any;
        setLeaderboards(prev => ({ ...prev, [activeGameId]: data }));
      }
    } catch (e) {
      console.warn("Could not reload score");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      {/* Dynamic Styled Header */}
      <header style={{ borderBottom: "3px solid #121212", backgroundColor: "#fff", padding: "1rem 0" }}>
        <div className="container" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          
          {/* Logo */}
          <div 
            onClick={() => { setActiveGameId(null); setIsAdminView(false); }}
            style={{ 
              display: "flex", 
              alignItems: "center", 
              gap: "0.5rem", 
              cursor: "pointer", 
              fontFamily: "var(--font-game)", 
              fontSize: "0.85rem",
              fontWeight: "bold"
            }}
          >
            <Gamepad2 size={24} /> ARCADE.STUDIO
          </div>

          {/* User Section / Actions */}
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
            {user ? (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <img 
                    src={user.picture || "https://api.dicebear.com/7.x/pixel-art/svg"} 
                    alt={user.name} 
                    style={{ width: "32px", height: "32px", borderRadius: "50%", border: "2px solid #121212" }}
                  />
                  <span style={{ fontWeight: "800", fontSize: "0.9rem" }}>{user.name}</span>
                </div>
                {user.isAdmin && (
                  <button 
                    onClick={() => { setIsAdminView(!isAdminView); setActiveGameId(null); }} 
                    className="neo-btn secondary"
                    style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem" }}
                  >
                    <ShieldAlert size={14} /> {isAdminView ? "DASHBOARD" : "ADMIN PANEL"}
                  </button>
                )}
                <button 
                  onClick={handleLogout} 
                  className="neo-btn" 
                  style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem" }}
                >
                  <LogOut size={14} /> LOGOUT
                </button>
              </>
            ) : (
              <button 
                onClick={() => setShowLoginModal(true)} 
                className="neo-btn accent"
                style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem" }}
              >
                <LogIn size={14} /> SIGN IN
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="container" style={{ flex: 1, padding: "2rem 1.5rem" }}>
        {isAdminView ? (
          <AdminPanel 
            onBack={() => setIsAdminView(false)} 
            token={token} 
            backendUrl={backendUrl} 
          />
        ) : activeGameId ? (
          /* Render Active Game */
          <div className="game-wrapper-inner">
            {activeGameId === "dino-dash" && (
              <DinoDash 
                onBack={() => setActiveGameId(null)} 
                user={user} 
                submitScore={submitScore} 
                leaderboard={leaderboards[activeGameId] || []}
                refreshLeaderboard={refreshLeaderboard}
              />
            )}
            {activeGameId === "stacker" && (
              <Stacker 
                onBack={() => setActiveGameId(null)} 
                user={user} 
                submitScore={submitScore} 
                leaderboard={leaderboards[activeGameId] || []}
                refreshLeaderboard={refreshLeaderboard}
              />
            )}
            {activeGameId === "hex-merge" && (
              <HexMerge 
                onBack={() => setActiveGameId(null)} 
                user={user} 
                submitScore={submitScore} 
                leaderboard={leaderboards[activeGameId] || []}
                refreshLeaderboard={refreshLeaderboard}
              />
            )}
            {activeGameId === "retro-snake" && (
              <RetroSnake 
                onBack={() => setActiveGameId(null)} 
                user={user} 
                submitScore={submitScore} 
                leaderboard={leaderboards[activeGameId] || []}
                refreshLeaderboard={refreshLeaderboard}
              />
            )}
            {activeGameId === "memory-matrix" && (
              <MemoryMatrix 
                onBack={() => setActiveGameId(null)} 
                user={user} 
                submitScore={submitScore} 
                leaderboard={leaderboards[activeGameId] || []}
                refreshLeaderboard={refreshLeaderboard}
              />
            )}
            {activeGameId === "word-chase" && (
              <WordChase 
                onBack={() => setActiveGameId(null)} 
                user={user} 
                submitScore={submitScore} 
                leaderboard={leaderboards[activeGameId] || []}
                refreshLeaderboard={refreshLeaderboard}
              />
            )}
            {activeGameId === "minesweeper" && (
              <MinesweeperBlitz 
                onBack={() => setActiveGameId(null)} 
                user={user} 
                submitScore={submitScore} 
                leaderboard={leaderboards[activeGameId] || []}
                refreshLeaderboard={refreshLeaderboard}
              />
            )}
            {activeGameId === "cyber-clicker" && (
              <CyberClicker 
                onBack={() => setActiveGameId(null)} 
                user={user} 
                submitScore={submitScore} 
                leaderboard={leaderboards[activeGameId] || []}
                refreshLeaderboard={refreshLeaderboard}
              />
            )}
            {activeGameId === "tic-tac-toe-online" && (
              <TicTacToeArena 
                onBack={() => setActiveGameId(null)} 
                user={user} 
                backendUrl={backendUrl}
                token={token}
                triggerLogin={() => setShowLoginModal(true)}
                leaderboard={leaderboards[activeGameId] || []}
                refreshLeaderboard={refreshLeaderboard}
              />
            )}
            {activeGameId === "dual-pong" && (
              <DualPong onBack={() => setActiveGameId(null)} />
            )}
          </div>
        ) : (
          /* Dashboard Home (List Games) */
          <div>
            <div style={{ marginBottom: "2rem" }}>
              <h1 style={{ fontSize: "2.2rem", fontWeight: "900", marginBottom: "0.5rem" }}>
                Lightweight Arcade Lounge
              </h1>
              <p style={{ color: "#666", fontWeight: "600" }}>
                Play quick casual games instantly on the web, track highscores, or challenge players.
              </p>
            </div>

            <div 
              style={{ 
                display: "grid", 
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", 
                gap: "1.5rem" 
              }}
            >
              {games.map(game => (
                <GameCard 
                  key={game.id} 
                  game={game} 
                  topScore={leaderboards[game.id]?.[0]?.score}
                  onPlay={handlePlayGame} 
                />
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer style={{ borderTop: "3px solid #121212", backgroundColor: "#fff", padding: "1.5rem 0", marginTop: "auto" }}>
        <div className="container" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.85rem", fontWeight: "700" }}>
          <div>© 2026 Arcade Studio - Built for play.aktechstudio.com</div>
          <div style={{ display: "flex", gap: "1rem" }}>
            <span style={{ display: "flex", alignItems: "center", gap: "0.2rem" }}><Smartphone size={14} /> Mobile Compatible</span>
            <span style={{ display: "flex", alignItems: "center", gap: "0.2rem" }}><Monitor size={14} /> Desktop Standard</span>
          </div>
        </div>
      </footer>

      {/* Mobile Alert Overlay */}
      {showMobileOverlay && (
        <MobileOverlay 
          onCancel={() => setShowMobileOverlay(false)} 
          onConfirm={confirmPlayAnyway} 
        />
      )}

      {/* Sign In Overlay Modal */}
      {showLoginModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <h3 style={{ fontSize: "1.4rem", fontWeight: "800" }}>Sign In to Profile</h3>
            
            {loginError && (
              <div style={{ color: "var(--accent-color)", border: "2px solid #121212", background: "#ffeef0", padding: "0.5rem", borderRadius: "4px", fontWeight: "700", fontSize: "0.85rem" }}>
                {loginError}
              </div>
            )}

            {/* Standard Google login placeholder button container */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <div style={{ fontWeight: "700", fontSize: "0.9rem", color: "#666" }}>Google Identity Auth</div>
              <div id="google-login-btn-container" style={{ display: "flex", justifyContent: "center", padding: "0.5rem", border: "2px dashed #ccc" }}>
                {/* Fallback description in case google script takes time to load */}
                <div className="g_id_signin" data-type="standard">Google Login button renders here</div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <div style={{ flex: 1, height: "1px", backgroundColor: "#ccc" }}></div>
              <div style={{ fontSize: "0.75rem", color: "#888", fontWeight: "700" }}>OR LOCAL TEST LOGIN</div>
              <div style={{ flex: 1, height: "1px", backgroundColor: "#ccc" }}></div>
            </div>

            {/* Mock Login options for easy testing */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <button 
                onClick={() => handleMockLogin("ashishkushwaha88643@gmail.com")} 
                className="neo-btn accent"
                style={{ width: "100%", justifyContent: "center" }}
              >
                Mock Admin Login
              </button>
              <button 
                onClick={() => handleMockLogin("testplayer")} 
                className="neo-btn secondary"
                style={{ width: "100%", justifyContent: "center" }}
              >
                Mock Player Login
              </button>
            </div>

            <button 
              onClick={() => setShowLoginModal(false)} 
              className="neo-btn" 
              style={{ width: "100%", justifyContent: "center", backgroundColor: "#ccc" }}
            >
              CLOSE
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
