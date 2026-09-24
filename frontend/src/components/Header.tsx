import React, { useState } from "react";
import { LogOut, ZapOff, ChevronDown } from "lucide-react";

// Inline Slack logo SVG (lucide-react doesn't export Slack in v1.x)
const SlackIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M14.5 10C13.67 10 13 9.33 13 8.5V3.5C13 2.67 13.67 2 14.5 2C15.33 2 16 2.67 16 3.5V8.5C16 9.33 15.33 10 14.5 10Z" fill="currentColor"/>
        <path d="M20.5 10H19V8.5C19 7.67 19.67 7 20.5 7C21.33 7 22 7.67 22 8.5C22 9.33 21.33 10 20.5 10Z" fill="currentColor"/>
        <path d="M9.5 14C10.33 14 11 14.67 11 15.5V20.5C11 21.33 10.33 22 9.5 22C8.67 22 8 21.33 8 20.5V15.5C8 14.67 8.67 14 9.5 14Z" fill="currentColor"/>
        <path d="M3.5 14H5V15.5C5 16.33 4.33 17 3.5 17C2.67 17 2 16.33 2 15.5C2 14.67 2.67 14 3.5 14Z" fill="currentColor"/>
        <path d="M14 14.5C14 13.67 14.67 13 15.5 13H20.5C21.33 13 22 13.67 22 14.5C22 15.33 21.33 16 20.5 16H15.5C14.67 16 14 15.33 14 14.5Z" fill="currentColor"/>
        <path d="M14 20.5V19H15.5C16.33 19 17 19.67 17 20.5C17 21.33 16.33 22 15.5 22C14.67 22 14 21.33 14 20.5Z" fill="currentColor"/>
        <path d="M10 9.5C10 10.33 9.33 11 8.5 11H3.5C2.67 11 2 10.33 2 9.5C2 8.67 2.67 8 3.5 8H8.5C9.33 8 10 8.67 10 9.5Z" fill="currentColor"/>
        <path d="M10 3.5V5H8.5C7.67 5 7 4.33 7 3.5C7 2.67 7.67 2 8.5 2C9.33 2 10 2.67 10 3.5Z" fill="currentColor"/>
    </svg>
);
import type { User } from "../types";

interface HeaderProps {
    user: User;
    onLogout: () => void;
    onConnectSlack: () => void;
    onDisconnectSlack: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, onLogout, onConnectSlack, onDisconnectSlack }) => {
    const [userMenuOpen, setUserMenuOpen] = useState(false);

    return (
        <header className="app-header">
            <div className="header-inner">
                {/* Logo */}
                <div className="header-logo">
                    <div className="logo-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                            <path d="M3 8L10.89 13.26C11.2187 13.4793 11.6049 13.5963 12 13.5963C12.3951 13.5963 12.7813 13.4793 13.11 13.26L21 8M5 19H19C19.5304 19 20.0391 18.7893 20.4142 18.4142C20.7893 18.0391 21 17.5304 21 17V7C21 6.46957 20.7893 5.96086 20.4142 5.58579C20.0391 5.21071 19.5304 5 19 5H5C4.46957 5 3.96086 5.21071 3.58579 5.58579C3.21071 5.96086 3 6.46957 3 7V17C3 17.5304 3.21071 18.0391 3.58579 18.4142C3.96086 18.7893 4.46957 19 5 19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                    <span className="logo-text">ReachInbox</span>
                </div>

                {/* Right side */}
                <div className="header-right">
                    {/* Slack */}
                    {user.slackConnected ? (
                        <button
                            className="slack-btn slack-btn--connected"
                            onClick={onDisconnectSlack}
                            title={`Connected to #${user.slackChannel} (${user.slackTeam}). Click to disconnect.`}
                        >
                            <SlackIcon size={15} />
                            <span>Slack Connected</span>
                            <ZapOff size={13} className="slack-disconnect-icon" />
                        </button>
                    ) : (
                        <button className="slack-btn" onClick={onConnectSlack}>
                            <SlackIcon size={15} />
                            <span>Connect Slack</span>
                        </button>
                    )}

                    {/* User dropdown */}
                    <div className="user-menu" onClick={() => setUserMenuOpen(!userMenuOpen)}>
                        <img
                            src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=6366f1&color=fff&size=80`}
                            alt={user.name}
                            className="user-avatar"
                        />
                        <div className="user-info">
                            <span className="user-name">{user.name}</span>
                            <span className="user-email">{user.email}</span>
                        </div>
                        <ChevronDown size={16} className={`chevron ${userMenuOpen ? "chevron--open" : ""}`} />

                        {userMenuOpen && (
                            <div className="user-dropdown" onClick={(e) => e.stopPropagation()}>
                                <div className="dropdown-header">
                                    <img
                                        src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=6366f1&color=fff`}
                                        alt={user.name}
                                        className="dropdown-avatar"
                                    />
                                    <div>
                                        <div className="dropdown-name">{user.name}</div>
                                        <div className="dropdown-email">{user.email}</div>
                                    </div>
                                </div>
                                <div className="dropdown-divider" />
                                <button className="dropdown-item dropdown-item--danger" onClick={onLogout}>
                                    <LogOut size={14} />
                                    <span>Logout</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;
