import React from "react";

type Status = "scheduled" | "sending" | "sent" | "failed" | "cancelled";

const StatusBadge: React.FC<{ status: Status | string }> = ({ status }) => {
    const config: Record<string, { label: string; className: string }> = {
        scheduled: { label: "Scheduled", className: "badge--scheduled" },
        sending: { label: "Sending…", className: "badge--sending" },
        sent: { label: "Sent", className: "badge--sent" },
        failed: { label: "Failed", className: "badge--failed" },
        cancelled: { label: "Cancelled", className: "badge--cancelled" },
    };

    const c = config[status] || { label: status, className: "badge--default" };

    return (
        <span className={`status-badge ${c.className}`}>
            {c.label}
        </span>
    );
};

export default StatusBadge;
