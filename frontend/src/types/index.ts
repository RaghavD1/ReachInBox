export interface User {
    id: string;
    email: string;
    name: string;
    avatar?: string;
    slackConnected: boolean;
    slackTeam?: string;
    slackChannel?: string;
}

export interface Email {
    id: string;
    to: string;
    subject: string;
    body: string;
    status: "scheduled" | "sending" | "sent" | "failed" | "cancelled";
    scheduledAt: string;
    sentAt?: string | null;
    jobId?: string | null;
    idempotencyKey: string;
    errorMessage?: string | null;
    previewUrl?: string | null;
    createdAt: string;
    updatedAt: string;
    sender?: {
        email: string;
        name: string;
    } | null;
}

export interface EmailsResponse {
    emails: Email[];
    total: number;
    page: number;
    limit: number;
}

export interface ScheduleEmailsPayload {
    leads: string[];
    subject: string;
    body: string;
    senderEmail: string;
    startTime: string;
    delayBetweenSeconds: number;
    hourlyLimit?: number;
}

export interface ApiError {
    message: string;
    error?: string;
}
