// src/components/Sidebar.js
import React, { useState } from "react";
import { LayoutDashboard, LogOut, BookOpen, Calendar } from "lucide-react";
import "../styles/Sidebar.css";

const Sidebar = ({
  userRole,
  userName,
  currentUser,
  activeTab,
  setActiveTab,
  onLogoutClick,
}) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const getMenuItems = () => {
    const baseItems = [
      { id: "overview", label: "Overview", icon: "📊" },
      { id: "files", label: "File Uploads", icon: "📤" },
      { id: "RecordsView", label: "File Records", icon: "📋" },
      { id: "dairy", label: "Dairy", icon: "📔" },
      { id: "logbook", label: "Log Book", icon: "📖" },
    ];

    if (userRole === "admin") {
      return [
        ...baseItems,
        { id: "portfolio", label: "My Files", icon: "💼" },
        { id: "users", label: "User Management", icon: "👥" },
      ];
    }

    return baseItems;
  };

  const menuItems = getMenuItems();

  return (
    <aside className={`sidebar ${sidebarCollapsed ? "collapsed" : ""}`}>
      {/* Sidebar Header */}
      <div className="sidebar-header">
        <div className="logo">
          <LayoutDashboard className="logo-icon" />
          {!sidebarCollapsed && (
            <span className="logo-text">
              {userRole === "admin" ? "Admin Panel" : "User Panel"}
            </span>
          )}
        </div>
        <button
          className="sidebar-toggle"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          title={sidebarCollapsed ? "Expand" : "Collapse"}
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {sidebarCollapsed ? "➡️" : "⬅️"}
        </button>
      </div>

      {/* Navigation Menu */}
      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${activeTab === item.id ? "active" : ""} ${
              item.id === "dairy" || item.id === "logbook" ? "special-item" : ""
            }`}
            onClick={() => setActiveTab(item.id)}
            title={sidebarCollapsed ? item.label : ""}
            aria-label={item.label}
          >
            <span className="nav-icon">{item.icon}</span>
            {!sidebarCollapsed && (
              <span className="nav-label">{item.label}</span>
            )}
          </button>
        ))}
      </nav>

      {/* Sidebar Footer */}
      <div className="sidebar-footer">
        <div className="user-profile">
          <div className="profile-avatar">
            {currentUser?.email?.charAt(0).toUpperCase()}
          </div>
          {!sidebarCollapsed && (
            <div className="profile-info">
              <span className="profile-name">
                {userName || currentUser?.email?.split("@")[0]}
              </span>
              <span className="profile-role">
                {userRole === "admin" ? "Administrator" : "Sub Administrator"}
              </span>
            </div>
          )}
        </div>
        <button
          onClick={onLogoutClick}
          className="logout-button"
          title={sidebarCollapsed ? "Logout" : ""}
          aria-label="Logout"
        >
          <span>🚪</span>
          {!sidebarCollapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
