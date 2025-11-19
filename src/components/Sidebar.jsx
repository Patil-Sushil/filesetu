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
  onCollapsedChange, // optional callback to inform parent about collapsed state
}) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect screen size
  useEffect(() => {
    const checkScreenSize = () => {
      const mobile = window.innerWidth < 1024; // Changed to 1024 to match lg breakpoint
      setIsMobile(mobile);

      // Don't auto-collapse on desktop
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
        },
        {
          id: "logbook",
          label: "Log Book",
          icon: <Calendar size={20} />,
          emoji: "📖",
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
    // The Dashboard will handle closing the mobile menu
  };

  const toggleSidebar = () => {
    const next = !sidebarCollapsed;
    setSidebarCollapsed(next);
    if (typeof onCollapsedChange === "function") {
      onCollapsedChange(next);
    }
  };

  return (
    <aside
      className={`
        h-screen
        bg-white border-r border-purple-100
        flex flex-col
        transition-all duration-300 ease-in-out
        ${!isMobile && sidebarCollapsed ? 'w-20' : 'w-72'}
        shadow-xl
      `}
    >
      {/* Sidebar Header */}
      <div className="flex items-center justify-between p-4 md:p-6 border-b border-purple-100 bg-gradient-to-r from-purple-50 to-pink-50">
        <div className="flex items-center gap-3 min-w-0">
          <div className="shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center shadow-lg">
            <LayoutDashboard 
              className="text-white" 
              size={isMobile ? 20 : 24} 
            />
          </div>
          {!sidebarCollapsed && (
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-gray-800 text-base md:text-lg truncate">
                {userRole === "admin" ? "Admin Panel" : "User Panel"}
              </span>
              <span className="text-xs text-gray-500 truncate">Dashboard</span>
            </div>
          )}
        </div>

        {/* Desktop Toggle Button */}
        {!isMobile && (
          <button
            className="p-2 hover:bg-purple-100 rounded-lg transition-colors text-purple-600 shrink-0"
            onClick={toggleSidebar}
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {sidebarCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
        )}
      </div>

      {/* User Profile Card */}
      <div className={`
        mx-3 md:mx-4 my-3 md:my-4 p-3 md:p-4 rounded-xl 
        bg-gradient-to-br from-purple-50 to-pink-50
        border-2 border-purple-100 flex items-center gap-3
        shadow-sm hover:shadow-md transition-shadow
        ${sidebarCollapsed ? 'justify-center' : ''}
      `}>
        <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-white font-bold text-base md:text-lg shrink-0 shadow-md">
          {(userName || currentUser?.email || "U").charAt(0).toUpperCase()}
        </div>
        {!sidebarCollapsed && (
          <div className="flex flex-col min-w-0 flex-1">
            <span className="font-semibold text-gray-800 truncate text-sm md:text-base">
              {userName || currentUser?.email?.split("@")[0] || "User"}
            </span>
            <span className="text-xs text-gray-600 truncate">
              {userRole === "admin" ? "👑 Administrator" : "👤 Sub Admin"}
            </span>
          </div>
        )}
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 px-2 md:px-3 overflow-y-auto custom-scrollbar">
        <div className="space-y-1 py-2">
          {!sidebarCollapsed && (
            <span className="px-3 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider block">
              Navigation
            </span>
          )}
          {menuItems.map((item, index) => (
            <button
              key={item.id}
              className={`
                w-full flex items-center gap-3 px-3 md:px-4 py-2.5 md:py-3 rounded-xl
                transition-all duration-200 relative group
                ${sidebarCollapsed ? 'justify-center' : ''}
                ${activeTab === item.id 
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg scale-[1.02]' 
                  : 'text-gray-700 hover:bg-purple-50 hover:scale-[1.01]'
                }
                ${(item.id === "dairy" || item.id === "logbook") && activeTab !== item.id
                  ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-200'
                  : activeTab !== item.id ? 'border-2 border-transparent' : ''
                }
              `}
              onClick={() => handleMenuClick(item.id)}
              title={sidebarCollapsed ? item.label : ""}
              aria-label={item.label}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <span className={`
                text-xl shrink-0
                ${activeTab === item.id ? '' : 'group-hover:scale-110'} 
                transition-transform duration-200
              `}>
                {sidebarCollapsed ? item.emoji : item.icon}
              </span>
              {!sidebarCollapsed && (
                <span className="font-medium text-sm md:text-base truncate flex-1 text-left">
                  {item.label}
                </span>
              )}
              {activeTab === item.id && !sidebarCollapsed && (
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-3/4 bg-white rounded-l-full shadow-md"></div>
              )}
              {sidebarCollapsed && activeTab === item.id && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-3/4 bg-purple-600 rounded-r-full"></div>
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* Sidebar Footer */}
      <div className="p-3 md:p-4 border-t-2 border-purple-100 bg-gradient-to-r from-red-50 to-pink-50">
        <button
          onClick={onLogoutClick}
          className={`
            w-full flex items-center gap-3 px-3 md:px-4 py-2.5 md:py-3 rounded-xl
            bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700
            text-white font-semibold
            transition-all duration-200
            shadow-md hover:shadow-lg hover:scale-[1.02]
            ${sidebarCollapsed ? 'justify-center' : ''}
          `}
          title="Logout"
          aria-label="Logout"
        >
          <LogOut size={20} className="shrink-0" />
          {!sidebarCollapsed && <span className="text-sm md:text-base">Logout</span>}
        </button>
        
        {!sidebarCollapsed && (
          <p className="text-center text-xs text-gray-500 mt-3">
            © 2024 Dashboard
          </p>
        )}
      </div>

      {/* Custom Scrollbar Styles */}
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #d8b4fe;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #c084fc;
        }
      `}</style>
    </aside>
  );
};

export default Sidebar;