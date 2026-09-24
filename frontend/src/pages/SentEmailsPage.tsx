import React from "react";
import { useEmails } from "../hooks/useEmails";
import EmailTable from "../components/EmailTable";
import { RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";

const SentEmailsPage: React.FC = () => {
    const { emails, total, loading, error, page, setPage, limit, refresh } = useEmails("sent");

    const totalPages = Math.ceil(total / limit);

    return (
        <div className="page-content">
            <div className="page-header">
                <div>
                    <h2 className="page-title">Sent Emails</h2>
                    <p className="page-desc">
                        {loading ? "Loading..." : `${total} email${total !== 1 ? "s" : ""} sent`}
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
                type="sent"
                loading={loading}
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

export default SentEmailsPage;
