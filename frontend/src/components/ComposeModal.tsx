import React, { useState, useRef } from "react";
import { X, Upload, Mail, Clock, Users, AlertCircle, CheckCircle2 } from "lucide-react";
import api from "../lib/api";
import type { ScheduleEmailsPayload } from "../types";

interface ComposeModalProps {
    onClose: () => void;
    onSuccess: () => void;
}

const ComposeModal: React.FC<ComposeModalProps> = ({ onClose, onSuccess }) => {
    const [subject, setSubject] = useState("");
    const [body, setBody] = useState("");
    const [senderEmail, setSenderEmail] = useState("");
    const [startTime, setStartTime] = useState(() => {
        const d = new Date(Date.now() + 5 * 60 * 1000);
        return d.toISOString().slice(0, 16);
    });
    const [delayBetweenSeconds, setDelayBetweenSeconds] = useState(5);
    const [hourlyLimit, setHourlyLimit] = useState(100);
    const [leads, setLeads] = useState<string[]>([]);
    const [rawLeads, setRawLeads] = useState("");
    const [fileUploaded, setFileUploaded] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const parseLeads = (text: string): string[] => {
        return text
            .split(/[\n,;]+/)
            .map((s) => s.trim())
            .filter((s) => s.includes("@") && s.includes("."));
    };

    const handleRawLeadsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setRawLeads(e.target.value);
        setLeads(parseLeads(e.target.value));
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const content = ev.target?.result as string;
            const parsed = parseLeads(content);
            setLeads(parsed);
            setRawLeads(parsed.join("\n"));
            setFileUploaded(`${file.name} (${parsed.length} emails detected)`);
        };
        reader.readAsText(file);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!subject.trim()) return setError("Subject is required");
        if (!body.trim()) return setError("Email body is required");
        if (!senderEmail.trim() || !senderEmail.includes("@")) return setError("Valid sender email is required");
        if (leads.length === 0) return setError("Please add at least one recipient email address");

        setSubmitting(true);
        try {
            const payload: ScheduleEmailsPayload = {
                leads,
                subject,
                body,
                senderEmail,
                startTime: new Date(startTime).toISOString(),
                delayBetweenSeconds,
                hourlyLimit,
            };
            await api.post("/emails/schedule", payload);
            setSuccess(true);
            setTimeout(() => {
                onSuccess();
                onClose();
            }, 1500);
        } catch (err: any) {
            setError(err.response?.data?.message || "Failed to schedule emails");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="modal-header">
                    <div className="modal-title-group">
                        <Mail size={20} className="modal-title-icon" />
                        <h2 className="modal-title">New Email Campaign</h2>
                    </div>
                    <button className="modal-close" onClick={onClose}>
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <form className="modal-body" onSubmit={handleSubmit}>
                    {/* Alerts */}
                    {error && (
                        <div className="alert alert--error">
                            <AlertCircle size={16} />
                            <span>{error}</span>
                        </div>
                    )}
                    {success && (
                        <div className="alert alert--success">
                            <CheckCircle2 size={16} />
                            <span>Emails scheduled successfully! 🎉</span>
                        </div>
                    )}

                    {/* Sender */}
                    <div className="form-group">
                        <label className="form-label">From (Sender Email)</label>
                        <input
                            type="email"
                            className="form-input"
                            placeholder="campaign@yourcompany.com"
                            value={senderEmail}
                            onChange={(e) => setSenderEmail(e.target.value)}
                            required
                        />
                        <span className="form-hint">A new Ethereal SMTP account will be created for this sender if it doesn't exist.</span>
                    </div>

                    {/* Subject */}
                    <div className="form-group">
                        <label className="form-label">Subject</label>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="Your email subject..."
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            required
                        />
                    </div>

                    {/* Body */}
                    <div className="form-group">
                        <label className="form-label">Email Body</label>
                        <textarea
                            className="form-input form-textarea"
                            placeholder="Write your email content here..."
                            rows={5}
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            required
                        />
                    </div>

                    {/* Recipients */}
                    <div className="form-group">
                        <label className="form-label">
                            <Users size={14} style={{ display: "inline", marginRight: 4 }} />
                            Recipients
                            {leads.length > 0 && (
                                <span className="leads-count">{leads.length} email{leads.length !== 1 ? "s" : ""} detected</span>
                            )}
                        </label>
                        <textarea
                            className="form-input form-textarea"
                            placeholder="Paste emails separated by commas, semicolons, or newlines..."
                            rows={3}
                            value={rawLeads}
                            onChange={handleRawLeadsChange}
                        />
                        <div className="upload-area" onClick={() => fileInputRef.current?.click()}>
                            <Upload size={16} />
                            <span>{fileUploaded || "Or upload a CSV / text file"}</span>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".csv,.txt"
                                onChange={handleFileUpload}
                                style={{ display: "none" }}
                            />
                        </div>
                    </div>

                    {/* Scheduling */}
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">
                                <Clock size={14} style={{ display: "inline", marginRight: 4 }} />
                                Start Time
                            </label>
                            <input
                                type="datetime-local"
                                className="form-input"
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Delay Between Emails (seconds)</label>
                            <input
                                type="number"
                                className="form-input"
                                min={1}
                                max={3600}
                                value={delayBetweenSeconds}
                                onChange={(e) => setDelayBetweenSeconds(Number(e.target.value))}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Hourly Limit (per sender)</label>
                            <input
                                type="number"
                                className="form-input"
                                min={1}
                                max={1000}
                                value={hourlyLimit}
                                onChange={(e) => setHourlyLimit(Number(e.target.value))}
                            />
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="modal-footer">
                        <button type="button" className="btn btn--ghost" onClick={onClose} disabled={submitting}>
                            Cancel
                        </button>
                        <button type="submit" className="btn btn--primary" disabled={submitting || success}>
                            {submitting ? (
                                <>
                                    <span className="btn-spinner" />
                                    Scheduling...
                                </>
                            ) : (
                                <>
                                    <Mail size={15} />
                                    Schedule {leads.length > 0 ? `${leads.length} ` : ""}Emails
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ComposeModal;
