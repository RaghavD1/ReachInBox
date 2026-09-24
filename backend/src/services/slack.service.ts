import "dotenv/config";
import axios from "axios";
import prisma from "../db/prisma";

const SLACK_CLIENT_ID = process.env.SLACK_CLIENT_ID || "";
const SLACK_CLIENT_SECRET = process.env.SLACK_CLIENT_SECRET || "";
const SLACK_REDIRECT_URI = process.env.SLACK_REDIRECT_URI || "http://localhost:3000/slack/callback";

export const getSlackOAuthUrl = (state: string) => {
    const params = new URLSearchParams({
        client_id: SLACK_CLIENT_ID,
        scope: "incoming-webhook",
        redirect_uri: SLACK_REDIRECT_URI,
        state,
    });
    return `https://slack.com/oauth/v2/authorize?${params.toString()}`;
};

export const exchangeSlackCode = async (code: string) => {
    const response = await axios.post(
        "https://slack.com/api/oauth.v2.access",
        null,
        {
            params: {
                client_id: SLACK_CLIENT_ID,
                client_secret: SLACK_CLIENT_SECRET,
                code,
                redirect_uri: SLACK_REDIRECT_URI,
            },
        }
    );
    const data = response.data;
    if (!data.ok) throw new Error(`Slack OAuth error: ${data.error}`);
    return {
        webhookUrl: data.incoming_webhook?.url as string,
        teamName: data.team?.name as string,
        channelName: data.incoming_webhook?.channel as string,
    };
};

export const saveSlackToken = async (
    userId: string,
    webhookUrl: string,
    teamName?: string,
    channelName?: string
) => {
    return prisma.slackToken.upsert({
        where: { userId },
        create: { userId, webhookUrl, teamName, channelName },
        update: { webhookUrl, teamName, channelName },
    });
};

export const sendSlackRateLimitNotification = async (
    userId: string,
    senderEmail: string,
    hourWindow: string,
    rescheduledTo: string
) => {
    try {
        const token = await prisma.slackToken.findUnique({ where: { userId } });
        if (!token) return; // Slack not connected — silently skip

        const message = {
            text: `⚠️ *Rate Limit Reached*\n*Sender:* \`${senderEmail}\`\n*Hour window:* ${hourWindow}\nEmails for this sender have been rescheduled to start at *${rescheduledTo}*. No emails were lost.`,
        };
        await axios.post(token.webhookUrl, message);
        console.log(`[Slack] Rate limit notification sent for sender ${senderEmail}`);
    } catch (err) {
        console.error("[Slack] Failed to send notification:", err);
        // Do NOT crash — Slack notification is best-effort
    }
};
