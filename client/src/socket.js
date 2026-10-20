import { io } from "socket.io-client";

let socket = null;

export function connectSocket(token) {
  disconnectSocket();
  socket = io(import.meta.env.VITE_SOCKET_URL || undefined, { auth: { token }, transports: ["websocket", "polling"] });
  return socket;
}
export const getSocket = () => socket;
export function disconnectSocket() {
  if (socket) socket.disconnect();
  socket = null;
}
