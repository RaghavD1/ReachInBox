import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import ScheduledEmailsPage from "./pages/ScheduledEmailsPage";
import SentEmailsPage from "./pages/SentEmailsPage";
import AuthCallbackPage from "./pages/AuthCallbackPage";
import type { User } from "./types";
import api from "./lib/api";

const App: React.FC = () => {
    return (
        <BrowserRouter>
            <AppRoutes />
        </BrowserRouter>
    );
};

const AppRoutes: React.FC = () => {
    const [user, setUser] = useState<User | null>(() => {
        try {
            const stored = localStorage.getItem("auth_user");
            return stored ? JSON.parse(stored) : null;
        } catch {
            return null;
        }
    });

    const navigate = useNavigate();

    const handleLogout = async () => {
        try { await api.post("/auth/logout"); } catch {}
        localStorage.removeItem("auth_token");
        localStorage.removeItem("auth_user");
        setUser(null);
        navigate("/login");
    };

    const handleConnectSlack = () => {
        const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";
        const token = localStorage.getItem("auth_token");
        window.location.href = `${API_URL}/slack/connect?token=${token}`;
    };

    const handleDisconnectSlack = async () => {
        await api.delete("/slack/disconnect");
        const res = await api.get<User>("/auth/me");
        setUser(res.data);
        localStorage.setItem("auth_user", JSON.stringify(res.data));
    };

    const handleRefresh = async () => {
        try {
            const res = await api.get<User>("/auth/me");
            setUser(res.data);
            localStorage.setItem("auth_user", JSON.stringify(res.data));
        } catch {}
    };

    return (
        <Routes>
            <Route
                path="/login"
                element={
                    user ? (
                        <Navigate to="/dashboard/scheduled" replace />
                    ) : (
                        <LoginPage
                            onLogin={() => {
                                const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";
                                window.location.href = `${API_URL}/auth/google`;
                            }}
                        />
                    )
                }
            />
            <Route path="/auth/callback" element={<AuthCallbackPage />} />
            <Route
                path="/dashboard"
                element={
                    user ? (
                        <DashboardPage
                            user={user}
                            onLogout={handleLogout}
                            onConnectSlack={handleConnectSlack}
                            onDisconnectSlack={handleDisconnectSlack}
                            onRefresh={handleRefresh}
                        />
                    ) : (
                        <Navigate to="/login" replace />
                    )
                }
            >
                <Route index element={<Navigate to="scheduled" replace />} />
                <Route path="scheduled" element={<ScheduledEmailsPage />} />
                <Route path="sent" element={<SentEmailsPage />} />
            </Route>
            <Route path="*" element={<Navigate to={user ? "/dashboard/scheduled" : "/login"} replace />} />
        </Routes>
    );
};

export default App;
