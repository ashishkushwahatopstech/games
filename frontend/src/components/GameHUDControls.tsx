import React, { useState, useEffect } from "react";
import { Play, Pause, RotateCcw, Maximize2, Minimize2, Volume2, VolumeX } from "lucide-react";

interface GameHUDControlsProps {
  isPaused?: boolean;
  onTogglePause?: () => void;
  onRestart?: () => void;
  muted: boolean;
  onToggleMute: () => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export default function GameHUDControls({
  isPaused,
  onTogglePause,
  onRestart,
  muted,
  onToggleMute,
  containerRef
}: GameHUDControlsProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    const element = containerRef.current;
    if (!element) return;

    if (!document.fullscreenElement) {
      element.requestFullscreen().catch(err => {
        console.warn(`Fullscreen error: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handleGlobalShortcuts = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA")) {
        return;
      }

      const key = e.key.toLowerCase();
      if (key === "p" || e.key === "Escape") {
        if (onTogglePause) {
          e.preventDefault();
          onTogglePause();
        }
      } else if (key === "m") {
        e.preventDefault();
        onToggleMute();
      } else if (key === "f") {
        e.preventDefault();
        toggleFullscreen();
      }
    };

    window.addEventListener("keydown", handleGlobalShortcuts);
    return () => window.removeEventListener("keydown", handleGlobalShortcuts);
  }, [isPaused, onTogglePause, muted, onToggleMute]);

  const kbdStyle: React.CSSProperties = {
    fontSize: "0.55rem",
    background: "#fff",
    border: "1.5px solid #121212",
    borderRadius: "3px",
    padding: "0.05rem 0.2rem",
    fontWeight: "900",
    color: "#121212",
    fontFamily: "monospace",
    marginLeft: "0.15rem",
    display: "inline-block",
    boxShadow: "1px 1px 0px #121212"
  };

  return (
    <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
      {onTogglePause && isPaused !== undefined && (
        <button 
          onClick={onTogglePause} 
          className="neo-btn" 
          style={{ padding: "0.4rem 0.6rem", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "0.2rem" }}
          title={isPaused ? "Play [P]" : "Pause [P]"}
        >
          {isPaused ? <Play size={13} fill="currentColor" /> : <Pause size={13} fill="currentColor" />}
          <kbd style={kbdStyle}>P</kbd>
        </button>
      )}

      {onRestart && (
        <button 
          onClick={onRestart} 
          className="neo-btn secondary" 
          style={{ padding: "0.4rem 0.6rem", fontSize: "0.8rem" }}
          title="Restart"
        >
          <RotateCcw size={13} />
        </button>
      )}

      <button 
        onClick={toggleFullscreen} 
        className="neo-btn blue" 
        style={{ padding: "0.4rem 0.6rem", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "0.2rem" }}
        title="Toggle Fullscreen [F]"
      >
        {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
        <kbd style={kbdStyle}>F</kbd>
      </button>

      <button 
        onClick={onToggleMute} 
        className="neo-btn" 
        style={{ padding: "0.4rem 0.6rem", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "0.2rem" }}
        title={muted ? "Unmute [M]" : "Mute [M]"}
      >
        {muted ? <VolumeX size={13} /> : <Volume2 size={13} />}
        <kbd style={kbdStyle}>M</kbd>
      </button>
    </div>
  );
}
