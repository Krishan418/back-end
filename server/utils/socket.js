import { Server } from "socket.io";

let io = null;

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST", "PUT", "DELETE"],
    },
  });

  io.on("connection", (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    socket.on("join", (room) => {
      socket.join(room);
      console.log(`🔌 Client ${socket.id} joined room: ${room}`);
    });

    socket.on("disconnect", () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = () => {
  return io;
};

export const broadcastEvent = (event, data) => {
  if (io) {
    io.emit(event, data);
    console.log(`📢 Broadcasted event '${event}':`, data?._id || data);
  } else {
    console.warn("⚠️ Cannot broadcast, Socket.io not initialized.");
  }
};
