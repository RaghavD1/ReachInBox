import { Request, Response } from "express";
import {
    scheduleEmailsService,
    getScheduledEmailsService,
    getSentEmailsService,
    cancelEmailService,
    searchEmailsService,
} from "../services/email.service";

export const scheduleEmailsController = async (req: Request, res: Response) => {
    try {
        const { leads, subject, body, senderEmail, startTime, delayBetweenSeconds, hourlyLimit } = req.body;
        const userId = (req as any).userId;

        if (!leads || !subject || !body || !senderEmail || !startTime) {
            return res.status(400).json({
                message: "leads, subject, body, senderEmail, and startTime are required",
            });
        }

        if (!Array.isArray(leads) || leads.length === 0) {
            return res.status(400).json({ message: "leads must be a non-empty array of email addresses" });
        }

        const result = await scheduleEmailsService({
            leads,
            subject,
            body,
            senderEmail,
            startTime: new Date(startTime),
            delayBetweenMs: (delayBetweenSeconds || 5) * 1000,
            hourlyLimit: hourlyLimit || undefined,
            userId,
        });

        return res.status(201).json({
            message: `${result.length} email(s) scheduled successfully`,
            data: result,
        });
    } catch (error) {
        console.error("Error scheduling emails:", error);
        return res.status(500).json({
            message: "Internal Server Error",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
};

export const getScheduledEmailsController = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 20;
        const result = await getScheduledEmailsService(userId, page, limit);
        return res.status(200).json(result);
    } catch (error) {
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

export const getSentEmailsController = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 20;
        const result = await getSentEmailsService(userId, page, limit);
        return res.status(200).json(result);
    } catch (error) {
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

export const cancelEmailController = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const result = await cancelEmailService(id);
        return res.status(200).json({ message: "Email cancelled", data: result });
    } catch (error) {
        const msg = error instanceof Error ? error.message : "Unknown error";
        const status = msg.includes("not found") ? 404 : msg.includes("Cannot cancel") ? 400 : 500;
        return res.status(status).json({ message: msg });
    }
};

export const searchEmailsController = async (req: Request, res: Response) => {
    try {
        const { q } = req.query;
        if (!q || typeof q !== "string") {
            return res.status(400).json({ message: "Query param 'q' is required" });
        }
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 20;
        const result = await searchEmailsService(q, page, limit);
        return res.status(200).json(result);
    } catch (error) {
        return res.status(500).json({ message: "Internal Server Error" });
    }
};
