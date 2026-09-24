import "dotenv/config";
import express from "express";
import cors from "cors";
import session from "express-session";
import cookieParser from "cookie-parser";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import { emailQueue } from "./queue/email.queue";
import emailRoutes from "./routes/email.routes";
import authRoutes from "./routes/auth.routes";
import slackRoutes from "./routes/slack.routes";

const app = express();

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({
    origin: FRONTEND_URL,
    credentials: true,
}));
app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());
app.use(session({
    secret: process.env.SESSION_SECRET || "reachinbox-session-secret-change-in-prod",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, httpOnly: true, maxAge: 24 * 60 * 60 * 1000 },
}));

// ─── BullMQ Dashboard ─────────────────────────────────────────────────────────
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath("/admin/queues");
createBullBoard({
    queues: [new BullMQAdapter(emailQueue)],
    serverAdapter,
});
app.use("/admin/queues", serverAdapter.getRouter());

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use("/auth", authRoutes);
app.use("/slack", slackRoutes);
app.use("/emails", emailRoutes);

// ─── Health check ─────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
    res.status(200).json({ status: "OK", message: "ReachInbox Email Scheduler is running 🚀" });
});

export default app;