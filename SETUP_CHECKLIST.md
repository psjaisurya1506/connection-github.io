# What to do after unzipping (manual steps)

The zip intentionally does NOT contain `node_modules` (they are hundreds of MB and are OS-specific) or a database.
These are the only things you need to add or do yourself.

## A. Run on your own computer (Windows / Mac / Linux)

1. **Install Node.js 22.12 or later** (https://nodejs.org) - one time.
2. **Install MongoDB** - one time. Either:
   - MongoDB Community Server, running locally (default `mongodb://127.0.0.1:27017`), **or**
   - a free MongoDB Atlas cluster (then edit `MONGO_URI` in `server/.env`).
3. Open a terminal in this folder (the one containing `package.json`) and run:
   ```
   npm run setup      # downloads all dependencies (needs internet, ~1-2 min)
   npm run seed       # optional: demo users/data. All demo passwords: password123
   npm run dev        # starts API (5000) and website (5173)
   ```
4. Open **http://localhost:5173**
   Demo logins: `admin@eec.edu`, `arjun@eec.edu` (alumni), `jaisurya@eec.edu` (student).

Create `server/.env` from `server/.env.example` for local use. This file is ignored by Git and is not included in the repository; set production secrets in the hosting provider's environment settings.

## B. Deploy so anyone can open it (single URL, no 404/502 on refresh)

Easiest: ONE web service serves both the UI and the API.

1. Create a **MongoDB Atlas** cluster (free tier) -> Database Access: create a user -> Network Access: allow `0.0.0.0/0` -> copy the connection string.
2. Push this folder to GitHub and create a **Web Service** (Render, Railway, etc.) with:
   - Build command: `npm run setup && npm run build`
   - Start command: `npm start`
   - Environment variables (add these manually in the host's dashboard - do not put real secrets in the zip):
     | Name | Value |
     |---|---|
     | `NODE_ENV` | `production` |
     | `MONGO_URI` | your Atlas string, e.g. `mongodb+srv://user:pass@cluster.mongodb.net/alumni_mentorship` |
     | `JWT_SECRET` | a long random string (e.g. output of `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`) |
   - (`render.yaml` is included, so on Render you can use "New > Blueprint".)
3. Health check path: `/api/health`.
4. Run the seed once if you want demo data: `npm run seed` from the host's shell (or skip and just register users).

### If you host the website and API separately (Netlify/Vercel + Render)
- Frontend host env var: `VITE_API_URL=https://YOUR-API-HOST/api` and `VITE_SOCKET_URL=https://YOUR-API-HOST`
- Backend env var: `CLIENT_URL=https://YOUR-FRONTEND-HOST` (comma-separate several origins)
- SPA rewrite files are already included (`client/public/_redirects` for Netlify, `client/vercel.json` for Vercel), which is what prevents 404 when you refresh on a page like `/student/dashboard`.
- Free hosts put idle servers to sleep; the first request after a nap can return 502/503 for ~30-60 s. Wait and refresh, or use a paid plan.

## C. Common problems

| Symptom | Cause / fix |
|---|---|
| 502 / "Cannot reach the server" in dev | Backend is not running or MongoDB is down. Use `npm run dev` (starts API first) and make sure MongoDB is running. |
| 404 when refreshing a page | Only happens on a static host without the rewrite files above - included now. |
| "Could not connect to MongoDB" | Start MongoDB, or fix `MONGO_URI`. Atlas: allow your IP in Network Access. |
| Port 5000 already in use | Change `PORT` in `server/.env` and the proxy target in `client/vite.config.js` (or set `VITE_PROXY_TARGET`). |
| Login fails after moving to another database | Run `npm run seed` again, or register a new user. |
