import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import type { User } from "../types";

export const useAuth = () => {
    const navigate = useNavigate();

    const getStoredUser = (): User | null => {
        try {
            const stored = localStorage.getItem("auth_user");
            return stored ? JSON.parse(stored) : null;
        } catch {
            return null;
        }
    };

    const [user, setUser] = useState<User | null>(getStoredUser);
    const [loading, setLoading] = useState(false);

    const fetchMe = useCallback(async () => {
        try {
            const res = await api.get<User>("/auth/me");
            setUser(res.data);
            localStorage.setItem("auth_user", JSON.stringify(res.data));
            return res.data;
        } catch {
            return null;
        }
    }, []);

    const logout = useCallback(async () => {
        setLoading(true);
        try {
            await api.post("/auth/logout");
        } catch {
            // ignore
        } finally {
            localStorage.removeItem("auth_token");
            localStorage.removeItem("auth_user");
            setUser(null);
            setLoading(false);
            navigate("/login");
        }
    }, [navigate]);

    const loginWithGoogle = useCallback(() => {
        const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";
        window.location.href = `${API_URL}/auth/google`;
    }, []);

    const connectSlack = useCallback(() => {
        const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";
        const token = localStorage.getItem("auth_token");
        window.location.href = `${API_URL}/slack/connect?token=${token}`;
    }, []);

    const disconnectSlack = useCallback(async () => {
        await api.delete("/slack/disconnect");
        await fetchMe();
    }, [fetchMe]);

    return { user, setUser, loading, fetchMe, logout, loginWithGoogle, connectSlack, disconnectSlack };
};
