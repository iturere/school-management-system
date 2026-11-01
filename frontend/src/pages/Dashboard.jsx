import ParentDashboard from "./ParentDashboard";
import { useCallback, useEffect, useState } from "react";
import {
  Users,
  GraduationCap,
  BookOpen,
  ClipboardList,
  CalendarCheck,
  RefreshCw,
  User,
  Clock,
  CheckCircle,
  XCircle,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";
import api from "../services/api";

const adminCards = [
  {
    key: "students",
    label: "Students",
    description: "Registered students",
    icon: Users,
    color: "blue",
  },
  {
    key: "teachers",
    label: "Teachers",
    description: "Registered teachers",
    icon: GraduationCap,
    color: "purple",
  },
  {
    key: "classes",
    label: "Classes",
    description: "Active classes",
    icon: BookOpen,
    color: "green",
  },
  {
    key: "enrollments",
    label: "Enrollments",
    description: "Active enrollments",
    icon: ClipboardList,
    color: "orange",
  },
  {
    key: "attendance",
    label: "Attendance",
    description: "Attendance records",
    icon: CalendarCheck,
    color: "pink",
  },
];

const colors = {
  blue: "bg-blue-100 text-blue-600",
  purple: "bg-purple-100 text-purple-600",
  green: "bg-green-100 text-green-600",
  orange: "bg-orange-100 text-orange-600",
  pink: "bg-pink-100 text-pink-600",
};

export default function Dashboard() {
  const { user } = useAuth();

  const [data, setData] = useState(null);
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

const isStudent = user?.role === "student";
const isParent = user?.role === "parent";

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const endpoint = isStudent
        ? "/dashboard/student"
        : "/dashboard/stats";

   const response = await api.get(endpoint);
setData(response.data);

if (isStudent) {
  const gradesResponse = await api.get("/grades/my");
  setGrades(gradesResponse.data.grades || []);
}
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Dashboard could not load. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, [isStudent]);

useEffect(() => {
  if (user?.role && user.role !== "parent") {
    fetchDashboard();
  }
}, [user?.role, fetchDashboard]);

if (isParent) {
  return <ParentDashboard />;
}

  if (loading) {
    return (
      <div className="p-6 text-gray-500">
        Loading dashboard...
      </div>
    );
  }

  if (error) {
    return (
      <div className="m-6 rounded-xl border border-red-200 bg-red-50 p-6">
        <h2 className="font-semibold text-red-700">
          Dashboard could not load
        </h2>
        <p className="mt-2 text-sm text-red-600">{error}</p>
        <button
          onClick={fetchDashboard}
          className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700"
        >
          Try again
        </button>
      </div>
    );
  }

  // STUDENT DASHBOARD
  if (isStudent) {
    const student = data?.student || {};
    const classes = data?.classes || [];
    const attendance = data?.attendance || {};

    const studentCards = [
      {
        label: "Present",
        value: attendance.present ?? 0,
        icon: CheckCircle,
        color: "green",
      },
      {
        label: "Absent",
        value: attendance.absent ?? 0,
        icon: XCircle,
        color: "red",
      },
      {
        label: "Late",
        value: attendance.late ?? 0,
        icon: Clock,
        color: "orange",
      },
      {
        label: "Total Attendance",
        value: attendance.total_records ?? 0,
        icon: CalendarCheck,
        color: "blue",
      },
    ];

    return (
      <div className="space-y-8 p-6">
        <div>
          <p className="text-sm font-medium text-blue-600">
            STUDENT PORTAL
          </p>
          <h1 className="mt-2 text-3xl font-bold text-gray-800">
            Welcome, {student.full_name || user.full_name}
          </h1>
          <p className="mt-2 text-gray-500">
            Here is an overview of your academic activities.
          </p>
        </div>

        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-100 p-3 text-blue-600">
              <User size={24} />
            </div>
            <div>
              <h2 className="font-semibold text-gray-800">
                My Profile
              </h2>
              <p className="text-sm text-gray-500">
                Your student information
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <p>
              <span className="text-sm text-gray-500">Full name</span>
              <br />
              <strong>{student.full_name || "N/A"}</strong>
            </p>
            <p>
              <span className="text-sm text-gray-500">Email</span>
              <br />
              <strong>{student.email || "N/A"}</strong>
            </p>
            <p>
              <span className="text-sm text-gray-500">Admission number</span>
              <br />
              <strong>{student.admission_number || "N/A"}</strong>
            </p>
            <p>
              <span className="text-sm text-gray-500">Phone</span>
              <br />
              <strong>{student.phone || "N/A"}</strong>
            </p>
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-xl font-bold text-gray-800">
            My Attendance
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {studentCards.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.label}
                  className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
                >
                  <div className={`mb-4 inline-flex rounded-lg p-3 ${
                    card.color === "green" ? "bg-green-100 text-green-600" :
                    card.color === "red" ? "bg-red-100 text-red-600" :
                    card.color === "orange" ? "bg-orange-100 text-orange-600" :
                    "bg-blue-100 text-blue-600"
                  }`}>
                    <Icon size={22} />
                  </div>
                  <p className="text-sm text-gray-500">{card.label}</p>
                  <h3 className="mt-1 text-3xl font-bold text-gray-800">
                    {card.value}
                  </h3>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-bold text-gray-800">
            My Classes
          </h2>




          {classes.length === 0 ? (
            <p className="text-gray-500">
              You are not enrolled in any active classes yet.
            </p>
          ) : (
            <div className="space-y-3">
              {classes.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-wrap justify-between gap-2 rounded-lg bg-gray-50 p-4"
                >
                  <div>
                    <p className="font-semibold text-gray-800">
                      {item.class_name}
                    </p>
                    <p className="text-sm text-gray-500">
                      Academic year: {item.academic_year}
                    </p>
                  </div>
                  <span className="text-sm font-medium text-green-600">
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>



        
<section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
  <h2 className="mb-4 text-xl font-bold text-gray-800">
    My Marks & Grades
  </h2>

  {grades.length === 0 ? (
    <p className="text-gray-500">
      No marks have been recorded yet.
    </p>
  ) : (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="bg-gray-50 text-gray-600">
          <tr>
            <th className="p-3">Subject</th>
            <th className="p-3">Assessment</th>
            <th className="p-3">Score</th>
            <th className="p-3">Percentage</th>
            <th className="p-3">Date</th>
          </tr>
        </thead>

        <tbody>
          {grades.map((grade) => (
            <tr key={grade.id} className="border-t">
              <td className="p-3 font-medium">
                {grade.subject}
              </td>
              <td className="p-3 capitalize">
                {grade.assessment_type}
              </td>
              <td className="p-3">
                {grade.score} / {grade.maximum_score}
              </td>
              <td className="p-3 font-semibold">
                {grade.percentage}%
              </td>
              <td className="p-3">
                {new Date(grade.assessment_date).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )}
</section>

      </div>
    );
  }

  // ADMIN AND TEACHER DASHBOARD
  const stats = data?.stats || {};

  return (
    <div className="space-y-8 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-blue-600">
            SCHOOL MANAGEMENT SYSTEM
          </p>
          <h1 className="mt-2 text-3xl font-bold text-gray-800">
            Welcome, {user?.full_name}
          </h1>
          <p className="mt-2 text-gray-500">
            Here's an overview of your school's activities.
          </p>
        </div>

        <button
          onClick={fetchDashboard}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          <RefreshCw size={17} />
          Refresh
        </button>
      </div>

      <section>
        <h2 className="mb-4 text-xl font-bold text-gray-800">
          School Statistics
        </h2>

        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {adminCards.map((card) => {
            const Icon = card.icon;

            return (
              <div
                key={card.key}
                className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-500">
                      {card.label}
                    </p>
                    <h3 className="mt-2 text-3xl font-bold text-gray-800">
                      {stats[card.key] ?? 0}
                    </h3>
                    <p className="mt-1 text-sm text-gray-400">
                      {card.description}
                    </p>
                  </div>

                  <div className={`rounded-xl p-4 ${colors[card.color]}`}>
                    <Icon size={26} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-gray-800">
          System Overview
        </h2>
        <p className="mt-2 text-gray-500">
          Manage student records, teachers, classes, enrollments,
          attendance and academic performance from one central platform.
        </p>
      </section>
    </div>
  );
}
