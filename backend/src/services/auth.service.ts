import "dotenv/config";
import axios from "axios";
import prisma from "../db/prisma";
import crypto from "crypto";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/auth/google/callback";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

export const getGoogleOAuthUrl = (state: string) => {
    const params = new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        redirect_uri: GOOGLE_REDIRECT_URI,
        response_type: "code",
        scope: "openid email profile",
        state,
        access_type: "offline",
        prompt: "consent",
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
};

export const exchangeGoogleCode = async (code: string) => {
    const tokenRes = await axios.post("https://oauth2.googleapis.com/token", {
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: GOOGLE_REDIRECT_URI,
        grant_type: "authorization_code",
    });

    const { access_token, id_token } = tokenRes.data;

    const userRes = await axios.get("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${access_token}` },
    });

    return {
        googleId: userRes.data.sub as string,
        email: userRes.data.email as string,
        name: userRes.data.name as string,
        avatar: userRes.data.picture as string,
        accessToken: access_token as string,
    };
};

export const upsertUser = async (profile: {
    googleId: string;
    email: string;
    name: string;
    avatar?: string;
}) => {
    return prisma.user.upsert({
        where: { googleId: profile.googleId },
        create: {
            googleId: profile.googleId,
            email: profile.email,
            name: profile.name,
            avatar: profile.avatar,
        },
        update: {
            email: profile.email,
            name: profile.name,
            avatar: profile.avatar,
        },
    });
};

export const generateSessionToken = () => crypto.randomBytes(32).toString("hex");

export { FRONTEND_URL };
