import { useState, useEffect, useCallback } from "react";
import api from "../lib/api";
import type { Email, EmailsResponse } from "../types";

type EmailType = "scheduled" | "sent";

export const useEmails = (type: EmailType, refreshInterval = 5000) => {
    const [emails, setEmails] = useState<Email[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const limit = 20;

    const fetch = useCallback(async (p = page) => {
        try {
            const endpoint = type === "scheduled" ? "/emails/scheduled" : "/emails/sent";
            const res = await api.get<EmailsResponse>(endpoint, {
                params: { page: p, limit },
            });
            setEmails(res.data.emails);
            setTotal(res.data.total);
            setError(null);
        } catch (err: any) {
            setError(err.response?.data?.message || "Failed to fetch emails");
        } finally {
            setLoading(false);
        }
    }, [type, page]);

    useEffect(() => {
        setLoading(true);
        fetch();
        const interval = setInterval(() => fetch(), refreshInterval);
        return () => clearInterval(interval);
    }, [fetch, refreshInterval]);

    const cancelEmail = async (emailId: string) => {
        await api.delete(`/emails/${emailId}/cancel`);
        await fetch();
    };

    const refresh = () => fetch();

    return { emails, total, loading, error, page, setPage, limit, cancelEmail, refresh };
};
