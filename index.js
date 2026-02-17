import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

let currentResult = {
  dice1: 1,
  dice2: 1,
  dice3: 1
};

let isOpen = false;

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.emit("gameState", {
    currentResult,
    isOpen
  });

  socket.on("adminSetResult", (data) => {
    currentResult = data;
    isOpen = false;

    io.emit("gameState", {
      currentResult,
      isOpen
    });

    console.log("Admin set result:", data);
  });

  socket.on("openResult", () => {
    isOpen = true;

    io.emit("gameState", {
      currentResult,
      isOpen
    });

    console.log("Result opened");
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, "../../dist")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../../dist/index.html"));
});

const PORT = process.env.PORT || 8080;

server.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});