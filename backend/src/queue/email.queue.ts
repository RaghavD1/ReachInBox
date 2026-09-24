import { Queue } from "bullmq";
import { redisConnection } from "./redis";

// Single email queue — no cron, only BullMQ delayed jobs
export const emailQueue = new Queue("emailQueue", {
    connection: redisConnection,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: "exponential",
            delay: 5000,
        },
        removeOnComplete: { age: 7 * 24 * 3600, count: 1000 },
        removeOnFail: { age: 7 * 24 * 3600, count: 500 },
    },
});

/**
 * Add a single email send job to the queue with an idempotency key.
 * BullMQ will deduplicate by jobId if the same key is added again.
 */
export const addEmailJob = async (
    emailId: string,
    emailData: EmailJobData,
    delayMs: number
) => {
    const job = await emailQueue.add(
        "sendEmail",
        emailData,
        {
            delay: delayMs,
            jobId: emailData.idempotencyKey, // ensures idempotency — same key = same job, won't duplicate
        }
    );
    return job;
};

export interface EmailJobData {
    emailId: string;
    to: string;
    subject: string;
    body: string;
    senderEmail: string;
    senderId?: string;
    userId?: string;
    idempotencyKey: string;
}
