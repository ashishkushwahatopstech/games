import React, { useState, useEffect } from "react";
import { Gamepad2, ShieldAlert, LogIn, LogOut, Smartphone, Monitor } from "lucide-react";

interface PageLayoutProps {
  children: React.ReactNode;
  pageTitle?: string;
}

export default function PageLayout({ children, pageTitle }: PageLayoutProps) {
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [guestNickname, setGuestNickname] = useState("");
  const [loginError, setLoginError] = useState("");

  const backendUrl = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" 
    ? "http://127.0.0.1:8787" 
    : "https://play-backend.flowmaticai.workers.dev";

  // Sync token and profile from local storage on launch or initialize guest profile
  useEffect(() => {
    const savedUser = localStorage.getItem("arcade_user");
    const savedToken = localStorage.getItem("arcade_token");
    if (savedUser && savedToken) {
      const parsed = JSON.parse(savedUser);
      setUser(parsed);
      setToken(savedToken);
      if (parsed.isGuest) {
        setGuestNickname(parsed.name);
      }
    } else {
      // Auto-generate guest profile immediately
      const randomSeed = Math.random().toString(36).substring(2, 7).toUpperCase();
      const guestId = `guest_${randomSeed}_${Date.now().toString(36)}`;
      const defaultName = `Guest_${randomSeed}`;
      
      // Post to backend to save guest in D1
      fetch(`${backendUrl}/api/auth/guest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestId, nickname: defaultName })
      })
        .then(res => res.json())
        .then((data: any) => {
          if (!data.error) {
            setUser(data);
            setToken(guestId);
            setGuestNickname(data.name);
            localStorage.setItem("arcade_user", JSON.stringify(data));
            localStorage.setItem("arcade_token", guestId);
          }
        })
        .catch(e => console.warn("Guest generation failed", e));
    }
  }, [backendUrl]);

  // Google Login Initialize
  useEffect(() => {
    const initGoogleAuth = () => {
      if (!(window as any).google) return;
      (window as any).google.accounts.id.initialize({
        client_id: "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com",
        callback: handleGoogleLoginResponse,
        cancel_on_tap_outside: true,
      });
    };

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
      window.location.reload();
    } catch (e) {
      setLoginError("Failed to authenticate with backend server.");
    }
  };

  const handleUpdateGuestProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestNickname.trim() || !token || !token.startsWith("guest_")) return;

    try {
      setLoginError("");
      const res = await fetch(`${backendUrl}/api/auth/guest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestId: token, nickname: guestNickname.trim() })
      });
      const data = await res.json() as any;
      if (data.error) {
        setLoginError(data.error);
        return;
      }
      setUser(data);
      localStorage.setItem("arcade_user", JSON.stringify(data));
      setShowLoginModal(false);
      window.location.reload();
    } catch (err) {
      setLoginError("Could not update guest profile.");
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
      window.location.reload();
    } catch (e) {
      setLoginError("Could not connect to local test server.");
    }
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("arcade_user");
    localStorage.removeItem("arcade_token");
    window.location.href = "/";
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      {/* Header */}
      <header style={{ borderBottom: "3px solid #121212", backgroundColor: "#fff", padding: "1rem 0" }}>
        <div className="container" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          
          <a 
            href="/"
            style={{ 
              display: "flex", 
              alignItems: "center", 
              gap: "0.5rem", 
              fontFamily: "var(--font-game)", 
              fontSize: "0.85rem",
              fontWeight: "bold",
              textDecoration: "none",
              color: "inherit"
            }}
          >
            <Gamepad2 size={24} /> ARCADE<span className="mobile-hide">.STUDIO</span>
          </a>

          {pageTitle && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }} className="mobile-hide">
              <span style={{ fontSize: "1.2rem", fontWeight: "900", textTransform: "uppercase" }}>/ {pageTitle}</span>
            </div>
          )}

          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
            {user ? (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <img 
                    src={user.picture || "https://api.dicebear.com/7.x/pixel-art/svg"} 
                    alt="" 
                    style={{ width: "32px", height: "32px", borderRadius: "50%", border: "2px solid #121212" }}
                  />
                  <span style={{ fontWeight: "800", fontSize: "0.9rem" }} className="mobile-hide">{user.name}</span>
                  {user.isGuest && (
                    <span 
                      onClick={() => setShowLoginModal(true)} 
                      style={{ fontSize: "0.75rem", background: "var(--primary-color)", padding: "0.1rem 0.4rem", border: "2px solid #121212", borderRadius: "4px", fontWeight: "800", cursor: "pointer" }}
                    >
                      GUEST
                    </span>
                  )}
                </div>
                {user.isAdmin && (
                  <a 
                    href="/admin.html"
                    className="neo-btn secondary"
                    style={{ padding: "0.4rem 0.6rem", fontSize: "0.8rem", textDecoration: "none", display: "flex", alignItems: "center", gap: "0.2rem" }}
                  >
                    <ShieldAlert size={14} /> <span className="mobile-hide">ADMIN</span>
                  </a>
                )}
                <button 
                  onClick={handleLogout} 
                  className="neo-btn" 
                  style={{ padding: "0.4rem 0.6rem", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "0.2rem" }}
                >
                  <LogOut size={14} /> <span className="mobile-hide">LOGOUT</span>
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

      {/* Page Body */}
      <main className="container" style={{ flex: 1, padding: "2rem 1.5rem" }}>
        {children}
      </main>

      {/* Footer */}
      <footer style={{ borderTop: "3px solid #121212", backgroundColor: "#fff", padding: "1.5rem 0", marginTop: "auto" }}>
        <div className="container" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.85rem", fontWeight: "700" }}>
          <div>© 2026 Arcade Studio - play.aktechstudio.com</div>
          <div style={{ display: "flex", gap: "1rem" }}>
            <span style={{ display: "flex", alignItems: "center", gap: "0.2rem" }}><Smartphone size={14} /> Mobile Compatible</span>
            <span style={{ display: "flex", alignItems: "center", gap: "0.2rem" }}><Monitor size={14} /> Desktop Standard</span>
          </div>
        </div>
      </footer>

      {/* Sign In / Guest Profile Edit Modal */}
      {showLoginModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            
            {user?.isGuest ? (
              <form onSubmit={handleUpdateGuestProfile} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <h3 style={{ fontSize: "1.3rem", fontWeight: "800" }}>Edit Guest Nickname</h3>
                
                {(localStorage.getItem("arcade_has_played") === "true" || (window.location.pathname !== "/" && window.location.pathname !== "/index.html")) && (
                  <div style={{ color: "var(--accent-color)", border: "2px solid #121212", background: "#ffeef0", padding: "0.5rem", borderRadius: "4px", fontWeight: "800", fontSize: "0.8rem" }}>
                    🔒 Nickname locked because you have started playing.
                  </div>
                )}

                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                  <label style={{ fontWeight: "700", fontSize: "0.85rem" }}>Nickname</label>
                  <input 
                    type="text" 
                    value={guestNickname}
                    onChange={(e) => setGuestNickname(e.target.value)}
                    maxLength={14}
                    disabled={localStorage.getItem("arcade_has_played") === "true" || (window.location.pathname !== "/" && window.location.pathname !== "/index.html")}
                    style={{ 
                      padding: "0.5rem 1rem", 
                      fontSize: "1rem", 
                      fontWeight: "700", 
                      border: "3px solid #121212", 
                      borderRadius: "6px",
                      backgroundColor: (localStorage.getItem("arcade_has_played") === "true" || (window.location.pathname !== "/" && window.location.pathname !== "/index.html")) ? "#e5ded4" : "#fff",
                      cursor: (localStorage.getItem("arcade_has_played") === "true" || (window.location.pathname !== "/" && window.location.pathname !== "/index.html")) ? "not-allowed" : "text"
                    }}
                  />
                </div>
                {!(localStorage.getItem("arcade_has_played") === "true" || (window.location.pathname !== "/" && window.location.pathname !== "/index.html")) && (
                  <button type="submit" className="neo-btn accent" style={{ width: "100%", justifyContent: "center" }}>
                    SAVE NICKNAME
                  </button>
                )}
              </form>
            ) : (
              <h3 style={{ fontSize: "1.4rem", fontWeight: "800" }}>Sign In to Profile</h3>
            )}

            {loginError && (
              <div style={{ color: "var(--accent-color)", border: "2px solid #121212", background: "#ffeef0", padding: "0.5rem", borderRadius: "4px", fontWeight: "700", fontSize: "0.85rem" }}>
                {loginError}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <div style={{ fontWeight: "700", fontSize: "0.9rem", color: "#666" }}>Google Identity Auth</div>
              <div id="google-login-btn-container" style={{ display: "flex", justifyContent: "center", padding: "0.5rem", border: "2px dashed #ccc" }}>
                <div className="g_id_signin" data-type="standard">Google Login button renders here</div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <div style={{ flex: 1, height: "1px", backgroundColor: "#ccc" }}></div>
              <div style={{ fontSize: "0.75rem", color: "#888", fontWeight: "700" }}>OR LOCAL TEST LOGIN</div>
              <div style={{ flex: 1, height: "1px", backgroundColor: "#ccc" }}></div>
            </div>

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
