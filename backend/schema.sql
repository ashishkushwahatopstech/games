-- Schema for play.aktechstudio.com D1 Database

CREATE TABLE IF NOT EXISTS users (
    email TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    picture TEXT,
    is_suspended INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS games (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    is_active INTEGER DEFAULT 1,
    is_mobile_friendly INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS leaderboards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id TEXT NOT NULL,
    user_email TEXT NOT NULL,
    user_name TEXT NOT NULL,
    score INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_email) REFERENCES users(email)
);

CREATE TABLE IF NOT EXISTS active_matches (
    id TEXT PRIMARY KEY,
    player1_email TEXT NOT NULL,
    player2_email TEXT,
    board_state TEXT NOT NULL, -- JSON string representing board array & move list
    current_turn TEXT NOT NULL, -- Email of current player
    winner_email TEXT, -- NULL (in-progress), email, or 'DRAW'
    last_move_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Pre-populate game configurations
INSERT OR IGNORE INTO games (id, name, is_active, is_mobile_friendly) VALUES
('dino-dash', 'Dino Dash', 1, 1),
('stacker', 'Stacker 3D', 1, 1),
('retro-snake', 'Retro Snake', 1, 1),
('memory-matrix', 'Memory Matrix', 1, 1),
('word-chase', 'Word Chase', 1, 1),
('minesweeper', 'Minesweeper Blitz', 1, 1),
('cyber-clicker', 'Cyber Clicker', 1, 1),
('tic-tac-toe-online', 'Tic-Tac-Toe Arena (Online 1v1)', 1, 1),
('dual-pong', 'Dual Pong (Local 1v1)', 1, 1);
