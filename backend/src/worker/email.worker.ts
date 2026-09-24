import "dotenv/config";
import { Worker, Job } from "bullmq";
import { redisConnection } from "../queue/redis";
import prisma from "../db/prisma";
import nodemailer from "nodemailer";
import { indexEmail } from "../utils/elasticsearch";
import { sendSlackRateLimitNotification } from "../services/slack.service";
import type { EmailJobData } from "../queue/email.queue";

// ─── Config ────────────────────────────────────────────────────────────────
const CONCURRENCY = Number(process.env.WORKER_CONCURRENCY) || 5;
const MAX_EMAILS_PER_HOUR_PER_SENDER = Number(process.env.MAX_EMAILS_PER_HOUR_PER_SENDER) || 100;
const MIN_DELAY_BETWEEN_SENDS_MS = Number(process.env.MIN_DELAY_BETWEEN_SENDS_MS) || 2000;

// ─── Transporter pool (one per sender email) ────────────────────────────────
const transporterCache = new Map<string, nodemailer.Transporter>();

async function getTransporter(senderEmail: string): Promise<nodemailer.Transporter> {
    if (transporterCache.has(senderEmail)) {
        return transporterCache.get(senderEmail)!;
    }

    // Try to load credentials from DB
    const sender = await prisma.sender.findUnique({ where: { email: senderEmail } });
    if (sender) {
        const t = nodemailer.createTransport({
            host: sender.smtpHost,
            port: sender.smtpPort,
            secure: false,
            auth: { user: sender.smtpUser, pass: sender.smtpPass },
        });
        transporterCache.set(senderEmail, t);
        return t;
    }

    // Fallback: create a fresh Ethereal account for unknown sender
    const testAccount = await nodemailer.createTestAccount();
    const t = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: { user: testAccount.user, pass: testAccount.pass },
    });
    console.log(`[Worker] Created Ethereal account for ${senderEmail}: ${testAccount.user}`);
    transporterCache.set(senderEmail, t);
    return t;
}

