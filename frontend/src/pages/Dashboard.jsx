import {
  Users,
  GraduationCap,
  BookOpen,
  ClipboardCheck,
} from "lucide-react";

const statistics = [
  {
    title: "Students",
    value: "—",
    description: "Registered students",
    icon: Users,
    color: "bg-blue-100 text-blue-600",
  },
  {
    title: "Teachers",
    value: "—",
    description: "Registered teachers",
    icon: GraduationCap,
    color: "bg-green-100 text-green-600",
  },
  {
    title: "Classes",
    value: "—",
    description: "Active classes",
    icon: BookOpen,
    color: "bg-purple-100 text-purple-600",
  },
  {
    title: "Attendance",
    value: "—",
    description: "Attendance records",
    icon: ClipboardCheck,
    color: "bg-orange-100 text-orange-600",
  },
];

export default function Dashboard() {
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

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {statistics.map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.title}
              className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">{item.title}</p>
                  <h2 className="mt-2 text-3xl font-bold text-slate-800">
                    {item.value}
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
          Use the navigation menu to manage students, teachers, classes,
          enrollments, attendance and grades. We'll connect the dashboard
          statistics to your database next.
        </p>
      </div>
    </div>
  );
}