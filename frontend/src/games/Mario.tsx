import React, { useRef, useState, useEffect } from "react";
import { ArrowLeft, Trophy, Smartphone } from "lucide-react";
import GameHUDControls from "../components/GameHUDControls";

interface MarioProps {
  onBack: () => void;
  user: any;
  submitScore: (score: number) => Promise<void>;
  leaderboard: any[];
  refreshLeaderboard: () => void;
}

// NES button constant mappings matching JSNES values
const NES_BUTTON_A = 0;
const NES_BUTTON_B = 1;
const NES_BUTTON_SELECT = 2;
const NES_BUTTON_START = 3;
const NES_BUTTON_UP = 4;
const NES_BUTTON_DOWN = 5;
const NES_BUTTON_LEFT = 6;
const NES_BUTTON_RIGHT = 7;

// Utility to load PeerJS script dynamically
const loadPeerJS = (): Promise<void> => {
  return new Promise((resolve) => {
    if ((window as any).Peer) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://unpkg.com/peerjs@1.5.2/dist/peerjs.min.js";
    script.onload = () => resolve();
    document.body.appendChild(script);
  });
};

export default function Mario({
  onBack,
  user,
  submitScore,
  leaderboard,
  refreshLeaderboard
}: MarioProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [muted, setMuted] = useState(false);

  // Live game stats extracted from the NES emulator memory
  const [score, setScore] = useState(0);
  const [coins, setCoins] = useState(0);
  const [world, setWorld] = useState(1);
  const [level, setLevel] = useState(1);
  const [lives, setLives] = useState(3);

  // PeerJS Connection State
  const [isControllerMode, setIsControllerMode] = useState(false);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [peerConnected, setPeerConnected] = useState(false);
  const [connInstance, setConnInstance] = useState<any>(null);
  const [showPairingModal, setShowPairingModal] = useState(false);
  const [pairingStatus, setPairingStatus] = useState("Initializing connection...");
  const [phoneCodeInput, setPhoneCodeInput] = useState("");

  // Check URL params on mount to verify if phone controller mode is requested
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const role = params.get("role");
    const code = params.get("code");
    if (role === "controller" && code) {
      setIsControllerMode(true);
      setPairingCode(code);
      initPhoneController(code);
    }
  }, []);

  // Send virtual controller event messages to JSNES iframe
  const triggerMove = (buttonCode: number, pressed: boolean) => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage({
        action: pressed ? "buttonDown" : "buttonUp",
        button: buttonCode
      }, "*");
    }
  };

  // Listen to postMessages from JSNES emulator containing live game stats
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      const data = e.data;
      if (data && data.action === "stats") {
        setScore(data.score);
        setCoins(data.coins);
        setWorld(data.world);
        setLevel(data.level);
        setLives(data.lives);

        // Submit highscore updates to the backend leaderboard dynamically
        if (data.score > 0) {
          submitScore(data.score).then(() => {
            refreshLeaderboard();
          });
        }
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [submitScore, refreshLeaderboard]);

  // Desktop side: host peer connection
  const hostPhoneController = async () => {
    setShowPairingModal(true);
    setPairingStatus("Generating pairing code...");
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    setPairingCode(code);

    try {
      await loadPeerJS();
      const peer = new (window as any).Peer(`arcade-mario-${code}`);

      peer.on("open", () => {
        setPairingStatus("Waiting for phone to connect...");
      });

      peer.on("connection", (conn: any) => {
        setPeerConnected(true);
        setPairingStatus("Phone connected! Ready to play.");
        setConnInstance(conn);

        // Automatically close modal after pairing
        setTimeout(() => {
          setShowPairingModal(false);
        }, 1500);

        conn.on("data", (data: any) => {
          // Route inputs straight to the emulator iframe
          if (iframeRef.current && iframeRef.current.contentWindow) {
            iframeRef.current.contentWindow.postMessage(data, "*");
          }
        });

        conn.on("close", () => {
          setPeerConnected(false);
          setPairingStatus("Phone disconnected.");
        });
      });

      peer.on("error", (err: any) => {
        console.error("PeerJS error: ", err);
        setPairingStatus("Connection error. Please retry.");
      });
    } catch (e) {
      setPairingStatus("Failed to load connection server.");
    }
  };

  // Phone side: connect to desktop host peer
  const initPhoneController = async (code: string) => {
    setPairingStatus("Connecting to screen...");
    try {
      await loadPeerJS();
      const peer = new (window as any).Peer();

      peer.on("open", () => {
        const conn = peer.connect(`arcade-mario-${code}`);
        setConnInstance(conn);

        conn.on("open", () => {
          setPeerConnected(true);
          setPairingStatus("Connected! Tilt phone & play.");
        });

        conn.on("close", () => {
          setPeerConnected(false);
          setPairingStatus("Disconnected from screen.");
        });

        conn.on("error", (err: any) => {
          console.error(err);
          setPairingStatus("Failed to connect to screen.");
        });
      });

      peer.on("error", (err: any) => {
        console.error(err);
        setPairingStatus("Connection failed.");
      });
    } catch (e) {
      setPairingStatus("Failed to load connection server.");
    }
  };

  // Phone control action transmitter (triggers vibrations for physical feedback)
  const transmitInput = (buttonCode: number, pressed: boolean) => {
    if (navigator.vibrate && pressed) {
      navigator.vibrate(40);
    }
    if (connInstance && peerConnected) {
      connInstance.send({
        action: pressed ? "buttonDown" : "buttonUp",
        button: buttonCode
      });
    }
  };

  // ----------------------------------------------------
  // Phone Fullscreen Controller View
  // ----------------------------------------------------
  if (isControllerMode) {
    return (
      <div 
        ref={containerRef}
        style={{ 
          display: "flex", 
          flexDirection: "column", 
          alignItems: "center", 
          justifyContent: "space-between", 
          height: "100vh", 
          backgroundColor: "#b22222", // Retro red controller theme
          color: "#fff",
          padding: "1.5rem",
          boxSizing: "border-box",
          userSelect: "none",
          WebkitUserSelect: "none"
        }}
      >
        {/* Header */}
        <div style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button 
            onClick={() => { window.location.href = "/"; }} 
            className="neo-btn secondary"
            style={{ padding: "0.5rem 1rem", backgroundColor: "#fff", color: "#121212" }}
          >
            LOBBY
          </button>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontWeight: "900", fontSize: "0.9rem" }}>ARCADE CONTROLLER</div>
            <div style={{ fontSize: "0.75rem", color: peerConnected ? "#51cf66" : "#ff8787", fontWeight: "800" }}>
              ● {pairingStatus}
            </div>
          </div>
          <button 
            onClick={() => {
              if (document.fullscreenElement) {
                document.exitFullscreen();
              } else {
                containerRef.current?.requestFullscreen();
              }
            }} 
            className="neo-btn secondary"
            style={{ padding: "0.5rem", backgroundColor: "#fff", color: "#121212" }}
          >
            📺
          </button>
        </div>

        {/* Pairing interface if disconnected */}
        {!peerConnected && (
          <div className="neo-card" style={{ backgroundColor: "#fff", color: "#121212", padding: "1.5rem", margin: "auto 0", width: "100%", maxWidth: "320px", textAlign: "center" }}>
            <h4 style={{ margin: "0 0 0.5rem 0", fontSize: "1.1rem" }}>Connecting to Screen</h4>
            <p style={{ fontSize: "0.85rem", color: "#666", margin: "0 0 1rem 0" }}>
              Make sure your desktop has generated a pairing code and you entered it correctly.
            </p>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <input
                type="text"
                placeholder="Code (e.g. 5829)"
                value={phoneCodeInput}
                onChange={(e) => setPhoneCodeInput(e.target.value)}
                maxLength={4}
                style={{
                  width: "100%",
                  padding: "0.5rem",
                  fontSize: "1rem",
                  fontWeight: "900",
                  border: "3px solid #121212",
                  borderRadius: "4px",
                  textAlign: "center"
                }}
              />
              <button 
                onClick={() => {
                  if (phoneCodeInput.length === 4) {
                    setPairingCode(phoneCodeInput);
                    initPhoneController(phoneCodeInput);
                  }
                }} 
                className="neo-btn accent"
              >
                CONNECT
              </button>
            </div>
          </div>
        )}

        {/* Virtual Gamepad Buttons */}
        {peerConnected && (
          <div style={{ display: "flex", flexDirection: "column", gap: "2.5rem", width: "100%", maxWidth: "480px", margin: "auto 0" }}>
            
            {/* D-Pad and Action buttons row */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
              
              {/* D-Pad Plus Layout */}
              <div 
                style={{ 
                  position: "relative", 
                  width: "160px", 
                  height: "160px", 
                  backgroundColor: "#121212", 
                  borderRadius: "50%",
                  boxShadow: "0 8px 0 #000"
                }}
              >
                {/* UP Button */}
                <button
                  onTouchStart={() => transmitInput(NES_BUTTON_UP, true)}
                  onTouchEnd={() => transmitInput(NES_BUTTON_UP, false)}
                  onMouseDown={() => transmitInput(NES_BUTTON_UP, true)}
                  onMouseUp={() => transmitInput(NES_BUTTON_UP, false)}
                  style={{
                    position: "absolute",
                    top: "10px",
                    left: "55px",
                    width: "50px",
                    height: "50px",
                    backgroundColor: "#333",
                    border: "none",
                    borderRadius: "4px",
                    color: "#fff",
                    fontSize: "1.2rem",
                    cursor: "pointer"
                  }}
                >
                  ▲
                </button>
                {/* DOWN Button */}
                <button
                  onTouchStart={() => transmitInput(NES_BUTTON_DOWN, true)}
                  onTouchEnd={() => transmitInput(NES_BUTTON_DOWN, false)}
                  onMouseDown={() => transmitInput(NES_BUTTON_DOWN, true)}
                  onMouseUp={() => transmitInput(NES_BUTTON_DOWN, false)}
                  style={{
                    position: "absolute",
                    bottom: "10px",
                    left: "55px",
                    width: "50px",
                    height: "50px",
                    backgroundColor: "#333",
                    border: "none",
                    borderRadius: "4px",
                    color: "#fff",
                    fontSize: "1.2rem",
                    cursor: "pointer"
                  }}
                >
                  ▼
                </button>
                {/* LEFT Button */}
                <button
                  onTouchStart={() => transmitInput(NES_BUTTON_LEFT, true)}
                  onTouchEnd={() => transmitInput(NES_BUTTON_LEFT, false)}
                  onMouseDown={() => transmitInput(NES_BUTTON_LEFT, true)}
                  onMouseUp={() => transmitInput(NES_BUTTON_LEFT, false)}
                  style={{
                    position: "absolute",
                    left: "10px",
                    top: "55px",
                    width: "50px",
                    height: "50px",
                    backgroundColor: "#333",
                    border: "none",
                    borderRadius: "4px",
                    color: "#fff",
                    fontSize: "1.2rem",
                    cursor: "pointer"
                  }}
                >
                  ◀
                </button>
                {/* RIGHT Button */}
                <button
                  onTouchStart={() => transmitInput(NES_BUTTON_RIGHT, true)}
                  onTouchEnd={() => transmitInput(NES_BUTTON_RIGHT, false)}
                  onMouseDown={() => transmitInput(NES_BUTTON_RIGHT, true)}
                  onMouseUp={() => transmitInput(NES_BUTTON_RIGHT, false)}
                  style={{
                    position: "absolute",
                    right: "10px",
                    top: "55px",
                    width: "50px",
                    height: "50px",
                    backgroundColor: "#333",
                    border: "none",
                    borderRadius: "4px",
                    color: "#fff",
                    fontSize: "1.2rem",
                    cursor: "pointer"
                  }}
                >
                  ▶
                </button>
              </div>

              {/* Action Buttons A & B (Classic angled layout) */}
              <div style={{ display: "flex", gap: "1.5rem", transform: "rotate(-10deg)" }}>
                {/* B Button */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <button
                    onTouchStart={() => transmitInput(NES_BUTTON_B, true)}
                    onTouchEnd={() => transmitInput(NES_BUTTON_B, false)}
                    onMouseDown={() => transmitInput(NES_BUTTON_B, true)}
                    onMouseUp={() => transmitInput(NES_BUTTON_B, false)}
                    style={{
                      width: "65px",
                      height: "65px",
                      borderRadius: "50%",
                      backgroundColor: "#ffd166",
                      border: "4px solid #121212",
                      boxShadow: "0 6px 0 #121212",
                      color: "#121212",
                      fontSize: "1.3rem",
                      fontWeight: "900",
                      cursor: "pointer"
                    }}
                  >
                    B
                  </button>
                  <span style={{ fontSize: "0.75rem", fontWeight: "900", marginTop: "0.5rem", color: "#121212" }}>RUN</span>
                </div>
                {/* A Button */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: "-15px" }}>
                  <button
                    onTouchStart={() => transmitInput(NES_BUTTON_A, true)}
                    onTouchEnd={() => transmitInput(NES_BUTTON_A, false)}
                    onMouseDown={() => transmitInput(NES_BUTTON_A, true)}
                    onMouseUp={() => transmitInput(NES_BUTTON_A, false)}
                    style={{
                      width: "65px",
                      height: "65px",
                      borderRadius: "50%",
                      backgroundColor: "#e63946",
                      border: "4px solid #121212",
                      boxShadow: "0 6px 0 #121212",
                      color: "#fff",
                      fontSize: "1.3rem",
                      fontWeight: "900",
                      cursor: "pointer"
                    }}
                  >
                    A
                  </button>
                  <span style={{ fontSize: "0.75rem", fontWeight: "900", marginTop: "0.5rem", color: "#121212" }}>JUMP</span>
                </div>
              </div>

            </div>

            {/* Select & Start buttons */}
            <div style={{ display: "flex", justifyContent: "center", gap: "2rem" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <button
                  onTouchStart={() => transmitInput(NES_BUTTON_SELECT, true)}
                  onTouchEnd={() => transmitInput(NES_BUTTON_SELECT, false)}
                  onMouseDown={() => transmitInput(NES_BUTTON_SELECT, true)}
                  onMouseUp={() => transmitInput(NES_BUTTON_SELECT, false)}
                  style={{
                    width: "80px",
                    height: "28px",
                    backgroundColor: "#777",
                    border: "3px solid #121212",
                    borderRadius: "15px",
                    boxShadow: "0 4px 0 #121212",
                    cursor: "pointer"
                  }}
                />
                <span style={{ fontSize: "0.65rem", fontWeight: "900", marginTop: "0.3rem", color: "#121212" }}>SELECT</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <button
                  onTouchStart={() => transmitInput(NES_BUTTON_START, true)}
                  onTouchEnd={() => transmitInput(NES_BUTTON_START, false)}
                  onMouseDown={() => transmitInput(NES_BUTTON_START, true)}
                  onMouseUp={() => transmitInput(NES_BUTTON_START, false)}
                  style={{
                    width: "80px",
                    height: "28px",
                    backgroundColor: "#777",
                    border: "3px solid #121212",
                    borderRadius: "15px",
                    boxShadow: "0 4px 0 #121212",
                    cursor: "pointer"
                  }}
                />
                <span style={{ fontSize: "0.65rem", fontWeight: "900", marginTop: "0.3rem", color: "#121212" }}>START</span>
              </div>
            </div>

          </div>
        )}

        <div style={{ fontSize: "0.7rem", color: "#fafafa", opacity: 0.8 }}>
          ARCADE.STUDIO NES CONTROLLER CORE P2P v1.0
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // Desktop Game View Mode (Default)
  // ----------------------------------------------------
  return (
    <div ref={containerRef} style={{ display: "flex", flexDirection: "column", gap: "1rem" }} className="fullscreen-compat">
      {/* Header Panel */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", maxWidth: "640px", margin: "0 auto", boxSizing: "border-box", padding: "0 0.5rem" }}>
        <button onClick={onBack} className="neo-btn secondary" style={{ padding: "0.5rem 1rem" }}>
          <ArrowLeft size={18} /> BACK
        </button>

        <button 
          onClick={hostPhoneController}
          className={`neo-btn ${peerConnected ? 'accent' : 'secondary'}`} 
          style={{ padding: "0.5rem 1.1rem", display: "flex", alignItems: "center", gap: "0.4rem", fontWeight: "800" }}
        >
          <Smartphone size={16} /> {peerConnected ? "PHONE ACTIVE" : "PHONE CONTROLLER"}
        </button>

        <GameHUDControls 
          isPaused={false}
          onTogglePause={undefined}
          onRestart={undefined}
          muted={muted}
          onToggleMute={() => setMuted(!muted)}
          containerRef={containerRef}
        />
      </div>

      {/* Live NES status HUD */}
      <div 
        style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center", 
          width: "100%", 
          maxWidth: "640px", 
          margin: "0 auto",
          backgroundColor: "#121212", 
          color: "#fff", 
          padding: "0.5rem 1rem", 
          border: "4px solid #121212",
          boxShadow: "4px 4px 0px 0px #121212",
          boxSizing: "border-box",
          fontFamily: "var(--font-game)",
          fontSize: "0.75rem",
          fontWeight: "bold",
          gap: "0.5rem",
          borderRadius: "4px"
        }}
      >
        <div>MARIO {score.toString().padStart(6, '0')}</div>
        <div>🪙 x{coins.toString().padStart(2, '0')}</div>
        <div>WORLD {world}-{level}</div>
        <div>LIVES x{lives}</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: "1.5rem", width: "100%" }} className="game-layout-container">
        
        {/* Play Space Arena (Embed NES Emulator hosted on our server) */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem", width: "100%" }}>
          <div 
            className="neo-card game-view-box" 
            style={{ 
              padding: "0", 
              overflow: "hidden", 
              position: "relative", 
              backgroundColor: "#000", 
              display: "flex", 
              flexDirection: "column", 
              alignItems: "center",
              width: "100%",
              maxWidth: "640px",
              aspectRatio: "4 / 3",
              boxSizing: "border-box",
              border: "4px solid #121212",
              boxShadow: "6px 6px 0px 0px #121212"
            }}
          >
            <iframe
              ref={iframeRef}
              src="/mario-emu.html"
              width="100%"
              height="100%"
              frameBorder="0"
              allowFullScreen={true}
              allow="autoplay; fullscreen; gamepad"
              style={{
                display: "block",
                width: "100%",
                height: "100%",
                backgroundColor: "#000",
                border: "none",
              }}
            />
          </div>

          {/* Controls description */}
          <div style={{ textAlign: "center", fontSize: "0.82rem", fontWeight: "700", color: "#666", padding: "0 1rem" }}>
            🎮 <strong>Keyboard:</strong> Use <strong>Arrow Keys / WASD</strong> for D-Pad, <strong>Space / Z</strong> to Jump, <strong>X</strong> to Run, <strong>Enter / Shift</strong> for Start / Select.
          </div>

          {/* Virtual Mobile Controllers Panel */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", width: "100%", maxWidth: "420px", marginTop: "0.5rem", userSelect: "none", WebkitUserSelect: "none" }}>
            
            {/* Action controls (D-Pad Left/Right and Jump/Run buttons) */}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "0 1rem", boxSizing: "border-box" }}>
              {/* D-Pad */}
              <div style={{ display: "flex", gap: "0.6rem" }}>
                <button
                  onTouchStart={() => triggerMove(NES_BUTTON_LEFT, true)}
                  onTouchEnd={() => triggerMove(NES_BUTTON_LEFT, false)}
                  onMouseDown={() => triggerMove(NES_BUTTON_LEFT, true)}
                  onMouseUp={() => triggerMove(NES_BUTTON_LEFT, false)}
                  className="neo-btn secondary"
                  style={{ width: "60px", height: "55px", justifyContent: "center", fontSize: "1.2rem", fontWeight: "900", touchAction: "manipulation" }}
                >
                  ◀
                </button>
                <button
                  onTouchStart={() => triggerMove(NES_BUTTON_RIGHT, true)}
                  onTouchEnd={() => triggerMove(NES_BUTTON_RIGHT, false)}
                  onMouseDown={() => triggerMove(NES_BUTTON_RIGHT, true)}
                  onMouseUp={() => triggerMove(NES_BUTTON_RIGHT, false)}
                  className="neo-btn secondary"
                  style={{ width: "60px", height: "55px", justifyContent: "center", fontSize: "1.2rem", fontWeight: "900", touchAction: "manipulation" }}
                >
                  ▶
                </button>
              </div>

              {/* Action Buttons (A/Jump, B/Run) */}
              <div style={{ display: "flex", gap: "0.6rem" }}>
                <button
                  onTouchStart={() => triggerMove(NES_BUTTON_B, true)}
                  onTouchEnd={() => triggerMove(NES_BUTTON_B, false)}
                  onMouseDown={() => triggerMove(NES_BUTTON_B, true)}
                  onMouseUp={() => triggerMove(NES_BUTTON_B, false)}
                  className="neo-btn secondary"
                  style={{ width: "55px", height: "55px", borderRadius: "50%", justifyContent: "center", fontSize: "1rem", fontWeight: "900", backgroundColor: "#ffd166", touchAction: "manipulation" }}
                >
                  B
                </button>
                <button
                  onTouchStart={() => triggerMove(NES_BUTTON_A, true)}
                  onTouchEnd={() => triggerMove(NES_BUTTON_A, false)}
                  onMouseDown={() => triggerMove(NES_BUTTON_A, true)}
                  onMouseUp={() => triggerMove(NES_BUTTON_A, false)}
                  className="neo-btn accent"
                  style={{ width: "55px", height: "55px", borderRadius: "50%", justifyContent: "center", fontSize: "1rem", fontWeight: "900", touchAction: "manipulation" }}
                >
                  A
                </button>
              </div>
            </div>

            {/* Menu controls (Select, Start) */}
            <div style={{ display: "flex", justifyContent: "center", gap: "1rem", width: "100%", marginTop: "0.4rem" }}>
              <button
                onTouchStart={() => triggerMove(NES_BUTTON_SELECT, true)}
                onTouchEnd={() => triggerMove(NES_BUTTON_SELECT, false)}
                onMouseDown={() => triggerMove(NES_BUTTON_SELECT, true)}
                onMouseUp={() => triggerMove(NES_BUTTON_SELECT, false)}
                className="neo-btn secondary"
                style={{ padding: "0.4rem 1rem", fontSize: "0.8rem", fontWeight: "800", height: "35px" }}
              >
                SELECT
              </button>
              <button
                onTouchStart={() => triggerMove(NES_BUTTON_START, true)}
                onTouchEnd={() => triggerMove(NES_BUTTON_START, false)}
                onMouseDown={() => triggerMove(NES_BUTTON_START, true)}
                onMouseUp={() => triggerMove(NES_BUTTON_START, false)}
                className="neo-btn secondary"
                style={{ padding: "0.4rem 1rem", fontSize: "0.8rem", fontWeight: "800", height: "35px" }}
              >
                START
              </button>
            </div>

          </div>

        </div>

        {/* Highscores Board */}
        <div className="neo-card" style={{ display: "flex", flexDirection: "column", gap: "1rem", height: "fit-content" }}>
          <h3 style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "1.2rem" }}>
            <Trophy size={20} color="var(--primary-color)" /> LEADERBOARD
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {leaderboard.length === 0 ? (
              <p style={{ color: "#666", fontSize: "0.9rem" }}>No scores recorded yet.</p>
            ) : (
              leaderboard.map((entry, idx) => {
                const isCurrentUser = user && entry.user_name === user.name;
                return (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "0.5rem",
                      border: "2px solid var(--border-color)",
                      borderRadius: "4px",
                      backgroundColor: idx === 0 ? "var(--primary-color)" : isCurrentUser ? "var(--secondary-color)" : "#fff",
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
                    <span>{entry.score} pts</span>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* Pairing Dialog Modal */}
      {showPairingModal && (
        <>
          <div 
            onClick={() => setShowPairingModal(false)}
            style={{ 
              position: "fixed", 
              inset: 0, 
              backgroundColor: "rgba(18, 18, 18, 0.4)", 
              zIndex: 1000, 
              backdropFilter: "blur(2px)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center"
            }}
          >
            <div 
              className="neo-card" 
              onClick={(e) => e.stopPropagation()}
              style={{ 
                backgroundColor: "#fff", 
                color: "#121212", 
                padding: "2rem", 
                maxWidth: "360px", 
                width: "90%",
                boxSizing: "border-box",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "1.2rem",
                textAlign: "center"
              }}
            >
              <h3 style={{ margin: 0, fontSize: "1.3rem", fontWeight: "900" }}>CONNECT PHONE CONTROLLER</h3>
              
              {pairingCode && (
                <>
                  <div style={{ fontSize: "0.85rem", color: "#666" }}>
                    Scan this QR code with your phone or visit the site and click controller to enter the code below:
                  </div>
                  
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
                      `${window.location.origin}${window.location.pathname}?role=controller&code=${pairingCode}`
                    )}`} 
                    alt="QR Code" 
                    style={{ width: "150px", height: "150px", border: "4px solid #121212", borderRadius: "4px" }}
                  />

                  <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                    <span style={{ fontSize: "0.75rem", fontWeight: "800", color: "#999" }}>PAIRING CODE</span>
                    <span style={{ fontSize: "2rem", fontWeight: "900", letterSpacing: "4px", color: "var(--primary-color)" }}>
                      {pairingCode}
                    </span>
                  </div>
                </>
              )}

              <div style={{ fontSize: "0.9rem", fontWeight: "800", color: peerConnected ? "#37b24d" : "#f03e3e" }}>
                Status: {pairingStatus}
              </div>

              <button 
                onClick={() => setShowPairingModal(false)} 
                className="neo-btn secondary"
                style={{ width: "100%", justifyContent: "center" }}
              >
                CLOSE
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
