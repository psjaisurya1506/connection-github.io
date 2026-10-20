const path = require("path");
const fs = require("fs");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const { notFound, errorHandler } = require("./middleware/error");

const app = express();

const origins = (process.env.CLIENT_URL || "http://localhost:5173").split(",").map((s) => s.trim());
app.use(helmet());
app.use(cors({ origin: origins, credentials: true }));
app.use(express.json({ limit: "200kb" }));
// Express 5 leaves req.body undefined when a request has no JSON body; controllers expect an object.
app.use((req, res, next) => { if (req.body === undefined) req.body = {}; next(); });
if (process.env.NODE_ENV !== "test") app.use(morgan("dev"));

// If the React app has been built (npm run build), this server also serves it, so one URL = UI + API.
const clientDist = path.resolve(__dirname, process.env.CLIENT_DIST || "../client/dist");
const hasClient = process.env.NODE_ENV !== "test" && fs.existsSync(path.join(clientDist, "index.html"));

if (!hasClient) app.get("/", (req, res) => res.json({ message: "Alumni Mentorship Portal API is running" }));
app.get("/api/health", (req, res) => res.json({ status: "ok", time: new Date() }));

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/requests", require("./routes/requestRoutes"));
app.use("/api/jobs", require("./routes/jobRoutes"));
app.use("/api/messages", require("./routes/messageRoutes"));
app.use("/api/sessions", require("./routes/sessionRoutes"));
app.use("/api", require("./routes/miscRoutes"));

if (hasClient) {
  app.use(express.static(clientDist, { index: false, maxAge: "7d", setHeaders: (res, file) => { if (file.endsWith(".html")) res.setHeader("Cache-Control", "no-cache"); } }));
  // Any page-like GET (e.g. a refresh on /student/dashboard) gets the React app instead of a 404.
  // Paths with a file extension or under /assets fall through to a real 404 so a stale file is never served as HTML.
  app.get(/^\/(?!api(\/|$)|socket\.io(\/|$)|assets\/)[^.]*$/, (req, res) => {
    res.setHeader("Cache-Control", "no-cache");
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

app.use(notFound);
app.use(errorHandler);

module.exports = app;
