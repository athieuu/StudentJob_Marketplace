
import { io, Socket } from "socket.io-client";

const SOCKET_URL = "http://localhost:5000";

export const createChatSocket = (token: string): Socket => {
    return io(SOCKET_URL, {
        autoConnect: false,
        transports: ["websocket", "polling"],
        auth: {
            token
        }
    });
};
