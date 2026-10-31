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
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

const navigation = [
  { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { name: "Students", path: "/students", icon: Users },
  { name: "Teachers", path: "/teachers", icon: GraduationCap },
  { name: "Classes", path: "/classes", icon: BookOpen },
  { name: "Enrollments", path: "/enrollments", icon: UserPlus },
  { name: "Attendance", path: "/attendance", icon: ClipboardCheck },
  { name: "Grades", path: "/grades", icon: Award },
];

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/", { replace: true });
  };

  return (
    <div className="flex min-h-screen bg-slate-100">
      <aside className="fixed inset-y-0 left-0 z-20 flex w-64 flex-col bg-slate-900 text-white">
        <div className="flex items-center gap-3 border-b border-slate-700 p-6">
          <School size={30} className="text-blue-400" />
          <div>
            <h1 className="font-bold">School Management</h1>
            <p className="text-xs text-slate-400">Administration</p>
          </div>
        </div>

        <nav className="flex-1 space-y-2 p-4">
          {navigation.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/dashboard"}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-4 py-3 text-sm transition ${
                    isActive
                      ? "bg-blue-600 text-white"
                      : "text-slate-300 hover:bg-slate-800"
                  }`
                }
              >
                <Icon size={19} />
                {item.name}
              </NavLink>
            );
          })}
        </nav>

        <button
          onClick={handleLogout}
          className="m-4 flex items-center gap-3 rounded-lg px-4 py-3 text-sm text-red-300 hover:bg-slate-800"
        >
          <LogOut size={19} />
          Sign out
        </button>
      </aside>

      <main className="ml-64 min-h-screen flex-1">
        <header className="flex items-center justify-between border-b bg-white px-8 py-5">
          <div>
            <h2 className="font-semibold text-slate-800">
              School Administration
            </h2>
            <p className="text-sm text-slate-500">
              Manage your school's activities
            </p>
          </div>

          <div className="text-right">
            <p className="font-medium text-slate-800">
              {user?.full_name || "Administrator"}
            </p>
            <p className="text-xs capitalize text-slate-500">
              {user?.role || "Admin"}
            </p>
          </div>
        </header>

        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}