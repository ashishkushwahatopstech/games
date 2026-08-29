// Cloudflare Worker Backend for play.aktechstudio.com

export interface Env {
  DB: D1Database;
  KV: KVNamespace;
  GOOGLE_CLIENT_ID: string;
  ADMIN_EMAIL: string;
}

// Helpers for CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS, PUT, DELETE",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

function handleOptions() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}

function errorResponse(message: string, status: number = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

function jsonResponse(data: any, status: number = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

// Helper to decode Base64url
function base64urlDecode(str: string): string {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

// Verify Google Token (or support local mock bypass)
async function verifyGoogleToken(token: string, clientId: string): Promise<any> {
  // Support local mock testing
  if (token.startsWith("mock_")) {
    const username = token.replace("mock_", "");
    let email = `${username}@gmail.com`;
    let name = username.charAt(0).toUpperCase() + username.slice(1);
    if (username === "admin") {
      email = "ashishkushwaha88643@gmail.com";
      name = "Ashish Kushwaha";
    }
    return {
      email,
      name,
      picture: `https://api.dicebear.com/7.x/adventurer/svg?seed=${username}`,
    };
  }

  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid JWT token format");
  }

  const header = JSON.parse(base64urlDecode(parts[0]));
  const payload = JSON.parse(base64urlDecode(parts[1]));

  // Verify expiration
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) {
    throw new Error("Token expired");
  }

  // Verify issuer
  if (payload.iss !== "https://accounts.google.com" && payload.iss !== "accounts.google.com") {
    throw new Error("Invalid token issuer");
  }

  // Verify client ID (if Google client ID is configured properly in wrangler.toml/vars)
  if (clientId && clientId !== "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com") {
    if (payload.aud !== clientId) {
      throw new Error("Token audience mismatch");
    }
  }

  // Retrieve public keys from Google to check signature (optional but secure)
  try {
    const res = await fetch("https://www.googleapis.com/oauth2/v3/certs");
    const certs = await res.json() as any;
    const jwk = certs.keys.find((key: any) => key.kid === header.kid);
    if (!jwk) {
      throw new Error("Public key not found for kid");
    }

    const key = await crypto.subtle.importKey(
      "jwk",
      jwk,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const encoder = new TextEncoder();
    const data = encoder.encode(parts[0] + "." + parts[1]);
    
    // Decode signature
    const signatureBinary = atob(parts[2].replace(/-/g, "+").replace(/_/g, "/"));
    const signatureBytes = new Uint8Array(signatureBinary.length);
    for (let i = 0; i < signatureBinary.length; i++) {
      signatureBytes[i] = signatureBinary.charCodeAt(i);
    }

    const valid = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, signatureBytes, data);
    if (!valid) {
      throw new Error("Signature verification failed");
    }
  } catch (err: any) {
    console.error("JWK Verification failed: " + err.message);
    // If signature verification fails due to local dev / offline or unconfigured client ID,
    // we fallback to payload check if clientId is not set. Otherwise, throw.
    if (clientId && clientId !== "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com") {
      throw err;
    }
  }

  return {
    email: payload.email,
    name: payload.name,
    picture: payload.picture,
  };
}

// Auth Helper
async function authenticateUser(request: Request, env: Env): Promise<any> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("Unauthorized");
  }
  const token = authHeader.substring(7);
  
  if (token.startsWith("guest_")) {
    const guestUser = await env.DB.prepare("SELECT * FROM users WHERE email = ?")
      .bind(token)
      .first<{ email: string, name: string, picture: string, is_suspended: number }>();
      
    if (guestUser) {
      if (guestUser.is_suspended) {
        throw new Error("USER_SUSPENDED");
      }
      return {
        email: guestUser.email,
        name: guestUser.name,
        picture: guestUser.picture,
      };
    }
    return {
      email: token,
      name: "Guest Player",
      picture: `https://api.dicebear.com/7.x/adventurer/svg?seed=${token}`,
    };
  }
  
  const payload = await verifyGoogleToken(token, env.GOOGLE_CLIENT_ID);
  
  // Check if suspended in D1 database
  const user = await env.DB.prepare("SELECT is_suspended FROM users WHERE email = ?")
    .bind(payload.email)
    .first<{ is_suspended: number }>();
    
  if (user && user.is_suspended) {
    throw new Error("USER_SUSPENDED");
  }
  
  return payload;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (request.method === "OPTIONS") {
      return handleOptions();
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // ----------------------------------------------------
      // Public Game & Leaderboard Status
      // ----------------------------------------------------
      if (path === "/api/games" && request.method === "GET") {
        const { results } = await env.DB.prepare("SELECT * FROM games").all();
        return jsonResponse(results);
      }

      if (path.startsWith("/api/leaderboard/") && request.method === "GET") {
        const gameId = path.split("/").pop();
        const { results } = await env.DB.prepare(
          "SELECT user_name, MAX(score) as score, MAX(created_at) as created_at FROM leaderboards WHERE game_id = ? GROUP BY user_name ORDER BY score DESC LIMIT 10"
        )
          .bind(gameId)
          .all();
        return jsonResponse(results);
      }

      // ----------------------------------------------------
      // Authentication API
      // ----------------------------------------------------
      if (path === "/api/auth/guest" && request.method === "POST") {
        const { guestId, nickname } = await request.json() as any;
        if (!guestId || !nickname) {
          return errorResponse("Missing guest details");
        }

        const picture = `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(guestId)}`;

        // Upsert guest user profile in D1
        await env.DB.prepare(
          "INSERT INTO users (email, name, picture) VALUES (?, ?, ?) ON CONFLICT(email) DO UPDATE SET name=excluded.name, picture=excluded.picture"
        )
          .bind(guestId, nickname, picture)
          .run();

        return jsonResponse({
          email: guestId,
          name: nickname,
          picture: picture,
          isAdmin: false,
          isGuest: true
        });
      }

      if (path === "/api/auth/google" && request.method === "POST") {
        const { credential } = await request.json() as any;
        if (!credential) {
          return errorResponse("Missing credential");
        }
        
        try {
          const profile = await verifyGoogleToken(credential, env.GOOGLE_CLIENT_ID);
          
          // Upsert user
          await env.DB.prepare(
            "INSERT INTO users (email, name, picture) VALUES (?, ?, ?) ON CONFLICT(email) DO UPDATE SET name=excluded.name, picture=excluded.picture"
          )
            .bind(profile.email, profile.name, profile.picture)
            .run();
            
          // Double check suspension status
          const checkSuspended = await env.DB.prepare("SELECT is_suspended FROM users WHERE email = ?")
            .bind(profile.email)
            .first<{ is_suspended: number }>();
            
          if (checkSuspended?.is_suspended) {
            return errorResponse("Your account has been suspended by the administrator.", 403);
          }

          return jsonResponse({
            email: profile.email,
            name: profile.name,
            picture: profile.picture,
            isAdmin: profile.email === env.ADMIN_EMAIL,
          });
        } catch (e: any) {
          return errorResponse("Auth failed: " + e.message, 401);
        }
      }

      // ----------------------------------------------------
      // Authenticated User Leaderboard Submission
      // ----------------------------------------------------
      if (path.startsWith("/api/leaderboard/") && request.method === "POST") {
        let user;
        try {
          user = await authenticateUser(request, env);
        } catch (e: any) {
          const code = e.message === "USER_SUSPENDED" ? 403 : 401;
          return errorResponse(e.message, code);
        }

        const gameId = path.split("/").pop();
        const { score } = await request.json() as any;
        
        if (typeof score !== "number") {
          return errorResponse("Invalid score");
        }

        // Insert new score
        await env.DB.prepare(
          "INSERT INTO leaderboards (game_id, user_email, user_name, score) VALUES (?, ?, ?, ?)"
        )
          .bind(gameId, user.email, user.name, score)
          .run();

        return jsonResponse({ success: true });
      }

      // ----------------------------------------------------
      // Online Matchmaking API (Tic-Tac-Toe Arena)
      // ----------------------------------------------------
      if (path === "/api/matchmaking/status" && request.method === "GET") {
        let user;
        try {
          user = await authenticateUser(request, env);
        } catch (e: any) {
          return errorResponse(e.message, e.message === "USER_SUSPENDED" ? 403 : 401);
        }

        // Check the most recent match for this user
        const match = await env.DB.prepare(
          "SELECT * FROM active_matches WHERE player1_email = ? OR player2_email = ? ORDER BY last_move_at DESC LIMIT 1"
        )
          .bind(user.email, user.email)
          .first<any>();

        if (match) {
          if (match.winner_email === null) {
            return jsonResponse({
              status: "matched",
              matchId: match.id,
              player1: match.player1_email,
              player2: match.player2_email,
              boardState: JSON.parse(match.board_state),
              currentTurn: match.current_turn,
            });
          } else {
            // Check if game was concluded recently (less than 90 seconds)
            const dateStr = match.last_move_at.replace(" ", "T");
            const matchTime = new Date(dateStr.indexOf("Z") === -1 ? dateStr + "Z" : dateStr).getTime();
            const elapsed = Date.now() - matchTime;
            
            if (elapsed < 90 * 1000) {
              const myVote = await env.KV.get(`matchmaking:rematch:${match.id}:${user.email}`);
              const opponentEmail = user.email === match.player1_email ? match.player2_email : match.player1_email;
              const opponentVote = await env.KV.get(`matchmaking:rematch:${match.id}:${opponentEmail}`);

              return jsonResponse({
                status: "gameover",
                matchId: match.id,
                player1: match.player1_email,
                player2: match.player2_email,
                boardState: JSON.parse(match.board_state),
                winner: match.winner_email,
                rematchStatus: {
                  me: myVote === "voted",
                  opponent: opponentVote === "voted"
                }
              });
            }
          }
        }

        // Check if user is in KV matchmaking queue
        const queuedPlayer = await env.KV.get("matchmaking:queue");
        if (queuedPlayer === user.email) {
          return jsonResponse({ status: "waiting" });
        }

        return jsonResponse({ status: "idle" });
      }

      if (path === "/api/matchmaking/join" && request.method === "POST") {
        let user;
        try {
          user = await authenticateUser(request, env);
        } catch (e: any) {
          return errorResponse(e.message, e.message === "USER_SUSPENDED" ? 403 : 401);
        }

        // First, check if already in an active match
        const activeMatch = await env.DB.prepare(
          "SELECT * FROM active_matches WHERE (player1_email = ? OR player2_email = ?) AND winner_email IS NULL"
        )
          .bind(user.email, user.email)
          .first<any>();

        if (activeMatch) {
          return jsonResponse({ status: "matched", matchId: activeMatch.id });
        }

        // Read queue from KV
        const queuedEmail = await env.KV.get("matchmaking:queue");

        if (!queuedEmail) {
          // Queue is empty, join queue
          await env.KV.put("matchmaking:queue", user.email, { expirationTtl: 300 }); // Expire in 5 mins
          return jsonResponse({ status: "waiting" });
        } else if (queuedEmail === user.email) {
          // Already waiting
          return jsonResponse({ status: "waiting" });
        } else {
          // Match found!
          await env.KV.delete("matchmaking:queue");

          const matchId = `match_${crypto.randomUUID()}`;
          const initialBoardState = JSON.stringify({
            board: Array(9).fill(null),
            moves: []
          });

          await env.DB.prepare(
            "INSERT INTO active_matches (id, player1_email, player2_email, board_state, current_turn) VALUES (?, ?, ?, ?, ?)"
          )
            .bind(matchId, queuedEmail, user.email, initialBoardState, queuedEmail)
            .run();

          return jsonResponse({ status: "matched", matchId });
        }
      }

      if (path === "/api/matchmaking/rematch" && request.method === "POST") {
        let user;
        try {
          user = await authenticateUser(request, env);
        } catch (e: any) {
          return errorResponse(e.message, e.message === "USER_SUSPENDED" ? 403 : 401);
        }

        const { matchId } = await request.json() as any;
        if (!matchId) return errorResponse("Missing match ID");

        const match = await env.DB.prepare("SELECT * FROM active_matches WHERE id = ?")
          .bind(matchId)
          .first<any>();

        if (!match) return errorResponse("Match not found");

        // Vote for rematch in KV
        await env.KV.put(`matchmaking:rematch:${matchId}:${user.email}`, "voted", { expirationTtl: 120 });

        // Check if opponent voted too
        const opponentEmail = user.email === match.player1_email ? match.player2_email : match.player1_email;
        const opponentVote = await env.KV.get(`matchmaking:rematch:${matchId}:${opponentEmail}`);

        if (opponentVote === "voted") {
          // Both voted! Reset the match in D1 database to play again
          const cleanBoard = JSON.stringify({
            board: Array(9).fill(null),
            moves: []
          });
          
          await env.DB.prepare(
            "UPDATE active_matches SET board_state = ?, winner_email = NULL, current_turn = player1_email, last_move_at = CURRENT_TIMESTAMP WHERE id = ?"
          )
            .bind(cleanBoard, matchId)
            .run();

          // Delete voting keys
          await env.KV.delete(`matchmaking:rematch:${matchId}:${user.email}`);
          await env.KV.delete(`matchmaking:rematch:${matchId}:${opponentEmail}`);

          return jsonResponse({ success: true, reset: true });
        }

        return jsonResponse({ success: true, reset: false });
      }

      if (path === "/api/matchmaking/leave" && request.method === "POST") {
        let user;
        try {
          user = await authenticateUser(request, env);
        } catch (e: any) {
          return errorResponse(e.message, e.message === "USER_SUSPENDED" ? 403 : 401);
        }

        // Check if in queue
        const queuedEmail = await env.KV.get("matchmaking:queue");
        if (queuedEmail === user.email) {
          await env.KV.delete("matchmaking:queue");
        }

        // Resign active game if any
        await env.DB.prepare(
          "UPDATE active_matches SET winner_email = (CASE WHEN player1_email = ? THEN player2_email ELSE player1_email END), last_move_at = CURRENT_TIMESTAMP WHERE (player1_email = ? OR player2_email = ?) AND winner_email IS NULL"
        )
          .bind(user.email, user.email, user.email)
          .run();

        return jsonResponse({ success: true });
      }

      if (path === "/api/matchmaking/move" && request.method === "POST") {
        let user;
        try {
          user = await authenticateUser(request, env);
        } catch (e: any) {
          return errorResponse(e.message, e.message === "USER_SUSPENDED" ? 403 : 401);
        }

        const { matchId, cellIndex } = await request.json() as any;
        if (typeof cellIndex !== "number" || cellIndex < 0 || cellIndex > 8) {
          return errorResponse("Invalid move data");
        }

        const match = await env.DB.prepare("SELECT * FROM active_matches WHERE id = ?")
          .bind(matchId)
          .first<any>();

        if (!match) {
          return errorResponse("Match not found");
        }

        if (match.winner_email) {
          return errorResponse("Match is already completed");
        }

        if (match.current_turn !== user.email) {
          return errorResponse("It is not your turn");
        }

        const boardState = JSON.parse(match.board_state);
        if (boardState.board[cellIndex] !== null) {
          return errorResponse("Cell is already occupied");
        }

        // Record move: 'X' for player1, 'O' for player2
        const symbol = user.email === match.player1_email ? "X" : "O";
        boardState.board[cellIndex] = symbol;
        boardState.moves.push({ player: user.email, cellIndex, symbol });

        // Check for winner
        const winLines = [
          [0,1,2], [3,4,5], [6,7,8], // Rows
          [0,3,6], [1,4,7], [2,5,8], // Columns
          [0,4,8], [2,4,6]           // Diagonals
        ];

        let winnerEmail = null;
        for (const line of winLines) {
          const [a, b, c] = line;
          if (
            boardState.board[a] &&
            boardState.board[a] === boardState.board[b] &&
            boardState.board[a] === boardState.board[c]
          ) {
            winnerEmail = user.email;
            break;
          }
        }

        // Check for draw
        if (!winnerEmail && boardState.board.every((cell: any) => cell !== null)) {
          winnerEmail = "DRAW";
        }

        // Toggle turn
        const nextTurn = user.email === match.player1_email ? match.player2_email : match.player1_email;

        // Update match state
        await env.DB.prepare(
          "UPDATE active_matches SET board_state = ?, current_turn = ?, winner_email = ?, last_move_at = CURRENT_TIMESTAMP WHERE id = ?"
        )
          .bind(JSON.stringify(boardState), nextTurn, winnerEmail, matchId)
          .run();

        return jsonResponse({
          status: "matched",
          matchId,
          player1: match.player1_email,
          player2: match.player2_email,
          boardState,
          currentTurn: nextTurn,
          winner: winnerEmail,
        });
      }

      // ----------------------------------------------------
      // P2P WebRTC Signaling API
      // ----------------------------------------------------
      if (path === "/api/signal/offer" && request.method === "POST") {
        const { code, sdp } = await request.json() as any;
        if (!code || !sdp) return errorResponse("Missing code or sdp data");
        
        // Cleanup signals older than 10 minutes
        await env.DB.prepare("DELETE FROM webrtc_signals WHERE created_at < datetime('now', '-10 minutes')").run();
        
        // Insert new signaling record
        await env.DB.prepare(
          "INSERT OR REPLACE INTO webrtc_signals (code, offer, answer, created_at) VALUES (?, ?, NULL, CURRENT_TIMESTAMP)"
        )
          .bind(code, JSON.stringify(sdp))
          .run();

        return jsonResponse({ success: true });
      }

      if (path === "/api/signal/offer" && request.method === "GET") {
        const code = url.searchParams.get("code");
        if (!code) return errorResponse("Missing pairing code");
        
        const row = await env.DB.prepare("SELECT offer FROM webrtc_signals WHERE code = ?")
          .bind(code)
          .first() as any;
          
        if (!row || !row.offer) return errorResponse("Offer not found", 404);
        return jsonResponse({ sdp: JSON.parse(row.offer) });
      }

      if (path === "/api/signal/answer" && request.method === "POST") {
        const { code, sdp } = await request.json() as any;
        if (!code || !sdp) return errorResponse("Missing code or sdp data");
        
        await env.DB.prepare("UPDATE webrtc_signals SET answer = ? WHERE code = ?")
          .bind(JSON.stringify(sdp), code)
          .run();

        return jsonResponse({ success: true });
      }

      if (path === "/api/signal/answer" && request.method === "GET") {
        const code = url.searchParams.get("code");
        if (!code) return errorResponse("Missing pairing code");
        
        const row = await env.DB.prepare("SELECT answer FROM webrtc_signals WHERE code = ?")
          .bind(code)
          .first() as any;
          
        if (!row || !row.answer) return errorResponse("Answer not found", 404);
        return jsonResponse({ sdp: JSON.parse(row.answer) });
      }

      // ----------------------------------------------------
      // Admin APIs (restricted to admin email)
      // ----------------------------------------------------
      if (path.startsWith("/api/admin/")) {
        let user;
        try {
          user = await authenticateUser(request, env);
        } catch (e: any) {
          return errorResponse(e.message, e.message === "USER_SUSPENDED" ? 403 : 401);
        }

        if (user.email !== env.ADMIN_EMAIL) {
          return errorResponse("Forbidden: Admins only", 403);
        }

        if (path === "/api/admin/users" && request.method === "GET") {
          const { results } = await env.DB.prepare("SELECT * FROM users ORDER BY created_at DESC").all();
          return jsonResponse(results);
        }

        if (path.startsWith("/api/admin/users/") && path.endsWith("/suspend") && request.method === "POST") {
          // Suspend or unsuspend user based on body
          const emailParts = path.split("/");
          const targetEmail = decodeURIComponent(emailParts[4]);
          const { suspend } = await request.json() as any;
          
          if (targetEmail === env.ADMIN_EMAIL) {
            return errorResponse("Cannot suspend the primary administrator", 400);
          }

          await env.DB.prepare("UPDATE users SET is_suspended = ? WHERE email = ?")
            .bind(suspend ? 1 : 0, targetEmail)
            .run();

          return jsonResponse({ success: true });
        }

        if (path === "/api/admin/games" && request.method === "GET") {
          const { results } = await env.DB.prepare("SELECT * FROM games").all();
          return jsonResponse(results);
        }

        if (path.startsWith("/api/admin/games/") && path.endsWith("/toggle") && request.method === "POST") {
          const gameParts = path.split("/");
          const targetGameId = decodeURIComponent(gameParts[4]);
          const { is_active } = await request.json() as any;

          await env.DB.prepare("UPDATE games SET is_active = ? WHERE id = ?")
            .bind(is_active ? 1 : 0, targetGameId)
            .run();

          return jsonResponse({ success: true });
        }

        if (path.startsWith("/api/admin/games/") && path.endsWith("/toggle-mobile") && request.method === "POST") {
          const gameParts = path.split("/");
          const targetGameId = decodeURIComponent(gameParts[4]);
          const { is_mobile_friendly } = await request.json() as any;

          await env.DB.prepare("UPDATE games SET is_mobile_friendly = ? WHERE id = ?")
            .bind(is_mobile_friendly ? 1 : 0, targetGameId)
            .run();

          return jsonResponse({ success: true });
        }
      }

      return errorResponse("API Endpoint not found", 404);
    } catch (e: any) {
      console.error(e);
      return errorResponse("Internal server error: " + e.message, 500);
    }
  },
};
