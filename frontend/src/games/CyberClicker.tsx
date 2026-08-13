import React, { useState, useEffect } from "react";
import { Trophy, Cpu, Zap, ShoppingCart, ArrowLeft, RefreshCw } from "lucide-react";

interface CyberClickerProps {
  onBack: () => void;
  user: any;
  submitScore: (score: number) => Promise<void>;
  leaderboard: any[];
  refreshLeaderboard: () => void;
}

interface Upgrade {
  id: string;
  name: string;
  cost: number;
  cps: number; // clicks/energy per second
  count: number;
  icon: string;
}

export default function CyberClicker({ onBack, user, submitScore, leaderboard, refreshLeaderboard }: CyberClickerProps) {
  const [energy, setEnergy] = useState(0);
  const [totalMined, setTotalMined] = useState(0);
  const [upgrades, setUpgrades] = useState<Upgrade[]>([
    { id: "cpu", name: "Thread Core", cost: 15, cps: 0.2, count: 0, icon: "💻" },
    { id: "miner", name: "Auto-Miner", cost: 100, cps: 1, count: 0, icon: "🤖" },
    { id: "solar", name: "Solar Grid", cost: 1100, cps: 8, count: 0, icon: "☀️" },
    { id: "fusion", name: "Fusion Node", cost: 12000, cps: 47, count: 0, icon: "⚡" }
  ]);

  const [cps, setCps] = useState(0);
  const [autosaveMessage, setAutosaveMessage] = useState("");

  // Calculate current CPS
  useEffect(() => {
    const totalCps = upgrades.reduce((acc, curr) => acc + curr.cps * curr.count, 0);
    setCps(Number(totalCps.toFixed(1)));
  }, [upgrades]);

  // Main game tick (updates energy per second)
  useEffect(() => {
    const interval = setInterval(() => {
      if (cps > 0) {
        setEnergy(prev => prev + cps / 10);
        setTotalMined(prev => prev + cps / 10);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [cps]);

  // Autosave and leaderboard submission every 10 seconds if user logged in
  useEffect(() => {
    if (!user) return;
    const saveInterval = setInterval(async () => {
      const currentScore = Math.floor(totalMined);
      if (currentScore > 0) {
        setAutosaveMessage("Autosaving...");
        try {
          await submitScore(currentScore);
          refreshLeaderboard();
          setAutosaveMessage("Progress Saved!");
          setTimeout(() => setAutosaveMessage(""), 2000);
        } catch (e) {
          setAutosaveMessage("Save failed");
          setTimeout(() => setAutosaveMessage(""), 2000);
        }
      }
    }, 10000);

    return () => clearInterval(saveInterval);
  }, [totalMined, user]);

  const handleNodeClick = () => {
    setEnergy(prev => prev + 1);
    setTotalMined(prev => prev + 1);
  };

  const buyUpgrade = (upgradeId: string) => {
    setUpgrades(prevUpgrades =>
      prevUpgrades.map(up => {
        if (up.id === upgradeId && energy >= up.cost) {
          setEnergy(energy - up.cost);
          return {
            ...up,
            count: up.count + 1,
            cost: Math.floor(up.cost * 1.15) // increase cost by 15%
          };
        }
        return up;
      })
    );
  };

  const resetGame = () => {
    setEnergy(0);
    setTotalMined(0);
    setUpgrades([
      { id: "cpu", name: "Thread Core", cost: 15, cps: 0.2, count: 0, icon: "💻" },
      { id: "miner", name: "Auto-Miner", cost: 100, cps: 1, count: 0, icon: "🤖" },
      { id: "solar", name: "Solar Grid", cost: 1100, cps: 8, count: 0, icon: "☀️" },
      { id: "fusion", name: "Fusion Node", cost: 12000, cps: 47, count: 0, icon: "⚡" }
    ]);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button onClick={onBack} className="neo-btn secondary" style={{ padding: "0.5rem 1rem" }}>
          <ArrowLeft size={18} /> BACK
        </button>
        <h2 className="game-title-text" style={{ fontSize: "1rem" }}>CYBER CLICKER</h2>
        <button onClick={resetGame} className="neo-btn" style={{ padding: "0.5rem" }}>
          <RefreshCw size={18} />
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: "1.5rem", width: "100%" }} className="game-layout-container">
        {/* Play Panel */}
        <div className="neo-card" style={{ display: "flex", flexDirection: "column", alignItems: "center", backgroundColor: "#faf6f0", minHeight: "420px", padding: "2rem", justifyContent: "space-between" }}>
          
          <div style={{ textAlign: "center" }}>
            <h1 style={{ fontSize: "2.5rem", fontWeight: "900", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
              <Zap color="var(--primary-color)" size={36} fill="var(--primary-color)" /> {Math.floor(energy)}
            </h1>
            <p style={{ fontWeight: "700", color: "#666" }}>ENERGY CORES</p>
            <p style={{ fontWeight: "800", color: "var(--secondary-color)" }}>+{cps} / second</p>
            
            {user && (
              <div style={{ fontSize: "0.8rem", color: "#888", marginTop: "0.5rem", height: "18px", fontWeight: "700" }}>
                {autosaveMessage || "Score is backed up to leaderboard every 10s"}
              </div>
            )}
          </div>

          {/* Core Energy Node (Big button) */}
          <button
            onClick={handleNodeClick}
            className="neo-card"
            style={{
              width: "150px",
              height: "150px",
              borderRadius: "50%",
              backgroundColor: "var(--primary-color)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              border: "5px solid var(--border-color)",
              cursor: "pointer",
              boxShadow: "6px 6px 0px 0px var(--border-color)",
              outline: "none"
            }}
          >
            <Cpu size={72} color="var(--border-color)" />
          </button>

          <div style={{ width: "100%", borderTop: "2px solid #ddd", paddingTop: "1rem" }}>
            <div style={{ fontSize: "0.9rem", fontWeight: "800" }}>TOTAL ENERGY HARVESTED: {Math.floor(totalMined)}</div>
          </div>
        </div>

        {/* Upgrades Store Panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* Shop */}
          <div className="neo-card" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <h3 style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "1.1rem" }}>
              <ShoppingCart size={20} /> CORE SHOP
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {upgrades.map(up => (
                <button
                  key={up.id}
                  onClick={() => buyUpgrade(up.id)}
                  disabled={energy < up.cost}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "0.5rem",
                    border: "3px solid var(--border-color)",
                    borderRadius: "6px",
                    backgroundColor: energy >= up.cost ? "#fff" : "#f1ede6",
                    cursor: energy >= up.cost ? "pointer" : "not-allowed",
                    textAlign: "left",
                    width: "100%",
                    boxShadow: energy >= up.cost ? "3px 3px 0px #121212" : "none",
                    transform: energy >= up.cost ? "none" : "translate(2px, 2px)"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <span style={{ fontSize: "1.5rem" }}>{up.icon}</span>
                    <div>
                      <div style={{ fontWeight: "800", fontSize: "0.85rem" }}>{up.name} ({up.count})</div>
                      <div style={{ fontSize: "0.75rem", color: "#666", fontWeight: "700" }}>+{up.cps} CPS</div>
                    </div>
                  </div>
                  <div style={{ fontWeight: "800", color: energy >= up.cost ? "var(--secondary-color)" : "#888" }}>
                    {up.cost} ⚡
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Highscores */}
          <div className="neo-card" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <h3 style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "1.1rem" }}>
              <Trophy size={18} color="var(--primary-color)" /> LEADERBOARD
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {leaderboard.length === 0 ? (
                <p style={{ color: "#666", fontSize: "0.8rem" }}>No backups yet. Save automatically by playing!</p>
              ) : (
                leaderboard.map((entry, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "0.4rem",
                      border: "2px solid var(--border-color)",
                      borderRadius: "4px",
                      backgroundColor: idx === 0 ? "var(--primary-color)" : "#fff",
                      fontWeight: "700",
                      fontSize: "0.8rem"
                    }}
                  >
                    <span style={{ display: "flex", gap: "0.4rem" }}>
                      <span>#{idx + 1}</span>
                      <span style={{ maxWidth: "120px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {entry.user_name}
                      </span>
                    </span>
                    <span>{entry.score} ⚡</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
