import "dotenv/config";
import { Redis } from "ioredis";

const REDIS_HOST = process.env.REDIS_HOST || "127.0.0.1";
const REDIS_PORT = Number(process.env.REDIS_PORT) || 6379;

export const redisConnection = new Redis({
    host: REDIS_HOST,
    port: REDIS_PORT,
    maxRetriesPerRequest: null,
});

redisConnection.on("connect", () => console.log("[Redis] Connected ✅"));
redisConnection.on("error", (err) => console.error("[Redis] Error:", err));