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
  openProfile, // ✅ new prop
}) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

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
        {
          id: "portfolio",
          label: "My Files",
          icon: <FolderOpen size={20} />,
          emoji: "💼",
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

  return (
    <aside
      className={`h-screen bg-white border-r border-purple-100 flex flex-col shadow-xl transition-[width] duration-300 ${
        sidebarCollapsed ? "w-[76px]" : "w-72"
      } overflow-hidden`}
    >
      {/* HEADER */}
      <div className="flex items-center p-4 border-b bg-gradient-to-r from-purple-50 to-pink-50">
        <div className="rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 w-11 h-11 flex items-center justify-center text-white shadow-lg">
          <LayoutDashboard size={22} />
        </div>

        {!sidebarCollapsed && (
          <div className="ml-3 flex-1">
            <span className="font-bold text-gray-800 text-base">
              {userRole === "admin" ? "Admin Panel" : "User Panel"}
            </span>
            <span className="block text-xs text-gray-500">Dashboard</span>
          </div>
        )}

        {!isMobile && (
          <button
            className="p-2 hover:bg-purple-100 rounded-lg text-purple-600"
            onClick={toggleSidebar}
          >
            {sidebarCollapsed ? <ChevronRight /> : <ChevronLeft />}
          </button>
        )}
      </div>

      {/* PROFILE CARD */}
      <div
        onClick={openProfile} // ✅ opens profile modal
        className={`mx-3 my-3 rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-100 flex items-center shadow-sm hover:shadow-md transition-all cursor-pointer ${
          sidebarCollapsed ? "p-2 justify-center" : "p-3 gap-3"
        }`}
      >
        <div className="rounded-full bg-gradient-to-br from-purple-600 to-pink-600 w-11 h-11 flex items-center justify-center text-white font-bold shadow-md">
          {(userName || currentUser?.email || "U").charAt(0).toUpperCase()}
        </div>

        {!sidebarCollapsed && (
          <div className="flex flex-col">
            <span className="font-semibold text-gray-800 text-sm">
              {userName || currentUser?.email?.split("@")[0] || "User"}
            </span>
            <span className="text-xs text-gray-600">
              {userRole === "admin" ? "👑 Administrator" : "👤 Sub Admin"}
            </span>
          </div>
        )}
      </div>

      {/* MENU */}
      <nav className="flex-1 px-2 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => handleMenuClick(item.id)}
              className={`w-full flex items-center rounded-xl px-4 py-3 mb-1 ${
                isActive
                  ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white"
                  : "text-gray-700 hover:bg-purple-50"
              }`}
            >
              <span className="mr-3">
                {sidebarCollapsed ? item.emoji : item.icon}
              </span>

              {!sidebarCollapsed && (
                <span className="text-sm">{item.label}</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* FOOTER */}
      <div className="border-t p-4">
        <button
          onClick={onLogoutClick}
          className="w-full flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl"
        >
          <LogOut size={20} />
          {!sidebarCollapsed && "Logout"}
        </button>

        {!sidebarCollapsed && (
          <div className="text-center mt-4 text-xs text-gray-500">
            © 2026 FileSetu
            <br />
            By Kali-Byte Solutions
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
