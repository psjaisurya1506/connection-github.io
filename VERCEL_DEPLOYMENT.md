# Deploy the portal with Vercel

The client is a Vite single-page app, while the API and Socket.IO server are a
long-running Express service. Deploy the client to Vercel and the server to a
Node host such as Render. Vercel's static hosting does not run the persistent
Socket.IO server required for live messaging.

## 1. Deploy the API

Deploy the repository's existing `render.yaml` blueprint, or create a Node web
service with the repository root as its root directory:

- Build command: `npm run setup && npm run build`
- Start command: `npm start`
- Health check path: `/api/health`

Set these environment variables in the host dashboard:

| Variable | Value |
| --- | --- |
| `NODE_ENV` | `production` |
| `MONGO_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` | A unique, long random secret |
| `CLIENT_URL` | The Vercel site's exact origin, for example `https://portal.example.com` |

Do not commit production credentials or put them in frontend variables. Make
sure the database network rules allow connections from the API host.

## 2. Deploy the client to Vercel

1. Import the GitHub repository into Vercel.
2. Set **Root Directory** to `client`.
3. Use the Vite framework preset with Node.js 22.12 or later. The build command is `npm run build`, and the
   output directory is `dist`.
4. Add these environment variables for the Production environment (and Preview
   if needed):

   | Variable | Value |
   | --- | --- |
   | `VITE_API_URL` | `https://YOUR-API-HOST/api` |
   | `VITE_SOCKET_URL` | `https://YOUR-API-HOST` |

5. Redeploy after adding or changing environment variables.

The existing `client/vercel.json` rewrites app routes to `index.html`, allowing
client-side routes to load directly and on refresh.

## 3. Verify the deployment

- Open `https://YOUR-API-HOST/api/health` and confirm it returns a healthy status.
- Open the Vercel site, register or sign in, and check that API-backed pages load.
- Check browser network requests and the API host logs if requests fail. Confirm
  `CLIENT_URL` exactly matches the deployed Vercel origin.
- Confirm messaging connects to the API host's Socket.IO endpoint.

## GitHub checks

The added GitHub Actions workflow installs all three workspaces, starts a MongoDB
service for the API tests, and runs the client lint and production build on pushes
and pull requests. A green CI check does not deploy the application; Vercel and
the API host deploy from their own project settings.

See `DEPLOY_GUIDE.md` for the complete step-by-step walkthrough.
