import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";

// Add prisma to the global type in development to prevent 
// exhausting database connections during hot reloads
const globalForPrisma = global as unknown as { prisma: PrismaClient };

import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const dbUrl = new URL(process.env.DATABASE_URL!);
const pool = new pg.Pool({
  user: dbUrl.username,
  password: decodeURIComponent(dbUrl.password),
  host: dbUrl.hostname,
  port: Number(dbUrl.port),
  database: dbUrl.pathname.slice(1)
});

const adapter = new PrismaPg(pool);

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter,
    log: ["query"], // Logs database queries to the terminal (optional)
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
