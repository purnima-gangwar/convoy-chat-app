import express from "express";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";

import authRoutes from "./routes/authRoutes";
import messageRoutes from "./routes/messageRoutes";
import userRoutes from "./routes/userRoutes";
import prisma from "./config/prisma";

const app = express();

app.use(cors());
app.use(express.json());

const server = http.createServer(app);

const onlineUsers = new Map<string, string>();

export const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log("User Connected:", socket.id);

  // JOIN USER
  socket.on("join", (userId: string) => {
    onlineUsers.set(userId, socket.id);
    io.emit("onlineUsers", Array.from(onlineUsers.keys()));
  });

  // SEND MESSAGE
  socket.on("sendMessage", async (data) => {
    const receiverSocketId = onlineUsers.get(data.receiverId);

    // send message to receiver
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("receiveMessage", {
        ...data,
        isDelivered: true, // IMPORTANT
      });
    }

    // update sender: delivered tick
    if (data.id) {
      socket.emit("messageDelivered", data.id);
    }
  });

  // SEEN MESSAGE
  socket.on("messageSeen", async ({ senderId, receiverId }) => {
    const senderSocketId = onlineUsers.get(senderId);

    // update DB (optional but correct for real app)
    try {
      await prisma.message.updateMany({
        where: {
          senderId,
          receiverId,
        },
        data: {
          isSeen: true,
        },
      });
    } catch (err) {
      console.log(err);
    }

    // notify sender
    if (senderSocketId) {
      io.to(senderSocketId).emit("messagesSeen", {
        receiverId,
      });
    }
  });

  // DISCONNECT
  socket.on("disconnect", () => {
    for (const [userId, socketId] of onlineUsers) {
      if (socketId === socket.id) {
        onlineUsers.delete(userId);
        break;
      }
    }

    io.emit("onlineUsers", Array.from(onlineUsers.keys()));
    console.log("User Disconnected:", socket.id);
  });
});

// ROUTES
app.get("/", (req, res) => {
  res.send("Convoy Backend Running 🚀");
});

app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/users", userRoutes);

const PORT = 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});