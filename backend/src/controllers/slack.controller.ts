import { Request, Response } from "express";
import {
    getSlackOAuthUrl,
    exchangeSlackCode,
    saveSlackToken,
} from "../services/slack.service";
import { generateSessionToken } from "../services/auth.service";
import prisma from "../db/prisma";

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

export const slackConnectController = (req: Request, res: Response) => {
    const userId = (req as any).userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const state = `${userId}:${generateSessionToken()}`;
    const url = getSlackOAuthUrl(state);
    return res.redirect(url);
};

export const slackCallbackController = async (req: Request, res: Response) => {
    try {
        const { code, state } = req.query;
        if (!code || typeof code !== "string" || !state || typeof state !== "string") {
            return res.redirect(`${FRONTEND_URL}/dashboard?slack=error`);
        }

        const userId = state.split(":")[0];
        if (!userId) return res.redirect(`${FRONTEND_URL}/dashboard?slack=error`);

        const { webhookUrl, teamName, channelName } = await exchangeSlackCode(code);
        await saveSlackToken(userId, webhookUrl, teamName, channelName);

        console.log(`[Slack] Connected for user ${userId} → channel: ${channelName}`);
        return res.redirect(`${FRONTEND_URL}/dashboard?slack=connected`);
    } catch (error) {
        console.error("[Slack] Callback error:", error);
        return res.redirect(`${FRONTEND_URL}/dashboard?slack=error`);
    }
};

export const slackDisconnectController = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        if (!userId) return res.status(401).json({ message: "Unauthorized" });
        await prisma.slackToken.deleteMany({ where: { userId } });
        return res.status(200).json({ message: "Slack disconnected" });
    } catch (error) {
        return res.status(500).json({ message: "Internal Server Error" });
    }
};
