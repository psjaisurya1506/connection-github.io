# Deploy guide: GitHub + CI + Vercel (frontend) + Render (API) + MongoDB Atlas

## 0. What was fixed in this version
- CI test failure: the "role change" test left a verified alumni account behind, so later tests counting verified alumni got 2 instead of 1. The test now removes that account.
- Removed two stray Python `.whl` files (about 1.3 MB) from `server/`; they do not belong in a Node project.
- CI workflow: runs on pushes to `main`/`master`, PRs and manually; added timeout and concurrency.
- Added `.gitattributes` (LF line endings) and a stronger `.gitignore`.

## 1. Push to GitHub (do NOT upload the .zip itself)
The zip must be **extracted first**. GitHub Actions only reads `.github/workflows/ci.yml` at the **root of the repository**, so the repo root must be the folder that contains `package.json`, `client/`, `server/` and `.github/`.

1. Unzip. Open the inner folder `AlumniMentorshipPortal` (it contains `package.json`).
2. On github.com create a new empty repository (no README, no .gitignore).
3. In a terminal inside that folder:
   ```
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR-USER/YOUR-REPO.git
   git push -u origin main
   ```
4. Open the repo -> **Actions** tab -> the "CI" run should turn green.
   Check on GitHub that `.github/workflows/ci.yml`, `client/` and `server/` are at the top level (not inside an extra folder).

If you previously pushed the zip or a wrong layout: delete that repo (Settings -> Delete) or run `git rm` on the wrong files, then push again as above.

## 2. MongoDB Atlas (database) - manual
1. https://cloud.mongodb.com -> create a free M0 cluster.
2. Database Access -> add a user + password.
3. Network Access -> Add IP `0.0.0.0/0`.
4. Connect -> Drivers -> copy the string, e.g.
   `mongodb+srv://USER:PASS@cluster0.xxxx.mongodb.net/alumni_mentorship`

## 3. Deploy the API on Render - manual
Vercel cannot run this Express + Socket.IO server, so the API goes on Render (free tier).
1. https://render.com -> New -> **Blueprint** -> pick your GitHub repo (uses `render.yaml`).
2. When asked, set `MONGO_URI` (from step 2) and `CLIENT_URL` (your Vercel URL; you can put a placeholder now and edit it after step 4).
3. After deploy, open `https://YOUR-API.onrender.com/api/health` - it must show `{"status":"ok"...}`.
4. Optional demo data: Render Shell -> `npm run seed` (all passwords `password123`).

## 4. Deploy the website on Vercel - manual
1. https://vercel.com -> Add New -> Project -> import the GitHub repo.
2. **Root Directory: `client`**. Framework preset: Vite (auto). Node version 22.x (Settings -> General).
3. Environment Variables (Production + Preview):
   - `VITE_API_URL` = `https://YOUR-API.onrender.com/api`
   - `VITE_SOCKET_URL` = `https://YOUR-API.onrender.com`
4. Deploy. Then copy the Vercel URL (e.g. `https://your-app.vercel.app`) into Render's `CLIENT_URL` (exact origin, no trailing slash) and redeploy the API.
5. Any env var change in Vercel needs a **Redeploy**.

## 5. Troubleshooting
| Problem | Fix |
|---|---|
| CI red: `npm ci` lockfile error | Run `npm install` in the failing folder, commit the updated `package-lock.json`. |
| CI red on tests | Open the failed step log; tests need MongoDB, which the workflow provides as a service. |
| CI not running at all | `.github/workflows/ci.yml` is not at repo root, or Actions are disabled (Settings -> Actions). |
| Vercel site loads but login says "Cannot reach the server" | `VITE_API_URL` missing/wrong, or Render is asleep (wait ~60 s), or `CLIENT_URL` on Render does not exactly match the Vercel URL (CORS). |
| Vercel build fails on Node version | Set Node 22.x in Vercel project settings. |
| Page refresh gives 404 | Root Directory must be `client` so `client/vercel.json` rewrites apply. |
