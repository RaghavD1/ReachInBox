import express from "express";
import { requireAuth } from "../middleware/auth.middleware";
import {
    scheduleEmailsController,
    getScheduledEmailsController,
    getSentEmailsController,
    cancelEmailController,
    searchEmailsController,
} from "../controllers/email.controller";
import multer from "multer";
import { parse } from "csv-parse/sync";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Schedule emails (supports JSON body or CSV file upload)
router.post("/schedule", requireAuth, upload.single("file"), async (req, res, next) => {
    // If a CSV file was uploaded, parse it and inject leads array
    if (req.file) {
        try {
            const content = req.file.buffer.toString("utf-8");
            // Support both CSV and plain text (one email per line)
            let leads: string[] = [];
            if (req.file.originalname.endsWith(".csv")) {
                const records = parse(content, { skip_empty_lines: true, trim: true });
                // Flatten all cells, filter emails
                leads = (records as string[][]).flat().filter((v: string) => v.includes("@"));
            } else {
                leads = content.split(/[\n,;]+/).map(s => s.trim()).filter(s => s.includes("@"));
            }
            req.body.leads = leads;
        } catch (e) {
            return res.status(400).json({ message: "Failed to parse uploaded file" });
        }
    }
    return scheduleEmailsController(req, res);
});

// Get scheduled (pending/sending) emails
router.get("/scheduled", requireAuth, getScheduledEmailsController);

// Get sent/failed/cancelled emails
router.get("/sent", requireAuth, getSentEmailsController);

// Cancel a scheduled email
router.delete("/:id/cancel", requireAuth, cancelEmailController);

// Search emails (ES or DB fallback)
router.get("/search", requireAuth, searchEmailsController);

export default router;
