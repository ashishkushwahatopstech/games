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

  return (
    <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
      {onTogglePause && isPaused !== undefined && (
        <button 
          onClick={onTogglePause} 
          className="neo-btn" 
          style={{ padding: "0.4rem 0.6rem", fontSize: "0.8rem" }}
          title={isPaused ? "Play" : "Pause"}
        >
          {isPaused ? <Play size={14} fill="currentColor" /> : <Pause size={14} fill="currentColor" />}
        </button>
      )}

      {onRestart && (
        <button 
          onClick={onRestart} 
          className="neo-btn secondary" 
          style={{ padding: "0.4rem 0.6rem", fontSize: "0.8rem" }}
          title="Restart"
        >
          <RotateCcw size={14} />
        </button>
      )}

      <button 
        onClick={toggleFullscreen} 
        className="neo-btn blue" 
        style={{ padding: "0.4rem 0.6rem", fontSize: "0.8rem" }}
        title="Toggle Fullscreen"
      >
        {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
      </button>

      <button 
        onClick={onToggleMute} 
        className="neo-btn" 
        style={{ padding: "0.4rem 0.6rem", fontSize: "0.8rem" }}
        title={muted ? "Unmute" : "Mute"}
      >
        {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
      </button>
    </div>
  );
}
