
import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  ClipboardCheck,
  Award,
  UserPlus,
  LogOut,
  School,
  Menu,
  X,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";

const navigation = [
  {
    name: "Dashboard",
    path: "/dashboard",
    icon: LayoutDashboard,
    roles: ["admin", "teacher"],
  },
  {
    name: "Students",
    path: "/students",
    icon: Users,
    roles: ["admin", "teacher"],
  },
  {
    name: "Teachers",
    path: "/teachers",
    icon: GraduationCap,
    roles: ["admin"],
  },
  {
    name: "Classes",
    path: "/classes",
    icon: BookOpen,
    roles: ["admin", "teacher"],
  },
  {
    name: "Enrollments",
    path: "/enrollments",
    icon: UserPlus,
    roles: ["admin"],
  },
  {
  name: "Parents",
  path: "/parents",
  icon: UserPlus,
  roles: ["admin"],
},
  {
    name: "Attendance",
    path: "/attendance",
    icon: ClipboardCheck,
    roles: ["admin", "teacher"],
  },
  {
    name: "Grades",
    path: "/grades",
    icon: Award,
    roles: ["admin", "teacher"],
  },
];

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/", { replace: true });
  };

  const visibleNavigation = navigation.filter((item) =>
    item.roles.includes(user?.role)
  );

  const sidebar = (
    <div className="flex h-full flex-col bg-slate-900 text-white">
      {/* Brand */}
      <div className="flex items-center gap-3 border-b border-slate-700 p-6">
        <School size={32} className="shrink-0 text-blue-400" />

        <div>
          <h1 className="font-bold">School Management</h1>
          <p className="text-xs text-slate-400">
            Management Portal
          </p>
        </div>

        <button
          onClick={() => setSidebarOpen(false)}
          className="ml-auto rounded-lg p-2 text-slate-400 hover:bg-slate-800 lg:hidden"
          aria-label="Close navigation"
        >
          <X size={20} />
        </button>
      </div>

      {/* User information */}
      <div className="border-b border-slate-700 p-5">
        <p className="truncate font-medium">
          {user?.full_name || "User"}
        </p>
        <p className="mt-1 text-xs capitalize text-slate-400">
          {user?.role || "Account"}
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-2 overflow-y-auto p-4">
        {visibleNavigation.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/dashboard"}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition ${
                  isActive
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`
              }
            >
              <Icon size={19} />
              {item.name}
            </NavLink>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="border-t border-slate-700 p-4">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-red-300 transition hover:bg-slate-800"
        >
          <LogOut size={19} />
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">
        {sidebar}
      </aside>

      {/* Mobile sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            className="absolute inset-0 bg-black/50"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close navigation overlay"
          />

          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw]">
            {sidebar}
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="min-h-screen lg:ml-64">
        {/* Header */}
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
              aria-label="Open navigation"
            >
              <Menu size={23} />
            </button>

            <div>
              <h2 className="font-semibold text-slate-800">
                School Management
              </h2>

              <p className="hidden text-sm text-slate-500 sm:block">
                Manage your school's activities
              </p>
            </div>
          </div>

          <div className="text-right">
            <p className="max-w-40 truncate text-sm font-medium text-slate-800">
              {user?.full_name || "User"}
            </p>

            <p className="text-xs capitalize text-slate-500">
              {user?.role || "Account"}
            </p>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
