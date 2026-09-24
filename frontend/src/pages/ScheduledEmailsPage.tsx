import React, { useState } from "react";
import { useEmails } from "../hooks/useEmails";
import EmailTable from "../components/EmailTable";
import { RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";

const ScheduledEmailsPage: React.FC = () => {
    const { emails, total, loading, error, page, setPage, limit, cancelEmail, refresh } = useEmails("scheduled");
    const [cancelling, setCancelling] = useState<string | null>(null);

    const handleCancel = async (id: string) => {
        if (!confirm("Cancel this scheduled email?")) return;
        setCancelling(id);
        try {
            await cancelEmail(id);
        } finally {
            setCancelling(null);
        }
    };

    const totalPages = Math.ceil(total / limit);

    return (
        <div className="page-content">
            <div className="page-header">
                <div>
                    <h2 className="page-title">Scheduled Emails</h2>
                    <p className="page-desc">
                        {loading ? "Loading..." : `${total} email${total !== 1 ? "s" : ""} queued`}
                    </p>
                </div>
                <button className="btn btn--ghost btn--sm" onClick={refresh} disabled={loading}>
                    <RefreshCw size={14} className={loading ? "spin" : ""} />
                    Refresh
                </button>
            </div>

            {error && <div className="alert alert--error"><span>{error}</span></div>}

            <EmailTable
                emails={emails}
                type="scheduled"
                loading={loading}
                onCancel={handleCancel}
            />

            {totalPages > 1 && (
                <div className="pagination">
                    <button
                        className="btn btn--ghost btn--sm"
                        disabled={page === 1}
                        onClick={() => setPage(p => p - 1)}
                    >
                        <ChevronLeft size={14} /> Prev
                    </button>
                    <span className="pagination-info">Page {page} of {totalPages}</span>
                    <button
                        className="btn btn--ghost btn--sm"
                        disabled={page === totalPages}
                        onClick={() => setPage(p => p + 1)}
                    >
                        Next <ChevronRight size={14} />
                    </button>
                </div>
            )}
        </div>
    );
};

export default ScheduledEmailsPage;
