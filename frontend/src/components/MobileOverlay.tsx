import React from "react";
import { Monitor, AlertTriangle } from "lucide-react";

interface MobileOverlayProps {
  onCancel: () => void;
  onConfirm: () => void;
}

export default function MobileOverlay({ onCancel, onConfirm }: MobileOverlayProps) {
  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <div
            style={{
              padding: "1rem",
              borderRadius: "50%",
              backgroundColor: "var(--accent-color)",
              border: "3px solid var(--border-color)"
            }}
          >
            <Monitor size={36} color="#fff" />
          </div>
        </div>

        <div>
          <h3 style={{ fontSize: "1.4rem", fontWeight: "800", marginBottom: "0.5rem" }}>Desktop Preferred</h3>
          <p style={{ color: "#666", fontWeight: "600", fontSize: "0.9rem", lineHeight: "1.4" }}>
            This game requires precise key controls or mouse clicking and is not fully optimized for mobile devices. 
            We recommend playing on a desktop computer.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <button onClick={onConfirm} className="neo-btn accent" style={{ width: "100%", justifyContent: "center" }}>
            PLAY ANYWAY
          </button>
          <button onClick={onCancel} className="neo-btn secondary" style={{ width: "100%", justifyContent: "center" }}>
            BACK TO GAMES
          </button>
        </div>
      </div>
    </div>
  );
}
