// src/components/Sidebar.js
import React, { useState, useEffect } from "react";
import {
  LayoutDashboard,
  LogOut,
  Menu,
  X,
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Detect screen size
  useEffect(() => {
    const checkScreenSize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);

      // Auto-collapse on mobile
      if (mobile) {
        const nextCollapsed = false; // keep expanded logic disabled on mobile; use drawer behavior instead
        setSidebarCollapsed(nextCollapsed);
        setMobileMenuOpen(false);
        if (typeof onCollapsedChange === "function") {
          onCollapsedChange(nextCollapsed);
        }
      } else {
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
    if (isMobile) {
      setMobileMenuOpen(false);
    }
  };

  const toggleSidebar = () => {
    if (isMobile) {
      setMobileMenuOpen(!mobileMenuOpen);
    } else {
      const next = !sidebarCollapsed;
      setSidebarCollapsed(next);
      if (typeof onCollapsedChange === "function") {
        onCollapsedChange(next);
      }
    }
  };

  return (
    <>
      {/* Mobile Hamburger Button */}
      {isMobile && (
        <button
          className="fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-lg md:hidden text-purple-600 hover:bg-purple-50 transition-colors"
          onClick={toggleSidebar}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      )}

      {/* Overlay for mobile */}
      {isMobile && mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          ${isMobile ? 'fixed' : 'sticky'} 
          top-0 left-0 h-screen
          bg-white border-r border-purple-100
          flex flex-col
          transition-all duration-300 ease-in-out
          ${!isMobile && sidebarCollapsed ? 'w-20' : 'w-72'}
          ${isMobile && !mobileMenuOpen ? '-translate-x-full' : 'translate-x-0'}
          ${isMobile ? 'z-50' : 'z-10'}
          shadow-lg
        `}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-4 border-b border-purple-100">
          <div className="flex items-center gap-3">
            <LayoutDashboard 
              className="text-purple-600" 
              size={isMobile ? 24 : 28} 
            />
            {!sidebarCollapsed && (
              <div className="flex flex-col">
                <span className="font-bold text-gray-800 text-lg">
                  {userRole === "admin" ? "Admin Panel" : "User Panel"}
                </span>
                <span className="text-xs text-gray-500">Dashboard</span>
              </div>
            )}
          </div>

          {/* Desktop Toggle Button */}
          {!isMobile && (
            <button
              className="p-2 hover:bg-purple-50 rounded-lg transition-colors text-purple-600"
              onClick={toggleSidebar}
              title={sidebarCollapsed ? "Expand" : "Collapse"}
              aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {sidebarCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
            </button>
          )}
        </div>

        {/* User Profile Card */}
        <div className={`
          mx-4 my-4 p-4 rounded-xl bg-gradient-to-br from-purple-50 to-pink-50
          border border-purple-100 flex items-center gap-3
          ${sidebarCollapsed ? 'justify-center' : ''}
        `}>
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-white font-bold text-lg shrink-0">
            {currentUser?.email?.charAt(0).toUpperCase()}
          </div>
          {!sidebarCollapsed && (
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-gray-800 truncate text-sm">
                {userName || currentUser?.email?.split("@")[0]}
              </span>
              <span className="text-xs text-gray-600">
                {userRole === "admin" ? "👑 Administrator" : "👤 Sub Admin"}
              </span>
            </div>
          )}
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-3 overflow-y-auto">
          <div className="space-y-1">
            {!sidebarCollapsed && (
              <span className="px-3 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider block">
                MENU
              </span>
            )}
            {menuItems.map((item) => (
              <button
                key={item.id}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-lg
                  transition-all duration-200 relative group
                  ${sidebarCollapsed ? 'justify-center' : ''}
                  ${activeTab === item.id 
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md' 
                    : 'text-gray-700 hover:bg-purple-50'
                  }
                  ${(item.id === "dairy" || item.id === "logbook") && activeTab !== item.id
                    ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200'
                    : ''
                  }
                `}
                onClick={() => handleMenuClick(item.id)}
                title={sidebarCollapsed ? item.label : ""}
                aria-label={item.label}
              >
                <span className={`text-xl ${activeTab === item.id ? '' : 'group-hover:scale-110 transition-transform'}`}>
                  {isMobile || sidebarCollapsed ? item.emoji : item.icon}
                </span>
                {!sidebarCollapsed && (
                  <span className="font-medium text-sm">{item.label}</span>
                )}
                {activeTab === item.id && (
                  <span className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-l-full"></span>
                )}
              </button>
            ))}
          </div>
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-purple-100">
          <button
            onClick={onLogoutClick}
            className={`
              w-full flex items-center gap-3 px-4 py-3 rounded-lg
              bg-red-50 hover:bg-red-100 text-red-600 font-medium
              transition-all duration-200
              ${sidebarCollapsed ? 'justify-center' : ''}
            `}
            title="Logout"
            aria-label="Logout"
          >
            <LogOut size={20} />
            {!sidebarCollapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
