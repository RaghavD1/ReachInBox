import express from "express";
import { requireAuth } from "../middleware/auth.middleware";
import {
    slackConnectController,
    slackCallbackController,
    slackDisconnectController,
} from "../controllers/slack.controller";

const router = express.Router();

// Initiate Slack OAuth flow
router.get("/connect", requireAuth, slackConnectController);

// Slack OAuth callback (no requireAuth — Slack redirects here before we have a session)
router.get("/callback", slackCallbackController);

// Disconnect Slack
router.delete("/disconnect", requireAuth, slackDisconnectController);

export default router;