// ─── Redis rate-limit counter ────────────────────────────────────────────────
function getHourWindow(): string {
    const now = new Date();
    return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}-${String(now.getUTCHours()).padStart(2, "0")}`;
}

async function checkAndIncrementRateLimit(senderEmail: string): Promise<{ allowed: boolean; count: number; window: string }> {
    const window = getHourWindow();
    const key = `rate_limit:${senderEmail}:${window}`;
    const count = await redisConnection.incr(key);
    if (count === 1) {
        // Set TTL of 2 hours to auto-expire the key
        await redisConnection.expire(key, 7200);
    }
    return { allowed: count <= MAX_EMAILS_PER_HOUR_PER_SENDER, count, window };
}

// Returns ms until start of next UTC hour
function msUntilNextHour(): number {
    const now = new Date();
    const nextHour = new Date(now);
    nextHour.setUTCHours(now.getUTCHours() + 1, 0, 0, 0);
    return nextHour.getTime() - now.getTime();
}

// ─── Worker ─────────────────────────────────────────────────────────────────
export const emailWorker = new Worker<EmailJobData>(
    "emailQueue",
    async (job: Job<EmailJobData>) => {
        const { emailId, to, subject, body, senderEmail, userId, idempotencyKey } = job.data;

        console.log(`[Worker] Processing email job ${job.id} → to: ${to}`);

        // ── Idempotency check ─────────────────────────────────────────────
        const existingEmail = await prisma.email.findUnique({
            where: { idempotencyKey },
        });
        if (existingEmail?.status === "sent") {
            console.log(`[Worker] Email ${emailId} already sent. Skipping (idempotency).`);
            return;
        }

        // ── Rate limit check ──────────────────────────────────────────────
        const { allowed, count, window } = await checkAndIncrementRateLimit(senderEmail);
        if (!allowed) {
            // Decrement back the counter since we're not actually sending
            const key = `rate_limit:${senderEmail}:${window}`;
            await redisConnection.decr(key);

            const delayMs = msUntilNextHour();
            const rescheduledTo = new Date(Date.now() + delayMs).toISOString();

            console.warn(`[Worker] Rate limit reached for ${senderEmail} (${count - 1}/${MAX_EMAILS_PER_HOUR_PER_SENDER}). Rescheduling to ${rescheduledTo}`);

            // Notify via Slack if user has it connected
            if (userId) {
                await sendSlackRateLimitNotification(
                    userId,
                    senderEmail,
                    window,
                    rescheduledTo
                );
            }

            // Re-add job delayed to next hour (preserves the job, not dropped)
            const { emailQueue } = await import("../queue/email.queue");
            await emailQueue.add("sendEmail", job.data, {
                delay: delayMs,
                jobId: `${idempotencyKey}_retry_${Date.now()}`,
            });

            await prisma.email.update({
                where: { id: emailId },
                data: {
                    status: "scheduled",
                    scheduledAt: new Date(Date.now() + delayMs),
                    errorMessage: `Rate limited — rescheduled to ${rescheduledTo}`,
                },
            });

            return; // Current job is done — new delayed job takes over
        }

        // ── Min delay between sends ────────────────────────────────────────
        await new Promise((resolve) => setTimeout(resolve, MIN_DELAY_BETWEEN_SENDS_MS));

        // ── Mark as sending ───────────────────────────────────────────────
        await prisma.email.update({
            where: { id: emailId },
            data: { status: "sending" },
        });

        // ── Send email ────────────────────────────────────────────────────
        const transporter = await getTransporter(senderEmail);

        const info = await transporter.sendMail({
            from: `"ReachInbox" <${senderEmail}>`,
            to,
            subject,
            text: body,
            html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto"><p>${body.replace(/\n/g, "<br>")}</p><hr><small style="color:#888">Sent via ReachInbox Email Scheduler</small></div>`,
        });

        const previewUrl = nodemailer.getTestMessageUrl(info) || undefined;
        const sentAt = new Date();

        console.log(`[Worker] ✅ Email sent to ${to}. Message ID: ${info.messageId}`);
        if (previewUrl) console.log(`[Worker] 📬 Preview URL: ${previewUrl}`);

        // ── Update DB ─────────────────────────────────────────────────────
        const updatedEmail = await prisma.email.update({
            where: { id: emailId },
            data: {
                status: "sent",
                sentAt,
                previewUrl: typeof previewUrl === "string" ? previewUrl : null,
                errorMessage: null,
            },
        });

        // ── Index in Elasticsearch ─────────────────────────────────────────
        await indexEmail({
            id: updatedEmail.id,
            to: updatedEmail.to,
            subject: updatedEmail.subject,
            body: updatedEmail.body,
            status: updatedEmail.status,
            senderEmail,
            scheduledAt: updatedEmail.scheduledAt,
            sentAt: updatedEmail.sentAt,
            createdAt: updatedEmail.createdAt,
        });
    },
    {
        connection: redisConnection,
        concurrency: CONCURRENCY,
        limiter: {
            max: 1,
            duration: MIN_DELAY_BETWEEN_SENDS_MS,
        },
    }
);

// ─── Worker event handlers ───────────────────────────────────────────────────
emailWorker.on("completed", (job) => {
    console.log(`[Worker] Job ${job.id} completed`);
});

emailWorker.on("failed", async (job, err) => {
    console.error(`[Worker] Job ${job?.id} failed:`, err.message);
    if (job?.data?.emailId) {
        try {
            await prisma.email.update({
                where: { id: job.data.emailId },
                data: {
                    status: "failed",
                    errorMessage: err.message,
                },
            });
        } catch (e) {
            console.error("[Worker] Failed to update email status:", e);
        }
    }
});

emailWorker.on("error", (err) => {
    console.error("[Worker] Worker error:", err);
});

console.log(`[Worker] Email worker started (concurrency=${CONCURRENCY}, maxPerHour=${MAX_EMAILS_PER_HOUR_PER_SENDER}, minDelay=${MIN_DELAY_BETWEEN_SENDS_MS}ms)`);
