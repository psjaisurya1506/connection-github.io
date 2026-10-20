# EEC Alumni Connect — Integrated Alumni-Student Mentorship & Job Portal

A MERN-style alumni/student portal for mentorship, jobs, sessions, messaging, profiles, and admin verification.

## Fixes in v1.2 (deployment / 404 / 502)

- The Express server now serves the built React app (`npm run build`, then `npm start`), with a fallback to `index.html`, so refreshing or deep-linking any page (e.g. `/student/dashboard`) never returns 404 and the UI, API and websockets share one URL.
- Missing files and unknown `/api/...` paths return a proper JSON/404 instead of HTML or a confusing 401.
- SPA rewrite files added for static hosts: `client/public/_redirects` (Netlify), `client/vercel.json` (Vercel); `render.yaml` blueprint for Render.
- Dev 502 fixed at the source: `npm run dev` starts the API, waits until `/api/health` answers, then starts Vite; the Vite proxy uses `127.0.0.1` (avoids the Windows `localhost` -> IPv6 connection-refused problem).
- If the API is down the UI now says so clearly instead of showing a generic error.
- Verified in a real headless browser: student, alumni and admin can log in and open every page with zero 4xx/5xx responses and no console errors, including refresh on deep links.

**See `SETUP_CHECKLIST.md` for the exact manual steps after unzipping.**

## Fixes in v1.1

- **Security: password hashes were leaking.** `password` was declared `select: true` in the User model, which made Mongoose include it even in queries that listed specific fields, so `GET /api/users/mentors` and `GET /api/users/:id` returned every user's bcrypt hash to any signed-in user. It is now `select: false`; login and change-password request it explicitly.
- `npm test` now works: the test file needed `supertest`, which was missing from `package.json`, and there was no `test` script. Added both plus regression tests (10 tests, all passing).
- Server no longer returns HTTP 500 for a request with no body (Express 5 leaves `req.body` undefined); it returns a proper 400.
- Messaging an admin/user id that does not exist returned 500 after saving the message; it now returns 404 and saves nothing. One fewer database query per message.
- `"false"` strings were treated as `true` (job active flag, admin activate/deactivate, "open to mentor"); fixed with a proper boolean parser.
- Unread message counts were wrong for users with more than 1000 messages; they now come from an exact database count.
- Added database indexes for messages, mentorship requests, notifications and user filters (faster inbox, lists and dashboards).
- Registration validates email format; token creation is shared with the rest of the auth code (respects `JWT_EXPIRES_IN`).
- Startup: clear errors when MongoDB is unreachable or the port is busy, graceful shutdown, safe development fallbacks when `.env` is missing (production still requires `JWT_SECRET` and `MONGO_URI`), and no more dotenv banner noise.
- Client: a server restart or brief network drop no longer signs you out (only a rejected token does); the browser tab title is now "EEC Alumni Connect".
- Root `package.json` with one-command `setup`, `dev`, `seed`, `test`, `build`.
- `server/.env` is a local-only file and is ignored by Git. Copy `server/.env.example` to create it locally; set production secrets in your hosting provider's environment settings.

## Quick start (recommended)

```bash
npm run setup     # installs root, server and client dependencies
npm run seed      # optional demo data (password123)
npm run dev       # API on :5000 and web app on :5173 together
```

MongoDB must be running locally (or set `MONGO_URI` in `server/.env` to an Atlas string). Run tests with `npm test` (uses database `alumni_test`).

## Account verification

Student and alumni sign-up requires a college register number in the format `31062` followed by seven digits. New accounts remain pending until an admin checks the number against the college's current or former student records and approves it from **Admin → Verification**. The portal does not connect to a college registry; the check is performed by the admin against records provided by the college. Admins can change a student's account type to alumni from **Admin → All Users**.

## Earlier fixes (previous version)

- Added the missing `isActive`, `openToMentor`, profile, and safety fields to the User model.
- Existing database records without the new fields remain usable; missing `isActive`/`openToMentor` values are treated as enabled unless explicitly set to `false`.
- Registration now returns a JWT, so a new user is actually signed in after registration.
- Prevented self-registration as an admin.
- Added the missing `/api/auth/password` endpoint used by the Profile page.
- Added safe user serialization so passwords are never returned.
- Added compatibility for old demo records whose seed password was stored before hashing.
- Seed data now stores a bcrypt-hashed password.
- Jobs and users created by older versions are not accidentally hidden merely because a newer boolean field did not exist.
- Added working `seed` and `seed:reset` npm scripts.

## Requirements

- Node.js 22.12 or later
- MongoDB local or MongoDB Atlas

## 1. Configure the backend

Open `server/.env.example`, copy it to `server/.env`, and set:

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/alumni_mentorship
JWT_SECRET=use-a-long-random-secret
CLIENT_URL=http://localhost:5173
```

For MongoDB Atlas, replace `MONGO_URI` with your own Atlas connection string.

## 2. Install dependencies

From `server`:

```bash
npm install
```

From `client`:

```bash
npm install
```

Do not copy `node_modules` between Windows/Linux machines. Always run `npm install` on the machine where you run the application.

## 3. Start the backend

```bash
cd server
npm start
```

Expected API:

`http://localhost:5000/api/health`

## 4. Add demo data (optional)

```bash
cd server
npm run seed:reset
```

Demo password: `password123`

- Admin: `admin@eec.edu`
- Alumni: `arjun@eec.edu`
- Student: `jaisurya@eec.edu`

## 5. Start the frontend

In another terminal:

```bash
cd client
npm run dev
```

Open the Vite URL shown in the terminal, normally `http://localhost:5173`.

The Vite development server proxies `/api` and `/socket.io` to `http://localhost:5000`.

## If you already have an older MongoDB database

You do **not** have to delete it just because the User schema changed. The application is backward-compatible with users created before the new fields existed.

If you want a clean demo database, use:

```bash
npm run seed:reset
```

This deletes the portal collections and recreates the demo dataset.

## Production deployment

Set these environment variables on the backend host:

- `MONGO_URI`
- `JWT_SECRET`
- `CLIENT_URL`
- `PORT` if required by the hosting provider

Set the frontend `VITE_API_URL` to the deployed backend API base, for example:

```env
VITE_API_URL=https://your-backend.example.com/api
```

For realtime messaging, the backend host must support WebSocket/Socket.IO connections.

### Deploy the frontend to Vercel

The repository-root `vercel.json` supports a Vercel project whose **Root Directory** is the repository root. It installs and builds the Vite app from `client` and serves the client-side routes.

Deploy the Express/Socket.IO backend separately on a host that supports a persistent Node.js server and WebSockets (the included `render.yaml` can be used with Render). In Vercel, set these project environment variables and redeploy:

- `VITE_API_URL`: backend API URL ending in `/api`, for example `https://your-backend.example.com/api`
- `VITE_SOCKET_URL`: backend origin without `/api`, for example `https://your-backend.example.com`

On the backend host, set `NODE_ENV=production`, `MONGO_URI`, `JWT_SECRET`, and `CLIENT_URL` to the deployed Vercel origin. Keep secrets in the hosting provider's environment-variable settings; do not commit `.env` files.
