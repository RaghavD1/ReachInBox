import "dotenv/config";
import nodemailer from "nodemailer";

import prisma from "../db/prisma";
import { addEmailJob, emailQueue } from "../queue/email.queue";
import { searchEmails } from "../utils/elasticsearch";

export interface ScheduleEmailsInput {
    leads: string[];
    subject: string;
    body: string;
    senderEmail: string;
    startTime: Date;
    delayBetweenMs: number;
    hourlyLimit?: number;
    userId?: string;
}

/**
 * Schedule a batch of emails.
 * Each lead gets its own delayed BullMQ job.
 */
export const scheduleEmailsService = async (
    input: ScheduleEmailsInput
) => {
    const {
        leads,
        subject,
        body,
        senderEmail,
        startTime,
        delayBetweenMs,
        userId,
    } = input;

    // Check whether sender already exists
    let sender = await prisma.sender.findUnique({
        where: {
            email: senderEmail,
        },
    });

    // Create sender if it doesn't exist
    if (!sender) {
        const testAccount = await nodemailer.createTestAccount();

        sender = await prisma.sender.create({
            data: {
                email: senderEmail,
                name: senderEmail.split("@")[0],
                smtpUser: testAccount.user,
                smtpPass: testAccount.pass,
                smtpHost: "smtp.ethereal.email",
                smtpPort: 587,
            },
        });

       
    }

    const scheduledEmails = [];

    for (let i = 0; i < leads.length; i++) {
        const to = leads[i].trim();

        // Skip invalid email addresses
        if (!to || !to.includes("@")) {
            continue;
        }

        const scheduledAt = new Date(
            startTime.getTime() + i * delayBetweenMs
        );

        const delayMs = Math.max(
            0,
            scheduledAt.getTime() - Date.now()
        );

        const idempotencyKey =
            `${senderEmail}:${to}:${subject}:${startTime.toISOString()}:${i}`;

        // Prevent duplicate scheduling
        const existing = await prisma.email.findUnique({
            where: {
                idempotencyKey,
            },
        });

        if (existing) {
            scheduledEmails.push(existing);
            continue;
        }

        // Create email record
        const email = await prisma.email.create({
            data: {
                to,
                subject,
                body,
                status: "scheduled",
                scheduledAt,
                idempotencyKey,
                userId: userId ?? null,
                senderId: sender.id,
            },
        });

        // Add email to BullMQ
        const job = await addEmailJob(
            email.id,
            {
                emailId: email.id,
                to,
                subject,
                body,
                senderEmail,
                senderId: sender.id,
                userId: userId ?? undefined,
                idempotencyKey,
            },
            delayMs
        );

        // Save BullMQ job ID
        await prisma.email.update({
            where: {
                id: email.id,
            },
            data: {
                jobId: job.id ?? null,
            },
        });

        scheduledEmails.push({
            ...email,
            jobId: job.id,
        });
    }

    return scheduledEmails;
};

/**
 * Get scheduled emails
 */
export const getScheduledEmailsService = async (
    userId?: string,
    page = 1,
    limit = 20
) => {
    const where: any = {
        status: {
            in: ["scheduled", "sending"],
        },
    };

    if (userId) {
        where.userId = userId;
    }

    const [emails, total] = await Promise.all([
        prisma.email.findMany({
            where,
            orderBy: {
                scheduledAt: "asc",
            },
            skip: (page - 1) * limit,
            take: limit,
            include: {
                sender: {
                    select: {
                        email: true,
                        name: true,
                    },
                },
            },
        }),

        prisma.email.count({
            where,
        }),
    ]);

    return {
        emails,
        total,
        page,
        limit,
    };
};

/**
 * Get sent/failed/cancelled emails
 */
export const getSentEmailsService = async (
    userId?: string,
    page = 1,
    limit = 20
) => {
    const where: any = {
        status: {
            in: ["sent", "failed", "cancelled"],
        },
    };

    if (userId) {
        where.userId = userId;
    }

    const [emails, total] = await Promise.all([
        prisma.email.findMany({
            where,
            orderBy: {
                sentAt: "desc",
            },
            skip: (page - 1) * limit,
            take: limit,
            include: {
                sender: {
                    select: {
                        email: true,
                        name: true,
                    },
                },
            },
        }),

        prisma.email.count({
            where,
        }),
    ]);

    return {
        emails,
        total,
        page,
        limit,
    };
};

/**
 * Cancel a scheduled email
 */
export const cancelEmailService = async (
    emailId: string
) => {
    const email = await prisma.email.findUnique({
        where: {
            id: emailId,
        },
    });

    if (!email) {
        throw new Error("Email not found");
    }

    if (email.status !== "scheduled") {
        throw new Error(
            `Cannot cancel email with status: ${email.status}`
        );
    }

    // Remove BullMQ job
    if (email.jobId) {
        const job = await emailQueue.getJob(email.jobId);

        if (job) {
            await job.remove();
        }
    }

    // Update DB status
    return prisma.email.update({
        where: {
            id: emailId,
        },
        data: {
            status: "cancelled",
        },
    });
};

/**
 * Search emails
 */
export const searchEmailsService = async (
    query: string,
    page = 1,
    limit = 20
) => {
    const hits = await searchEmails(
        query,
        (page - 1) * limit,
        limit
    );

    // Elasticsearch unavailable → search PostgreSQL
    if (!hits) {
        const emails = await prisma.email.findMany({
            where: {
                OR: [
                    {
                        subject: {
                            contains: query,
                            mode: "insensitive",
                        },
                    },
                    {
                        to: {
                            contains: query,
                            mode: "insensitive",
                        },
                    },
                    {
                        body: {
                            contains: query,
                            mode: "insensitive",
                        },
                    },
                ],
            },
            orderBy: {
                createdAt: "desc",
            },
            take: limit,
            skip: (page - 1) * limit,
        });

        return {
            source: "db",
            emails,
            total: emails.length,
        };
    }

    return {
        source: "elasticsearch",
        emails: hits.hits.map((h: any) => ({
            id: h._id,
            ...h._source,
        })),
        total:
            typeof hits.total === "number"
                ? hits.total
                : hits.total?.value ?? 0,
    };
};