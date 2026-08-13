import React, { useState, useEffect } from "react";
import { Users, Gamepad2, ShieldAlert, ArrowLeft, RefreshCw } from "lucide-react";

interface AdminPanelProps {
  onBack: () => void;
  token: string | null;
  backendUrl: string;
}

export default function AdminPanel({ onBack, token, backendUrl }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<"games" | "users">("games");
  const [usersList, setUsersList] = useState<any[]>([]);
  const [gamesList, setGamesList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const fetchData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      if (activeTab === "users") {
        const res = await fetch(`${backendUrl}/api/admin/users`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json() as any;
        if (data.error) setMessage(data.error);
        else setUsersList(data);
      } else {
        const res = await fetch(`${backendUrl}/api/admin/games`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json() as any;
        if (data.error) setMessage(data.error);
        else setGamesList(data);
      }
    } catch (e) {
      setMessage("Server connection failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab, token]);

  const toggleGameStatus = async (gameId: string, currentActive: boolean) => {
    if (!token) return;
    try {
      const res = await fetch(`${backendUrl}/api/admin/games/${encodeURIComponent(gameId)}/toggle`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ is_active: !currentActive })
      });
      const data = await res.json() as any;
      if (data.success) {
        setGamesList(prev =>
          prev.map(g => (g.id === gameId ? { ...g, is_active: currentActive ? 0 : 1 } : g))
        );
      }
    } catch (e) {
      setMessage("Toggle failed");
    }
  };

  const toggleMobileFriendly = async (gameId: string, currentFriendly: boolean) => {
    if (!token) return;
    try {
      const res = await fetch(`${backendUrl}/api/admin/games/${encodeURIComponent(gameId)}/toggle-mobile`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ is_mobile_friendly: !currentFriendly })
      });
      const data = await res.json() as any;
      if (data.success) {
        setGamesList(prev =>
          prev.map(g => (g.id === gameId ? { ...g, is_mobile_friendly: currentFriendly ? 0 : 1 } : g))
        );
      }
    } catch (e) {
      setMessage("Toggle failed");
    }
  };

  const suspendUser = async (userEmail: string, currentSuspended: boolean) => {
    if (!token) return;
    try {
      const res = await fetch(`${backendUrl}/api/admin/users/${encodeURIComponent(userEmail)}/suspend`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ suspend: !currentSuspended })
      });
      const data = await res.json() as any;
      if (data.success) {
        setUsersList(prev =>
          prev.map(u => (u.email === userEmail ? { ...u, is_suspended: currentSuspended ? 0 : 1 } : u))
        );
      }
    } catch (e) {
      setMessage("User suspension toggle failed");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button onClick={onBack} className="neo-btn secondary" style={{ padding: "0.5rem 1rem" }}>
          <ArrowLeft size={18} /> BACK
        </button>
        <h2 style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <ShieldAlert size={24} color="var(--accent-color)" /> ADMIN PANEL
        </h2>
        <button onClick={fetchData} className="neo-btn" style={{ padding: "0.5rem" }} disabled={loading}>
          <RefreshCw size={18} />
        </button>
      </div>

      {message && (
        <div style={{ padding: "0.8rem", border: "2px solid #121212", background: "var(--accent-color)", color: "#fff", fontWeight: "800", borderRadius: "4px" }}>
          {message}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button
          onClick={() => setActiveTab("games")}
          className={`neo-btn ${activeTab === "games" ? "accent" : "secondary"}`}
          style={{ padding: "0.5rem 1rem" }}
        >
          <Gamepad2 size={16} /> GAME LIST
        </button>
        <button
          onClick={() => setActiveTab("users")}
          className={`neo-btn ${activeTab === "users" ? "accent" : "secondary"}`}
          style={{ padding: "0.5rem 1rem" }}
        >
          <Users size={16} /> USER ACCOUNTS
        </button>
      </div>

      {/* Content */}
      <div className="neo-card">
        {loading ? (
          <p style={{ fontWeight: "700" }}>Loading admin data...</p>
        ) : activeTab === "games" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <h3 style={{ fontWeight: "800", fontSize: "1.2rem", marginBottom: "0.5rem" }}>Manage Game Availability</h3>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                <thead>
                  <tr style={{ borderBottom: "3px solid #121212" }}>
                    <th style={{ padding: "0.5rem", fontWeight: "800" }}>GAME NAME</th>
                    <th style={{ padding: "0.5rem", fontWeight: "800" }}>ACTIVE STATUS</th>
                    <th style={{ padding: "0.5rem", fontWeight: "800" }}>MOBILE-FRIENDLY</th>
                  </tr>
                </thead>
                <tbody>
                  {gamesList.map(game => (
                    <tr key={game.id} style={{ borderBottom: "1px solid #ddd" }}>
                      <td style={{ padding: "0.75rem 0.5rem", fontWeight: "700" }}>{game.name}</td>
                      <td style={{ padding: "0.75rem 0.5rem" }}>
                        <label className="switch">
                          <input
                            type="checkbox"
                            checked={!!game.is_active}
                            onChange={() => toggleGameStatus(game.id, !!game.is_active)}
                          />
                          <span className="slider"></span>
                        </label>
                      </td>
                      <td style={{ padding: "0.75rem 0.5rem" }}>
                        <label className="switch">
                          <input
                            type="checkbox"
                            checked={!!game.is_mobile_friendly}
                            onChange={() => toggleMobileFriendly(game.id, !!game.is_mobile_friendly)}
                          />
                          <span className="slider"></span>
                        </label>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <h3 style={{ fontWeight: "800", fontSize: "1.2rem", marginBottom: "0.5rem" }}>Registered User Profiles</h3>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                <thead>
                  <tr style={{ borderBottom: "3px solid #121212" }}>
                    <th style={{ padding: "0.5rem", fontWeight: "800" }}>AVATAR</th>
                    <th style={{ padding: "0.5rem", fontWeight: "800" }}>NAME</th>
                    <th style={{ padding: "0.5rem", fontWeight: "800" }}>EMAIL</th>
                    <th style={{ padding: "0.5rem", fontWeight: "800" }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {usersList.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ padding: "1rem 0", color: "#666", fontWeight: "600" }}>
                        No players registered yet.
                      </td>
                    </tr>
                  ) : (
                    usersList.map(account => (
                      <tr key={account.email} style={{ borderBottom: "1px solid #ddd" }}>
                        <td style={{ padding: "0.5rem" }}>
                          <img
                            src={account.picture || "https://api.dicebear.com/7.x/pixel-art/svg"}
                            alt=""
                            style={{ width: "32px", height: "32px", borderRadius: "50%", border: "2px solid #121212" }}
                          />
                        </td>
                        <td style={{ padding: "0.5rem", fontWeight: "700" }}>{account.name}</td>
                        <td style={{ padding: "0.5rem", fontWeight: "600", color: "#666" }}>{account.email}</td>
                        <td style={{ padding: "0.5rem" }}>
                          <button
                            onClick={() => suspendUser(account.email, !!account.is_suspended)}
                            className={`neo-btn ${account.is_suspended ? "secondary" : "accent"}`}
                            style={{ padding: "0.3rem 0.6rem", fontSize: "0.8rem", textTransform: "none" }}
                          >
                            {account.is_suspended ? "Unsuspend Player" : "Suspend Player"}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
