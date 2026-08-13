import React, { useEffect, useState } from "react";
import { Gamepad2, Smartphone, Monitor } from "lucide-react";

// Components
import GameCard from "./components/GameCard";
import MobileOverlay from "./components/MobileOverlay";
import PageLayout from "./components/PageLayout";

// Configured local fallback lists of games
const FALLBACK_GAMES = [
  { id: "dino-dash", name: "Dino Dash", is_active: 1, is_mobile_friendly: 1, url: "/dino.html" },
  { id: "stacker", name: "Stacker 3D", is_active: 1, is_mobile_friendly: 1, url: "/stacker.html" },
  { id: "hex-merge", name: "Hex Merge (2048)", is_active: 1, is_mobile_friendly: 1, url: "/hexmerge.html" },
  { id: "retro-snake", name: "Retro Snake", is_active: 1, is_mobile_friendly: 1, url: "/snake.html" },
  { id: "memory-matrix", name: "Memory Matrix", is_active: 1, is_mobile_friendly: 1, url: "/memory.html" },
  { id: "word-chase", name: "Word Chase", is_active: 1, is_mobile_friendly: 1, url: "/wordchase.html" },
  { id: "minesweeper", name: "Minesweeper Blitz", is_active: 1, is_mobile_friendly: 1, url: "/minesweeper.html" },
  { id: "cyber-clicker", name: "Cyber Clicker", is_active: 1, is_mobile_friendly: 1, url: "/clicker.html" },
  { id: "tic-tac-toe-online", name: "Tic-Tac-Toe Arena (Online 1v1)", is_active: 1, is_mobile_friendly: 1, url: "/tictactoe.html" },
  { id: "dual-pong", name: "Dual Pong (Local 1v1)", is_active: 1, is_mobile_friendly: 1, url: "/pong.html" }
];

export default function App() {
  const [games, setGames] = useState<any[]>(FALLBACK_GAMES);
  const [leaderboards, setLeaderboards] = useState<{ [key: string]: any[] }>({});
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileOverlay, setShowMobileOverlay] = useState(false);
  const [pendingGameUrl, setPendingGameUrl] = useState<string | null>(null);

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

  // Fetch games list and leaderboards
  const fetchGamesAndScores = async () => {
    try {
      const res = await fetch(`${backendUrl}/api/games`);
      if (res.ok) {
        const data = await res.json() as any;
        // Merge the URLs to fetched game config
        const merged = data.map((item: any) => {
          const matched = FALLBACK_GAMES.find(g => g.id === item.id);
          return { ...item, url: matched ? matched.url : "/" };
        });
        setGames(merged);
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

  // Launch game checking mobile limitations
  const handlePlayGame = (gameId: string) => {
    const selected = games.find(g => g.id === gameId);
    if (!selected) return;

    if (isMobile && !selected.is_mobile_friendly) {
      setPendingGameUrl(selected.url);
      setShowMobileOverlay(true);
    } else {
      window.location.href = selected.url;
    }
  };

  const confirmPlayAnyway = () => {
    if (pendingGameUrl) {
      window.location.href = pendingGameUrl;
      setPendingGameUrl(null);
    }
    setShowMobileOverlay(false);
  };

  return (
    <PageLayout>
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

      {/* Mobile Alert Overlay */}
      {showMobileOverlay && (
        <MobileOverlay 
          onCancel={() => setShowMobileOverlay(false)} 
          onConfirm={confirmPlayAnyway} 
        />
      )}
    </PageLayout>
  );
}
