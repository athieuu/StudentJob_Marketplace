import { io, Socket } from "socket.io-client";

const SOCKET_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api")
  .replace(/\/$/, "")
  .replace(/\/api$/, "");

export const createChatSocket = (token: string): Socket => {
  return io(SOCKET_URL, {
    autoConnect: false,
    transports: ["websocket", "polling"],
    auth: {
      token,
    },
  });
};
