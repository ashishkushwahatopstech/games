import React, { useState, useEffect } from "react";
import { Gamepad2, ShieldAlert, LogIn, LogOut, Smartphone, Monitor, Menu, X, Volume2 } from "lucide-react";

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
  const [openDrawer, setOpenDrawer] = useState(false);
  const [crtEnabled, setCrtEnabled] = useState(() => localStorage.getItem("arcade_crt") === "true");

  // Audio volume state mapped to localStorage
  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem("arcade_volume");
    return saved ? Number(saved) : 80;
  });

  useEffect(() => {
    const handleCrtChange = (e: any) => {
      setCrtEnabled(e.detail);
    };
    window.addEventListener("crt-filter-change", handleCrtChange);
    return () => window.removeEventListener("crt-filter-change", handleCrtChange);
  }, []);

  // Retro 8-bit ambient background music loop using Web Audio API
  useEffect(() => {
    let audioCtx: any = null;
    let intervalId: any = null;
    
    // Smooth pentatonic retro progression
    const melody = [261.63, 329.63, 392.00, 329.63, 293.66, 392.00, 440.00, 392.00];
    let noteIndex = 0;

    const startSequencer = () => {
      if (volume === 0) return;
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (audioCtx.state === "suspended") {
        audioCtx.resume();
      }

      const tick = () => {
        if (!audioCtx || audioCtx.state === "suspended" || volume === 0) return;
        const now = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc.type = "triangle";
        osc.frequency.setValueAtTime(melody[noteIndex], now);
        
        // Soft volume envelope to be non-intrusive
        gain.gain.setValueAtTime((volume / 100) * 0.02, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
        
        osc.start(now);
        osc.stop(now + 0.6);
        
        noteIndex = (noteIndex + 1) % melody.length;
      };

      if (!intervalId) {
        intervalId = setInterval(tick, 900);
      }
    };

    const handleInteract = () => {
      startSequencer();
      window.removeEventListener("click", handleInteract);
      window.removeEventListener("touchstart", handleInteract);
    };

    window.addEventListener("click", handleInteract);
    window.addEventListener("touchstart", handleInteract);

    // Keep sequencer state sync with volume adjustments live
    if (volume > 0) {
      if (audioCtx && audioCtx.state === "running") {
        startSequencer();
      }
    }

    return () => {
      clearInterval(intervalId);
      if (audioCtx) {
        audioCtx.close();
      }
    };
  }, [volume]);

  // Global button click SFX interceptor
  useEffect(() => {
    const playClick = () => {
      if (volume === 0) return;
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(600, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(120, audioCtx.currentTime + 0.08);
        gain.gain.setValueAtTime((volume / 100) * 0.04, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.08);
      } catch (e) {}
    };

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "BUTTON" ||
        target.tagName === "A" ||
        target.classList.contains("neo-btn") ||
        target.closest("button") ||
        target.closest(".neo-btn")
      ) {
        playClick();
      }
    };

    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, [volume]);

  const backendUrl = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" 
    ? "http://127.0.0.1:8787" 
    : "https://play-backend.flowmaticai.workers.dev";

  // Sync token and profile from local storage on launch
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
    }
  }, []);

  // Listen to open login modal trigger event
  useEffect(() => {
    const handleTrigger = () => {
      setShowLoginModal(true);
    };
    window.addEventListener("trigger-login-modal", handleTrigger);
    return () => window.removeEventListener("trigger-login-modal", handleTrigger);
  }, []);

  // Enforce authentication modal on game pages
  useEffect(() => {
    const isGamePage = window.location.pathname !== "/" && window.location.pathname !== "/index.html";
    const savedUser = localStorage.getItem("arcade_user");
    if (isGamePage && !savedUser) {
      setShowLoginModal(true);
    }
  }, [user]);

  // Google Login Initialize when modal opens
  useEffect(() => {
    if (showLoginModal && !user) {
      setTimeout(() => {
        if ((window as any).google) {
          (window as any).google.accounts.id.initialize({
            client_id: "73332236335-uh69lkbkeclfkbrj5bk405ru5ou96c8n.apps.googleusercontent.com",
            callback: handleGoogleLoginResponse,
          });
          const btnEl = document.getElementById("google-login-btn-container");
          if (btnEl) {
            (window as any).google.accounts.id.renderButton(btnEl, {
              theme: "outline",
              size: "large",
              width: 250
            });
          }
        }
      }, 300);
    }
  }, [showLoginModal, user]);

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

  const handleCreateGuest = async () => {
    setLoginError("");
    const randomSeed = Math.random().toString(36).substring(2, 7).toUpperCase();
    const guestId = `guest_${randomSeed}_${Date.now().toString(36)}`;
    const defaultName = `Guest_${randomSeed}`;

    try {
      const res = await fetch(`${backendUrl}/api/auth/guest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestId, nickname: defaultName })
      });
      const data = await res.json() as any;
      if (data.error) {
        setLoginError(data.error);
        return;
      }
      setUser(data);
      setToken(guestId);
      setGuestNickname(data.name);
      localStorage.setItem("arcade_user", JSON.stringify(data));
      localStorage.setItem("arcade_token", guestId);
      setShowLoginModal(false);
      window.location.reload();
    } catch (err) {
      setLoginError("Could not create guest profile.");
    }
  };

  const handleUpdateGuestProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestNickname.trim()) return;
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

  const isController = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("role") === "controller";

  if (isController) {
    return (
      <div style={{ minHeight: "100vh", position: "relative", backgroundColor: "#b22222" }}>
        {crtEnabled && (
          <div 
            style={{ 
              position: "fixed", 
              inset: 0, 
              pointerEvents: "none", 
              zIndex: 99999, 
              background: "linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.12) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.03), rgba(0, 255, 0, 0.01), rgba(0, 0, 255, 0.03))",
              backgroundSize: "100% 4px, 6px 100%"
            }}
          />
        )}
        {children}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", position: "relative" }}>
      {crtEnabled && (
        <div 
          style={{ 
            position: "fixed", 
            inset: 0, 
            pointerEvents: "none", 
            zIndex: 99999, 
            background: "linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.12) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.03), rgba(0, 255, 0, 0.01), rgba(0, 0, 255, 0.03))",
            backgroundSize: "100% 4px, 6px 100%"
          }}
        />
      )}
      {/* Header */}
      <header style={{ borderBottom: "3px solid #121212", backgroundColor: "#fff", padding: "1rem 0" }}>
        <div className="container" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <button 
              onClick={() => setOpenDrawer(true)} 
              className="neo-btn" 
              style={{ padding: "0.4rem 0.6rem" }}
              title="Menu Drawer"
            >
              <Menu size={16} />
            </button>
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
          </div>

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

      {/* Offcanvas Drawer Navigation */}
      {openDrawer && (
        <>
          <div 
            onClick={() => setOpenDrawer(false)}
            style={{ 
              position: "fixed", 
              inset: 0, 
              backgroundColor: "rgba(18, 18, 18, 0.4)", 
              zIndex: 100, 
              backdropFilter: "blur(2px)" 
            }}
          />
          <div 
            style={{ 
              position: "fixed", 
              top: 0, 
              left: 0, 
              bottom: 0, 
              width: "290px", 
              backgroundColor: "#fff", 
              borderRight: "4px solid #121212", 
              boxShadow: "8px 0px 0px 0px rgba(18,18,18,0.15)",
              zIndex: 101, 
              padding: "2rem 1.5rem",
              display: "flex",
              flexDirection: "column",
              gap: "2rem",
              boxSizing: "border-box",
              overflowY: "auto"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontSize: "1.2rem", fontWeight: "900", margin: 0 }}>ARCADE MENU</h3>
              <button 
                onClick={() => setOpenDrawer(false)} 
                className="neo-btn" 
                style={{ padding: "0.4rem" }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Lobby Link */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <a href="/" className="neo-btn accent" style={{ justifyContent: "center", width: "100%", fontWeight: "900" }}>
                🏠 RETURN TO LOBBY
              </a>
            </div>

            {/* Profile Menu */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", border: "3px solid #121212", padding: "1rem", borderRadius: "6px", backgroundColor: "#faf6f0" }}>
              <span style={{ fontSize: "0.8rem", fontWeight: "800", color: "#666" }}>USER PROFILE</span>
              {user ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <img 
                      src={user.picture || "https://api.dicebear.com/7.x/pixel-art/svg"} 
                      alt="" 
                      style={{ width: "40px", height: "40px", borderRadius: "50%", border: "2px solid #121212" }}
                    />
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span style={{ fontWeight: "900", fontSize: "0.95rem", maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.name}</span>
                      <span style={{ fontSize: "0.75rem", fontWeight: "700", color: "#666", maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {user.isGuest ? "Guest Player" : user.email}
                      </span>
                    </div>
                  </div>

                  {user.isGuest && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                      <input 
                        type="text" 
                        value={guestNickname}
                        onChange={(e) => setGuestNickname(e.target.value)}
                        placeholder="Nickname"
                        maxLength={14}
                        disabled={localStorage.getItem("arcade_has_played") === "true" || (window.location.pathname !== "/" && window.location.pathname !== "/index.html")}
                        style={{
                          padding: "0.4rem",
                          fontSize: "0.85rem",
                          fontWeight: "800",
                          border: "2px solid #121212",
                          borderRadius: "4px",
                          width: "100%",
                          boxSizing: "border-box"
                        }}
                      />
                      {!(localStorage.getItem("arcade_has_played") === "true" || (window.location.pathname !== "/" && window.location.pathname !== "/index.html")) ? (
                        <button 
                          onClick={handleUpdateGuestProfile} 
                          className="neo-btn secondary"
                          style={{ padding: "0.25rem", fontSize: "0.75rem", justifyContent: "center" }}
                        >
                          SAVE NAME
                        </button>
                      ) : (
                        <span style={{ fontSize: "0.7rem", color: "var(--accent-color)", fontWeight: "800" }}>🔒 Locked (Already Playing)</span>
                      )}
                    </div>
                  )}

                  <button 
                    onClick={handleLogout} 
                    className="neo-btn" 
                    style={{ padding: "0.4rem", fontSize: "0.8rem", width: "100%", justifyContent: "center", backgroundColor: "#fff" }}
                  >
                    <LogOut size={14} /> LOGOUT
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <p style={{ fontSize: "0.8rem", fontWeight: "600", color: "#666", margin: 0 }}>You are playing anonymously.</p>
                  <button 
                    onClick={() => { setOpenDrawer(false); setShowLoginModal(true); }} 
                    className="neo-btn accent"
                    style={{ padding: "0.5rem", fontSize: "0.8rem", width: "100%", justifyContent: "center" }}
                  >
                    <LogIn size={14} /> SIGN IN / REGISTER
                  </button>
                </div>
              )}
            </div>

            {/* Settings Menu */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", border: "3px solid #121212", padding: "1rem", borderRadius: "6px" }}>
              <span style={{ fontSize: "0.8rem", fontWeight: "800", color: "#666" }}>GAMEPLAY SETTINGS</span>
              
              {/* Volume */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                <span style={{ fontSize: "0.75rem", fontWeight: "800" }}>Audio Volume</span>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Volume2 size={16} />
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    value={volume}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setVolume(val);
                      localStorage.setItem("arcade_volume", String(val));
                      window.dispatchEvent(new CustomEvent("volume-change", { detail: val }));
                    }}
                    style={{ width: "100%", cursor: "pointer" }}
                  />
                  <span style={{ fontWeight: "900", fontSize: "0.8rem", width: "30px" }}>{volume}%</span>
                </div>
              </div>

              {/* CRT Filter */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.75rem", fontWeight: "800" }}>CRT Retro Filter</span>
                <input 
                  type="checkbox"
                  checked={localStorage.getItem("arcade_crt") === "true"}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    localStorage.setItem("arcade_crt", checked ? "true" : "false");
                    // Reload or dispatch state update to force re-render
                    window.dispatchEvent(new CustomEvent("crt-filter-change", { detail: checked }));
                  }}
                  style={{ width: "18px", height: "18px", cursor: "pointer" }}
                />
              </div>

              {/* Sound Effects */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.75rem", fontWeight: "800" }}>Sound Effects (SFX)</span>
                <input 
                  type="checkbox"
                  checked={localStorage.getItem("arcade_sfx") !== "false"}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    localStorage.setItem("arcade_sfx", checked ? "true" : "false");
                  }}
                  style={{ width: "18px", height: "18px", cursor: "pointer" }}
                />
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "auto", borderTop: "2px solid #e2dcd0", paddingTop: "1rem" }}>
              <div style={{ fontSize: "0.75rem", fontWeight: "700", color: "#666" }}>
                Arcade menu options are saved locally. Adjust filters and audio levels instantly during active games!
              </div>
            </div>

          </div>
        </>
      )}

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
            
            {!user ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
                <h3 style={{ fontSize: "1.3rem", fontWeight: "900", textAlign: "center" }}>SIGN IN TO PROFILE</h3>
                <p style={{ fontSize: "0.85rem", fontWeight: "600", color: "#666", textAlign: "center" }}>
                  Sign in to track global rankings, submit scores, or challenge online opponents.
                </p>

                {/* Google Sign In Wrapper */}
                <div id="google-login-btn-container" style={{ display: "flex", justifyContent: "center", minHeight: "44px" }}>
                  {/* Google will render standard button here */}
                </div>

                <button 
                  onClick={() => handleMockLogin("ashishkushwaha88643@gmail.com")} 
                  className="neo-btn accent"
                  style={{ justifyContent: "center", width: "100%", gap: "0.5rem" }}
                >
                  <LogIn size={16} /> MOCK GOOGLE LOGIN (ADMIN)
                </button>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", color: "#999", fontSize: "0.8rem", fontWeight: "800" }}>
                  <hr style={{ flex: 1, border: "0.5px solid #e2dcd0" }} /> OR <hr style={{ flex: 1, border: "0.5px solid #e2dcd0" }} />
                </div>

                <button 
                  onClick={handleCreateGuest} 
                  className="neo-btn secondary"
                  style={{ justifyContent: "center", width: "100%", gap: "0.5rem" }}
                >
                  🎭 PLAY AS GUEST (1-CLICK)
                </button>
              </div>
            ) : (
              user.isGuest ? (
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
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
                  <img 
                    src={user.picture || "https://api.dicebear.com/7.x/pixel-art/svg"} 
                    alt="" 
                    style={{ width: "64px", height: "64px", borderRadius: "50%", border: "3px solid #121212" }}
                  />
                  <h3 style={{ fontSize: "1.2rem", fontWeight: "900", margin: 0 }}>{user.name}</h3>
                  <span style={{ fontSize: "0.85rem", fontWeight: "700", color: "#666" }}>{user.email}</span>
                  <span style={{ background: "var(--secondary-color)", border: "2px solid #121212", padding: "0.25rem 0.5rem", borderRadius: "4px", fontWeight: "800", fontSize: "0.75rem" }}>
                    GOOGLE ACCOUNT
                  </span>
                </div>
              )
            )}

            {loginError && (
              <div style={{ color: "var(--accent-color)", border: "2px solid #121212", background: "#ffeef0", padding: "0.5rem", borderRadius: "4px", fontWeight: "700", fontSize: "0.85rem", textAlign: "center" }}>
                {loginError}
              </div>
            )}

            {(user || (window.location.pathname === "/" || window.location.pathname === "/index.html")) && (
              <button 
                onClick={() => setShowLoginModal(false)} 
                className="neo-btn" 
                style={{ width: "100%", justifyContent: "center", marginTop: "0.5rem" }}
              >
                CLOSE
              </button>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
