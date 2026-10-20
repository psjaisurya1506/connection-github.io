const { Server } = require("socket.io");
const User = require("./models/User");
const { verify } = require("./utils/token");

// Real-time layer: every user joins a private room "user:<id>". REST controllers emit into it.
module.exports = function initSocket(httpServer, app) {
  const origins = (process.env.CLIENT_URL || "http://localhost:5173").split(",").map((s) => s.trim());
  const io = new Server(httpServer, { cors: { origin: origins, credentials: true } });
  const online = new Map(); // userId -> connection count

  io.use(async (socket, next) => {
    try {
      const payload = verify(socket.handshake.auth?.token);
      const user = await User.findById(payload.id).select("_id isActive");
      if (!user || user.isActive === false) throw new Error("inactive");
      socket.userId = String(user._id);
      next();
    } catch {
      next(new Error("Authentication failed"));
    }
  });

  io.on("connection", (socket) => {
    socket.join(`user:${socket.userId}`);
    online.set(socket.userId, (online.get(socket.userId) || 0) + 1);
    io.emit("presence", { userId: socket.userId, online: true });
    socket.emit("presence:list", [...online.keys()]);

    socket.on("typing", ({ to }) => {
      if (typeof to === "string") io.to(`user:${to}`).emit("typing", { from: socket.userId });
    });

    socket.on("disconnect", () => {
      const n = (online.get(socket.userId) || 1) - 1;
      if (n <= 0) {
        online.delete(socket.userId);
        io.emit("presence", { userId: socket.userId, online: false });
      } else online.set(socket.userId, n);
    });
  });

  app.set("io", io);
  return io;
};
