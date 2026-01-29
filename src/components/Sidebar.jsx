// src/components/Sidebar.js
import React, { useState, useEffect } from "react";
import {
  LayoutDashboard,
  LogOut,
  FileText,
  Upload,
  FolderOpen,
  BookOpen,
  Calendar,
  Users,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const Sidebar = ({
  userRole,
  userName,
  currentUser,
  activeTab,
  setActiveTab,
  onLogoutClick,
  onCollapsedChange,
}) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [hoveredItem, setHoveredItem] = useState(null);

  // Detect screen size
  useEffect(() => {
    const checkScreenSize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);

      if (!mobile) {
        const nextCollapsed = false;
        setSidebarCollapsed(nextCollapsed);
        if (typeof onCollapsedChange === "function") {
          onCollapsedChange(nextCollapsed);
        }
      }
    };

    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, [onCollapsedChange]);

  const getMenuItems = () => {
    const baseItems = [
      {
        id: "overview",
        label: "Overview",
        icon: <LayoutDashboard size={20} />,
        emoji: "📊",
      },
      {
        id: "files",
        label: "File Uploads",
        icon: <Upload size={20} />,
        emoji: "📤",
      },
      {
        id: "RecordsView",
        label: "File Records",
        icon: <FileText size={20} />,
        emoji: "📋",
      },
    ];

    if (userRole === "admin") {
      return [
        ...baseItems,
        {
          id: "portfolio",
          label: "My Files",
          icon: <FolderOpen size={20} />,
          emoji: "💼",
        },
        {
          id: "dairy",
          label: "Daily Dairy",
          icon: <BookOpen size={20} />,
          emoji: "📔",
          highlight: true,
        },
        {
          id: "logbook",
          label: "Log Book",
          icon: <Calendar size={20} />,
          emoji: "📖",
          highlight: true,
        },
        {
          id: "users",
          label: "User Management",
          icon: <Users size={20} />,
          emoji: "👥",
        },
      ];
    }

    return baseItems;
  };

  const menuItems = getMenuItems();

  const handleMenuClick = (itemId) => {
    setActiveTab(itemId);
  };

  const toggleSidebar = () => {
    const next = !sidebarCollapsed;
    setSidebarCollapsed(next);
    if (typeof onCollapsedChange === "function") {
      onCollapsedChange(next);
    }
  };

  // Tooltip Component for collapsed state
  const Tooltip = ({ children, label, show }) => {
    if (!show || !sidebarCollapsed) return children;

    return (
      <div className="relative group">
        {children}
        <div
          className={`
            absolute left-full top-1/2 -translate-y-1/2 ml-3
            px-3 py-2 rounded-lg
            bg-gray-900 text-white text-sm font-medium
            whitespace-nowrap
            opacity-0 invisible group-hover:opacity-100 group-hover:visible
            transition-all duration-200 ease-out
            z-50 shadow-xl
            before:content-[''] before:absolute before:right-full before:top-1/2 before:-translate-y-1/2
            before:border-8 before:border-transparent before:border-r-gray-900
          `}
        >
          {label}
        </div>
      </div>
    );
  };

  return (
    <aside
      className={`
        h-screen
        bg-white border-r border-purple-100
        flex flex-col
        shadow-xl
        transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]
        ${sidebarCollapsed ? "w-[76px]" : "w-72"}
        overflow-hidden
      `}
    >
      {/* ========================================
          SIDEBAR HEADER
          ======================================== */}
      <div
        className={`
          flex flex-col border-b border-purple-100 
          bg-gradient-to-r from-purple-50 to-pink-50
          transition-all duration-300 ease-out
        `}
      >
        {/* Main Header Row */}
        <div
          className={`
            flex items-center p-4
            transition-all duration-300 ease-out
            ${sidebarCollapsed ? "justify-center" : "justify-start gap-3"}
          `}
        >
          {/* Logo Icon */}
          <div
            className={`
              shrink-0 rounded-xl 
              bg-gradient-to-br from-purple-600 to-pink-600 
              flex items-center justify-center shadow-lg
              transition-all duration-300 ease-out
              ${sidebarCollapsed ? "w-10 h-10" : "w-11 h-11"}
            `}
          >
            <LayoutDashboard
              className="text-white transition-all duration-300"
              size={sidebarCollapsed ? 18 : 22}
            />
          </div>

          {/* Title - Animated (Only visible when expanded) */}
          <div
            className={`
              flex flex-col min-w-0 overflow-hidden
              transition-all duration-300 ease-out
              ${sidebarCollapsed ? "w-0 opacity-0 hidden" : "w-auto opacity-100 flex-1"}
            `}
          >
            <span className="font-bold text-gray-800 text-base whitespace-nowrap">
              {userRole === "admin" ? "Admin Panel" : "User Panel"}
            </span>
            <span className="text-xs text-gray-500 whitespace-nowrap">
              Dashboard
            </span>
          </div>

          {/* Toggle Button - Visible only when expanded (Desktop) */}
          {!isMobile && !sidebarCollapsed && (
            <button
              className={`
                p-2 hover:bg-purple-100 rounded-lg 
                transition-all duration-200 ease-out
                text-purple-600 shrink-0
                hover:scale-110 active:scale-95
              `}
              onClick={toggleSidebar}
              title="Collapse sidebar"
              aria-label="Collapse sidebar"
            >
              <ChevronLeft size={20} />
            </button>
          )}
        </div>

        {/* Toggle Button Row - Only visible when collapsed (Desktop) */}
        {!isMobile && sidebarCollapsed && (
          <div className="flex justify-center pb-3">
            <button
              className={`
                p-2 hover:bg-purple-200 bg-purple-100 rounded-lg 
                transition-all duration-200 ease-out
                text-purple-600
                hover:scale-110 active:scale-95
              `}
              onClick={toggleSidebar}
              title="Expand sidebar"
              aria-label="Expand sidebar"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>

      {/* ========================================
          USER PROFILE CARD
          ======================================== */}
      <div
        className={`
          mx-3 my-3 rounded-xl 
          bg-gradient-to-br from-purple-50 to-pink-50
          border-2 border-purple-100 
          flex items-center
          shadow-sm hover:shadow-md 
          transition-all duration-300 ease-out
          overflow-hidden
          ${sidebarCollapsed ? "p-2 justify-center" : "p-3 gap-3"}
        `}
      >
        {/* Avatar */}
        <Tooltip
          label={userName || currentUser?.email?.split("@")[0] || "User"}
          show={sidebarCollapsed}
        >
          <div
            className={`
              rounded-full 
              bg-gradient-to-br from-purple-600 to-pink-600 
              flex items-center justify-center 
              text-white font-bold shadow-md
              shrink-0 cursor-pointer
              transition-all duration-300 ease-out
              hover:scale-105
              ${sidebarCollapsed ? "w-10 h-10 text-sm" : "w-11 h-11 text-base"}
            `}
          >
            {(userName || currentUser?.email || "U").charAt(0).toUpperCase()}
          </div>
        </Tooltip>

        {/* User Info - Animated */}
        <div
          className={`
            flex flex-col min-w-0 overflow-hidden
            transition-all duration-300 ease-out
            ${sidebarCollapsed ? "w-0 opacity-0 hidden" : "w-auto opacity-100 flex-1"}
          `}
        >
          <span className="font-semibold text-gray-800 truncate text-sm whitespace-nowrap">
            {userName || currentUser?.email?.split("@")[0] || "User"}
          </span>
          <span className="text-xs text-gray-600 truncate whitespace-nowrap">
            {userRole === "admin" ? "👑 Administrator" : "👤 Sub Admin"}
          </span>
        </div>
      </div>

      {/* ========================================
          NAVIGATION MENU
          ======================================== */}
      <nav className="flex-1 px-2 overflow-y-auto overflow-x-hidden custom-scrollbar">
        <div className="space-y-1 py-2">
          {/* Section Label */}
          <div
            className={`
              overflow-hidden transition-all duration-300 ease-out
              ${sidebarCollapsed ? "h-0 opacity-0" : "h-auto opacity-100"}
            `}
          >
            <span className="px-3 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider block">
              Navigation
            </span>
          </div>

          {/* Menu Items */}
          {menuItems.map((item, index) => {
            const isActive = activeTab === item.id;
            const isHovered = hoveredItem === item.id;

            return (
              <Tooltip key={item.id} label={item.label} show={sidebarCollapsed}>
                <button
                  className={`
                    w-full flex items-center rounded-xl
                    transition-all duration-200 ease-out
                    relative group
                    ${sidebarCollapsed ? "justify-center px-2 py-3" : "gap-3 px-4 py-3"}
                    ${
                      isActive
                        ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/25"
                        : item.highlight
                          ? "bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-200 text-gray-700 hover:border-yellow-300"
                          : "text-gray-700 hover:bg-purple-50 border-2 border-transparent"
                    }
                    ${isHovered && !isActive ? "scale-[1.02]" : ""}
                    ${isActive ? "scale-[1.02]" : ""}
                  `}
                  onClick={() => handleMenuClick(item.id)}
                  onMouseEnter={() => setHoveredItem(item.id)}
                  onMouseLeave={() => setHoveredItem(null)}
                  aria-label={item.label}
                  style={{
                    animationDelay: `${index * 50}ms`,
                  }}
                >
                  {/* Icon Container */}
                  <span
                    className={`
                      shrink-0 flex items-center justify-center
                      transition-all duration-200 ease-out
                      ${sidebarCollapsed ? "text-xl" : ""}
                      ${isHovered && !isActive ? "scale-110" : ""}
                    `}
                  >
                    {sidebarCollapsed ? item.emoji : item.icon}
                  </span>

                  {/* Label - Animated */}
                  <span
                    className={`
                      font-medium text-sm whitespace-nowrap
                      transition-all duration-300 ease-out
                      ${sidebarCollapsed ? "w-0 opacity-0 overflow-hidden hidden" : "w-auto opacity-100 flex-1 text-left"}
                    `}
                  >
                    {item.label}
                  </span>

                  {/* Active Indicator - Right side (expanded) */}
                  {isActive && !sidebarCollapsed && (
                    <div
                      className="
                        absolute right-0 top-1/2 -translate-y-1/2 
                        w-1 h-2/3 bg-white rounded-l-full shadow-md
                        transition-all duration-300 ease-out
                      "
                    />
                  )}

                  {/* Active Indicator - Left side (collapsed) */}
                  {isActive && sidebarCollapsed && (
                    <div
                      className="
                        absolute left-0 top-1/2 -translate-y-1/2 
                        w-1 h-2/3 bg-white rounded-r-full
                        transition-all duration-300 ease-out
                      "
                    />
                  )}

                  {/* Hover Glow Effect */}
                  {isHovered && !isActive && (
                    <div
                      className="
                        absolute inset-0 rounded-xl
                        bg-purple-500/5
                        transition-opacity duration-200 ease-out
                        pointer-events-none
                      "
                    />
                  )}
                </button>
              </Tooltip>
            );
          })}
        </div>
      </nav>

      {/* ========================================
          SIDEBAR FOOTER
          ======================================== */}
      <div
        className={`
          border-t-2 border-purple-100 
          bg-gradient-to-r from-red-50 to-pink-50
          transition-all duration-300 ease-out
          ${sidebarCollapsed ? "p-2" : "p-4"}
        `}
      >
        {/* Logout Button */}
        <Tooltip label="Logout" show={sidebarCollapsed}>
          <button
            onClick={onLogoutClick}
            className={`
              w-full flex items-center rounded-xl
              bg-gradient-to-r from-red-500 to-red-600 
              hover:from-red-600 hover:to-red-700
              text-white font-semibold
              transition-all duration-200 ease-out
              shadow-md hover:shadow-lg 
              hover:scale-[1.02] active:scale-[0.98]
              ${sidebarCollapsed ? "justify-center px-2 py-3" : "gap-3 px-4 py-3"}
            `}
            aria-label="Logout"
          >
            <LogOut
              size={20}
              className="shrink-0 transition-transform duration-200"
            />
            <span
              className={`
                text-sm whitespace-nowrap
                transition-all duration-300 ease-out
                ${sidebarCollapsed ? "w-0 opacity-0 overflow-hidden hidden" : "w-auto opacity-100"}
              `}
            >
              Logout
            </span>
          </button>
        </Tooltip>

        {/* Footer Text - Animated */}
        <div
          className={`
            overflow-hidden
            transition-all duration-300 ease-out
            ${sidebarCollapsed ? "h-0 opacity-0 mt-0" : "h-auto opacity-100 mt-4"}
          `}
        >
          <div className="text-center">
            <p className="font-medium text-gray-500 text-xs mb-0.5">
              © 2026 FileSetu
            </p>
            <p className="text-gray-400 text-xs">By Kali-Byte Solutions</p>
          </div>
        </div>
      </div>

      {/* ========================================
          CUSTOM SCROLLBAR STYLES
          ======================================== */}
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e9d5ff;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #d8b4fe;
        }

        /* Firefox scrollbar */
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #e9d5ff transparent;
        }

        /* Smooth scroll */
        .custom-scrollbar {
          scroll-behavior: smooth;
        }
      `}</style>
    </aside>
  );
};

export default Sidebar;
