import React, { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { Calendar, Send, Plus, ExternalLink } from "lucide-react";
import Header from "../components/Header";
import ComposeModal from "../components/ComposeModal";
import type { User } from "../types";

interface DashboardPageProps {
    user: User;
    onLogout: () => void;
    onConnectSlack: () => void;
    onDisconnectSlack: () => void;
    onRefresh: () => void;
}

const DashboardPage: React.FC<DashboardPageProps> = ({
    user, onLogout, onConnectSlack, onDisconnectSlack, onRefresh
}) => {
    const [composeOpen, setComposeOpen] = useState(false);

    return (
        <div className="dashboard">
            <Header
                user={user}
                onLogout={onLogout}
                onConnectSlack={onConnectSlack}
                onDisconnectSlack={onDisconnectSlack}
            />

            <div className="dashboard-layout">
                {/* Sidebar */}
                <aside className="sidebar">
                    <button className="compose-btn" onClick={() => setComposeOpen(true)}>
                        <Plus size={16} />
                        New Campaign
                    </button>

                    <nav className="sidebar-nav">
                        <NavLink
                            to="/dashboard/scheduled"
                            className={({ isActive }) => `nav-link ${isActive ? "nav-link--active" : ""}`}
                        >
                            <Calendar size={16} />
                            <span>Scheduled</span>
                        </NavLink>
                        <NavLink
                            to="/dashboard/sent"
                            className={({ isActive }) => `nav-link ${isActive ? "nav-link--active" : ""}`}
                        >
                            <Send size={16} />
                            <span>Sent</span>
                        </NavLink>
                    </nav>

                    <div className="sidebar-footer">
                        <a
                            href="http://localhost:3000/admin/queues"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="nav-link"
                        >
                            <ExternalLink size={16} />
                            <span>BullMQ Dashboard</span>
                        </a>
                    </div>
                </aside>

                {/* Main */}
                <main className="dashboard-main">
                    <Outlet />
                </main>
            </div>

            {/* Compose Modal */}
            {composeOpen && (
                <ComposeModal
                    onClose={() => setComposeOpen(false)}
                    onSuccess={() => {
                        setComposeOpen(false);
                        onRefresh();
                    }}
                />
            )}
        </div>
    );
};

export default DashboardPage;
