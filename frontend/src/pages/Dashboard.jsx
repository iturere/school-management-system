
import { useEffect, useState } from "react";
import {
  Users,
  GraduationCap,
  BookOpen,
  ClipboardCheck,
  UserCheck,
} from "lucide-react";
import api from "../services/api";

const statisticCards = [
  {
    key: "students",
    title: "Students",
    description: "Registered students",
    icon: Users,
    color: "bg-blue-100 text-blue-600",
  },
  {
    key: "teachers",
    title: "Teachers",
    description: "Registered teachers",
    icon: GraduationCap,
    color: "bg-green-100 text-green-600",
  },
  {
    key: "classes",
    title: "Classes",
    description: "Active classes",
    icon: BookOpen,
    color: "bg-purple-100 text-purple-600",
  },
  {
    key: "enrollments",
    title: "Enrollments",
    description: "Active enrollments",
    icon: UserCheck,
    color: "bg-indigo-100 text-indigo-600",
  },
  {
    key: "attendance",
    title: "Attendance",
    description: "Attendance records",
    icon: ClipboardCheck,
    color: "bg-orange-100 text-orange-600",
  },
];

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchStatistics = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await api.get("/dashboard/stats");

        setStats(response.data.stats);
      } catch (err) {
        console.error("Failed to load dashboard:", err);

        setError(
          err.response?.data?.message ||
            "Unable to load dashboard statistics."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchStatistics();
  }, []);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">
          Dashboard Overview
        </h1>

        <p className="mt-1 text-slate-500">
          Welcome to your School Management System.
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {statisticCards.map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.key}
              className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">
                    {item.title}
                  </p>

                  <h2 className="mt-2 text-3xl font-bold text-slate-800">
                    {loading ? "..." : (stats?.[item.key] ?? 0).toLocaleString()}
                  </h2>
                </div>

                <div className={`rounded-xl p-3 ${item.color}`}>
                  <Icon size={25} />
                </div>
              </div>

              <p className="mt-4 text-xs text-slate-400">
                {item.description}
              </p>
            </div>
          );
        })}
      </div>

      <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-800">
          System Overview
        </h2>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          Your dashboard now retrieves statistics directly from the
          school database. Use the navigation menu to manage students,
          teachers, classes, enrollments, attendance and grades.
        </p>
      </div>
    </div>
  );
}
