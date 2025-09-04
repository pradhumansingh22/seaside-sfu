import express from "express";
import cors from "cors";
import userRouter from "./routes/userRoutes.js";
import spaceRouter from "./routes/spaceRoutes.js";
import dotenv from "dotenv";
import { startWebSocketServer } from "./ws/index.js";
dotenv.config();


const app = express();
app.use(
  cors({
    origin: ["http://localhost:3000", "http://192.168.1.100:3000"],
    methods: ["GET", "POST"],
  })
);

app.use(express.json());
app.use("/api/v1/user", userRouter);
app.use("/api/v1/space", spaceRouter);

const server = app.listen(8080, "0.0.0.0", () => {
  console.log("Server listening on port 8080");
});

startWebSocketServer(server);
