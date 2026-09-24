import React from "react";
import type { Email } from "../types";
import StatusBadge from "./StatusBadge";
import { format } from "date-fns";
import { ExternalLink, Trash2, Clock } from "lucide-react";

interface EmailTableProps {
    emails: Email[];
    type: "scheduled" | "sent";
    loading: boolean;
    onCancel?: (id: string) => void;
}

const EmailTable: React.FC<EmailTableProps> = ({ emails, type, loading, onCancel }) => {
    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner" />
                <p className="loading-text">Loading emails...</p>
            </div>
        );
    }

    if (emails.length === 0) {
        return (
            <div className="empty-state">
                <div className="empty-icon">
                    {type === "scheduled" ? "📅" : "📬"}
                </div>
                <h3 className="empty-title">
                    {type === "scheduled" ? "No Scheduled Emails" : "No Sent Emails"}
                </h3>
                <p className="empty-desc">
                    {type === "scheduled"
                        ? "Schedule your first email campaign by clicking 'New Campaign'."
                        : "Your sent emails will appear here once dispatched."}
                </p>
            </div>
        );
    }

    return (
        <div className="table-wrapper">
            <table className="email-table">
                <thead>
                    <tr>
                        <th>Recipient</th>
                        <th>Subject</th>
                        <th>{type === "scheduled" ? "Scheduled At" : "Sent At"}</th>
                        <th>Sender</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {emails.map((email) => (
                        <tr key={email.id} className="email-row">
                            <td>
                                <span className="email-to">{email.to}</span>
                            </td>
                            <td>
                                <span className="email-subject" title={email.subject}>
                                    {email.subject.length > 45 ? `${email.subject.slice(0, 45)}…` : email.subject}
                                </span>
                            </td>
                            <td>
                                <div className="email-time">
                                    <Clock size={13} className="time-icon" />
                                    {type === "scheduled"
                                        ? format(new Date(email.scheduledAt), "MMM d, yyyy HH:mm")
                                        : email.sentAt
                                        ? format(new Date(email.sentAt), "MMM d, yyyy HH:mm")
                                        : "—"}
                                </div>
                            </td>
                            <td>
                                <span className="sender-chip">
                                    {email.sender?.email || "—"}
                                </span>
                            </td>
                            <td>
                                <StatusBadge status={email.status} />
                            </td>
                            <td>
                                <div className="action-buttons">
                                    {email.previewUrl && (
                                        <a
                                            href={email.previewUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="action-btn action-btn--view"
                                            title="View email in Ethereal"
                                        >
                                            <ExternalLink size={14} />
                                        </a>
                                    )}
                                    {type === "scheduled" && email.status === "scheduled" && onCancel && (
                                        <button
                                            className="action-btn action-btn--cancel"
                                            title="Cancel this email"
                                            onClick={() => onCancel(email.id)}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default EmailTable;
