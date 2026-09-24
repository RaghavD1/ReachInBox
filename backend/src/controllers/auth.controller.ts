import { Request, Response } from "express";
import {
    getGoogleOAuthUrl,
    exchangeGoogleCode,
    upsertUser,
    generateSessionToken,
    FRONTEND_URL,
} from "../services/auth.service";
import prisma from "../db/prisma";

// Simple in-memory session store (for demo — use Redis/DB in prod)
export const sessionStore = new Map<string, string>(); // token → userId

export const googleLoginController = (req: Request, res: Response) => {
    const state = generateSessionToken();
    // Store state for CSRF validation
    (req.session as any).oauthState = state;
    const url = getGoogleOAuthUrl(state);
    return res.redirect(url);
};

export const googleCallbackController = async (req: Request, res: Response) => {
    try {
        const { code, state } = req.query;
        const sessionState = (req.session as any).oauthState;

        if (!code || typeof code !== "string") {
            return res.redirect(`${FRONTEND_URL}/login?error=no_code`);
        }
        // Validate state (CSRF protection) — relaxed for demo if session not set
        if (sessionState && state !== sessionState) {
            return res.redirect(`${FRONTEND_URL}/login?error=state_mismatch`);
        }

        const profile = await exchangeGoogleCode(code);
        const user = await upsertUser(profile);

        // Create session token
        const token = generateSessionToken();
        sessionStore.set(token, user.id);

        // Redirect to frontend with token in URL (frontend stores in localStorage)
        return res.redirect(`${FRONTEND_URL}/auth/callback?token=${token}`);
    } catch (error) {
        console.error("[Auth] Google callback error:", error);
        return res.redirect(`${FRONTEND_URL}/login?error=oauth_failed`);
    }
};

export const devLoginController = async (req: Request, res: Response) => {
    try {
        const user = await upsertUser({
            googleId: "dev_user_123",
            email: "demo.user@reachinbox.ai",
            name: "ReachInbox Demo User",
            avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=ReachInbox",
        });

        const token = generateSessionToken();
        sessionStore.set(token, user.id);

        return res.redirect(`${FRONTEND_URL}/auth/callback?token=${token}`);
    } catch (error) {
        console.error("[Auth] Dev login error:", error);
        return res.redirect(`${FRONTEND_URL}/login?error=dev_login_failed`);
    }
};

export const getMeController = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        if (!userId) return res.status(401).json({ message: "Unauthorized" });

        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { slackToken: { select: { channelName: true, teamName: true } } },
        });

        if (!user) return res.status(404).json({ message: "User not found" });

        return res.status(200).json({
            id: user.id,
            email: user.email,
            name: user.name,
            avatar: user.avatar,
            slackConnected: !!user.slackToken,
            slackTeam: user.slackToken?.teamName,
            slackChannel: user.slackToken?.channelName,
        });
    } catch (error) {
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

export const logoutController = (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace("Bearer ", "");
    if (token) sessionStore.delete(token);
    return res.status(200).json({ message: "Logged out" });
};
