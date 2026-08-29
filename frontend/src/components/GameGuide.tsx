import React, { useState } from "react";
import { Info, HelpCircle } from "lucide-react";

interface GameGuideProps {
  gameId: string;
}

interface GuideContent {
  howToPlay: string[];
  faqs: { q: string; a: string }[];
}

const GUIDES: { [key: string]: GuideContent } = {
  "dino-dash": {
    howToPlay: [
      "Press Space, Arrow Up, or Tap the screen to jump.",
      "Avoid hitting the obstacles (cacti on the ground and birds in the air).",
      "Survival speed increases every 100 points. Keep your reaction sharp!"
    ],
    faqs: [
      { q: "How do I jump?", a: "Press the Spacebar, Arrow Up key, or Tap/Click anywhere on the screen." },
      { q: "Why is the character sprite blurry?", a: "We use pixel-sharp filters to scale retro art cleanly without blur." }
    ]
  },
  "stacker": {
    howToPlay: [
      "Press Space or Tap the screen to drop the moving layer.",
      "Align it perfectly with the layer below. Overhanging parts will get sliced off!",
      "Stack as high as you can. Perfect alignments keep your block wide."
    ],
    faqs: [
      { q: "What is a Perfect drop?", a: "Aligning a block exactly on top of the block below. You will hear a double beep sound and keep full width." },
      { q: "Does the speed increase?", a: "Yes, blocks move faster as the tower grows taller." }
    ]
  },
  "retro-snake": {
    howToPlay: [
      "Use keyboard Arrow Keys or click the D-Pad buttons at the bottom to navigate.",
      "Eat red dots to grow and increase your score (+10 points each).",
      "Do not collide with the walls or run into your own tail!"
    ],
    faqs: [
      { q: "Can I go backwards?", a: "No, you cannot turn directly into your opposite direction." },
      { q: "How does the speed change?", a: "The game speeds up slightly for every 50 points earned." }
    ]
  },
  "memory-matrix": {
    howToPlay: [
      "Watch the grid tiles highlight at the start of each round.",
      "Once they fade, click the correct tiles to match the pattern.",
      "A level is cleared when all active tiles are matched. Avoid getting 3 strikes!"
    ],
    faqs: [
      { q: "What do strikes do?", a: "Each wrong guess adds a strike. Accumulating 3 strikes results in Game Over." },
      { q: "Does the board expand?", a: "Yes, the grid scales from 3x3 to 4x4 and eventually 5x5 as your score grows." }
    ]
  },
  "minesweeper": {
    howToPlay: [
      "Left-click/Tap cells to reveal them. Right-click or toggle Touch Mode to place flags.",
      "Numbers indicate how many mines are hiding in the adjacent 8 squares.",
      "Clear all safe cells to sweep the board and win!"
    ],
    faqs: [
      { q: "How is my score computed?", a: "Based on revealed tiles, a speed bonus for finishing fast, plus 100 points for a sweep." },
      { q: "Can I click a mine on my first move?", a: "Mines are generated procedurally, so your first click is always guaranteed to be safe." }
    ]
  },
  "word-chase": {
    howToPlay: [
      "Guess the secret 5-letter word in 6 attempts.",
      "Green tiles: letter is correct and in the right spot.",
      "Yellow tiles: letter is in the word but in the wrong spot.",
      "Gray tiles: letter is not in the word at all."
    ],
    faqs: [
      { q: "Are the words random?", a: "Yes, words are selected randomly from a standard dictionary list." },
      { q: "Can I guess gibberish?", a: "No, each guess must be a valid 5-letter word." }
    ]
  },
  "cyber-clicker": {
    howToPlay: [
      "Click the cyber core in the center to generate raw power clicks.",
      "Spend clicks to buy upgrades (Auto-Clickers, CPU overclockers).",
      "Multiply your generation output and watch your clicks skyrocket!"
    ],
    faqs: [
      { q: "Do upgrades run when offline?", a: "Auto-clickers run as long as you keep the game page open." }
    ]
  },
  "tic-tac-toe-online": {
    howToPlay: [
      "Take turns placing your symbol (X or O) on a 3x3 grid.",
      "Match 3 symbols in a row (horizontal, vertical, or diagonal) to win.",
      "Play online vs real opponents, or toggle Bot Mode to play offline against the AI."
    ],
    faqs: [
      { q: "How do I know whose turn it is?", a: "The active player's HUD border and card will light up in color.", }
    ]
  },
  "dual-pong": {
    howToPlay: [
      "2-Player Duel: Move paddles with keyboard keys or drag sliders below the screen to bounce the ball.",
      "1-Player Bricks: Control the bottom paddle to break all blocks at the top.",
      "If the ball gets past your paddle, your opponent scores or you lose a life."
    ],
    faqs: [
      { q: "How do the sliders work?", a: "Touch and drag horizontally on the controller cards below the game screen. They track your fingers smoothly." }
    ]
  },
  "mario": {
    howToPlay: [
      "Use Left & Right arrows (or A & D / on-screen buttons) to walk.",
      "Press Space (or Up arrow / on-screen Jump button) to Jump.",
      "Collect coins, bump question blocks, and stomp on Goombas to score points.",
      "Avoid falling into pits or running into Goombas from the side.",
      "Reach the castle flag pole at the end of the level to clear it and claim victory!"
    ],
    faqs: [
      { q: "How do I defeat Goombas?", a: "Jump and land directly on top of them. Walking into them from the side causes you to lose the game." },
      { q: "Is there a leaderboard?", a: "Yes, you can submit your high scores and check global rankings after completing the level or when the game ends." }
    ]
  }
};

