import express from "express";
import http from "http";
import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { env } from "./config/env.js";
import { redisPub, redisSub } from "./config/redis.js";
import { applySecurity } from "./middlewares/security.js";
import { healthRouter } from "./routes/health.routes.js";
import { meetingRouter } from "./routes/meeting.routes.js";
import { mediasoupManager } from "./mediasoup/manager.js";
import { registerSocketHandlers } from "./socket/register.js";

const app = express();
applySecurity(app);
app.use(express.json({ limit: "1mb" }));
app.use("/health", healthRouter);
app.use("/meetings", meetingRouter);

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: env.CLIENT_ORIGIN, credentials: true },
  transports: ["websocket", "polling"],
  connectionStateRecovery: { maxDisconnectionDuration: 120_000 }
});

io.adapter(createAdapter(redisPub, redisSub));

await mediasoupManager.init();
registerSocketHandlers(io);

server.listen(env.SERVER_PORT, () => {
  console.log(`server listening on :${env.SERVER_PORT}`);
});

process.on("SIGTERM", () => {
  server.close(() => process.exit(0));
});
