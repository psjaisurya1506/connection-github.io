require("dotenv").config({ quiet: true });

// Fail fast (or fall back in development) instead of crashing later with "secretOrPrivateKey must have a value".
if (!process.env.JWT_SECRET) {
  if (process.env.NODE_ENV === "production") {
    console.error("JWT_SECRET is not set. Set it in your environment before starting in production.");
    process.exit(1);
  }
  process.env.JWT_SECRET = "dev-only-insecure-secret-change-me";
  console.warn("JWT_SECRET is not set - using an insecure development secret. Copy .env.example to .env and set your own.");
}

const { createServer } = require("http");
const mongoose = require("mongoose");
const app = require("./app");
const connectDB = require("./config/db");
const initSocket = require("./socket");

const port = Number(process.env.PORT) || 5000;

async function startServer() {
  await connectDB();
  const httpServer = createServer(app);
  initSocket(httpServer, app);

  httpServer.on("error", (err) => {
    console.error(err.code === "EADDRINUSE" ? `Port ${port} is already in use. Stop the other process or change PORT in server/.env.` : err);
    process.exit(1);
  });

  httpServer.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });

  const shutdown = (signal) => {
    console.log(`${signal} received, shutting down...`);
    httpServer.close(async () => {
      await mongoose.disconnect().catch(() => {});
      process.exit(0);
    });
    setTimeout(() => process.exit(0), 5000).unref();
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

process.on("unhandledRejection", (reason) => console.error("Unhandled promise rejection:", reason));

startServer().catch((error) => {
  console.error("Failed to start server:", error.message || error);
  process.exit(1);
});