export default function GameGuide({ gameId }: GameGuideProps) {
  const guide = GUIDES[gameId];
  if (!guide) return null;

  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  return (
    <div style={{ marginTop: "2rem", display: "flex", flexDirection: "column", gap: "1.5rem", width: "100%", boxSizing: "border-box" }}>
      
      {/* How to Play */}
      <div className="neo-card" style={{ borderLeft: "6px solid var(--primary-color)", padding: "1.2rem", backgroundColor: "#fff" }}>
        <h3 style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "1.1rem", margin: "0 0 0.8rem 0", fontWeight: "900" }}>
          <Info size={18} color="var(--primary-color)" /> HOW TO PLAY
        </h3>
        <ol style={{ paddingLeft: "1.2rem", margin: 0, fontWeight: "600", fontSize: "0.88rem", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
          {guide.howToPlay.map((step, idx) => (
            <li key={idx} style={{ lineHeight: "1.4" }}>{step}</li>
          ))}
        </ol>
      </div>

      {/* FAQs */}
      <div className="neo-card" style={{ borderLeft: "6px solid var(--secondary-color)", padding: "1.2rem", backgroundColor: "#fff" }}>
        <h3 style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "1.1rem", margin: "0 0 0.8rem 0", fontWeight: "900" }}>
          <HelpCircle size={18} color="var(--secondary-color)" /> FREQUENTLY ASKED QUESTIONS
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          {guide.faqs.map((faq, idx) => {
            const isOpen = activeFaq === idx;
            return (
              <div 
                key={idx} 
                style={{ 
                  border: "2px solid #121212", 
                  borderRadius: "6px", 
                  overflow: "hidden", 
                  cursor: "pointer",
                  backgroundColor: "#faf6f0" 
                }}
                onClick={() => setActiveFaq(isOpen ? null : idx)}
              >
                <div style={{ padding: "0.6rem 0.8rem", fontWeight: "800", fontSize: "0.85rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>{faq.q}</span>
                  <span style={{ fontSize: "1.1rem" }}>{isOpen ? "−" : "+"}</span>
                </div>
                {isOpen && (
                  <div style={{ padding: "0.6rem 0.8rem", borderTop: "2px solid #121212", background: "#fff", fontSize: "0.85rem", fontWeight: "600", lineHeight: "1.4" }}>
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
