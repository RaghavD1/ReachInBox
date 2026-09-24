import express from "express";
import {
    googleLoginController,
    googleCallbackController,
    devLoginController,
    getMeController,
    logoutController,
} from "../controllers/auth.controller";
import { requireAuth } from "../middleware/auth.middleware";

const router = express.Router();

// Redirect user to Google OAuth consent page
router.get("/google", googleLoginController);

// Google OAuth callback
router.get("/google/callback", googleCallbackController);

// 1-Click Demo Login (bypass OAuth for testing)
router.get("/dev-login", devLoginController);

// Get current user profile
router.get("/me", requireAuth, getMeController);

// Logout
router.post("/logout", requireAuth, logoutController);

export default router;
