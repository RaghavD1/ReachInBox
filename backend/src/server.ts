import "dotenv/config";
// Start the email worker (no cron — pure BullMQ delayed jobs)
import "./worker/email.worker";
import app from "./app";
import prisma from "./db/prisma";
import { emailQueue, addEmailJob } from "./queue/email.queue";
import { initElasticsearch } from "./utils/elasticsearch";

const PORT = process.env.PORT || 3000;

/**
 * PERSISTENCE ON RESTART:
 * On startup, query DB for all emails that are still in "scheduled" status
 * and whose scheduledAt is in the future. Re-add them to BullMQ if their
 * jobId no longer exists in the queue (idempotency key prevents duplicates).
 */
async function restorePendingJobs() {
    console.log("[Startup] Restoring pending scheduled emails...");
    const pendingEmails = await prisma.email.findMany({
        where: {
            status: { in: ["scheduled"] },
            scheduledAt: { gt: new Date() },
        },
        include: { sender: true },
    });

    let restored = 0;
    for (const email of pendingEmails) {
        // Check if job already exists in BullMQ
        if (email.jobId) {
            const existingJob = await emailQueue.getJob(email.jobId);
            if (existingJob) continue; // Already in queue — skip
        }

        // Job missing — re-add it
        const delayMs = Math.max(0, email.scheduledAt.getTime() - Date.now());
        const senderEmail = email.sender?.email || "noreply@reachinbox.dev";

        try {
            const job = await addEmailJob(email.id, {
                emailId: email.id,
                to: email.to,
                subject: email.subject,
                body: email.body,
                senderEmail,
                senderId: email.senderId || undefined,
                userId: email.userId || undefined,
                idempotencyKey: email.idempotencyKey,
            }, delayMs);

            await prisma.email.update({
                where: { id: email.id },
                data: { jobId: job.id || null },
            });

            restored++;
            console.log(`[Startup] Restored email ${email.id} → delayed by ${Math.round(delayMs / 1000)}s`);
        } catch (err) {
            // idempotencyKey already in queue as jobId — that's fine
            console.log(`[Startup] Email ${email.id} already in queue (idempotent).`);
        }
    }

    console.log(`[Startup] ✅ Restored ${restored}/${pendingEmails.length} pending emails`);
}

async function main() {
    // Initialize Elasticsearch (optional — degrades gracefully if not running)
    await initElasticsearch();

    // Restore pending jobs from DB
    await restorePendingJobs();

    app.listen(PORT, () => {
        console.log(`🚀 ReachInbox Email Scheduler running on http://localhost:${PORT}`);
        console.log(`📊 BullMQ Dashboard: http://localhost:${PORT}/admin/queues`);
    });
}

main().catch(console.error);