import React, { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../lib/api";

const AuthCallbackPage: React.FC = () => {
    const [params] = useSearchParams();
    const navigate = useNavigate();

    useEffect(() => {
        const token = params.get("token");
        const error = params.get("error");

        if (error || !token) {
            navigate(`/login?error=${error || "unknown"}`);
            return;
        }

        localStorage.setItem("auth_token", token);

        // Fetch user profile and store
        api.get("/auth/me")
            .then((res) => {
                localStorage.setItem("auth_user", JSON.stringify(res.data));
                navigate("/dashboard/scheduled");
            })
            .catch(() => {
                navigate("/login?error=profile_fetch_failed");
            });
    }, [params, navigate]);

    return (
        <div className="auth-callback">
            <div className="loading-spinner" />
            <p>Signing you in...</p>
        </div>
    );
};

export default AuthCallbackPage;
