import { Request, Response, NextFunction } from "express";
import { sessionStore } from "../controllers/auth.controller";

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
        return res.status(401).json({ message: "Unauthorized — no token provided" });
    }

    const userId = sessionStore.get(token);
    if (!userId) {
        return res.status(401).json({ message: "Unauthorized — invalid or expired token" });
    }

    (req as any).userId = userId;
    next();
};

export const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace("Bearer ", "");
    if (token) {
        const userId = sessionStore.get(token);
        if (userId) (req as any).userId = userId;
    }
    next();
};
