# daily-rock

A personal platform for systematically listening to rock music, one song a day, starting from classic rock and expanding over time. Tracks ratings, notes, and listening history for each song; supports a read-only share link for friends.

Stack: Rust (Axum) on Cloudflare Workers + D1 for the backend, Next.js (PWA) on Vercel for the frontend.

## Project Structure

- `frontend/` - Next.js (App Router, TypeScript, Vanilla CSS)
- `backend/` - Rust (Axum, Cloudflare Workers, `workers-rs` SDK)

## Local Development

To run the full stack locally:

### 1. Start the Rust Backend

The backend runs on Cloudflare Wrangler on port `8787` by default:

```bash
cd backend
npx wrangler dev
```

### 2. Start the Next.js Frontend

The frontend runs on port `3000` by default. It proxies any `/api/*` requests to the local backend:

```bash
cd frontend
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) in your browser. The page will fetch `GET /api/health` from the backend and display the connection status dynamically.
