
import { useEffect, useState } from "react";
import api from "../services/api";

export default function ParentDashboard() {
  const [children, setChildren] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [error, setError] = useState("");

  // Load children linked to the logged-in parent.
  useEffect(() => {
    let ignore = false;

    async function loadChildren() {
      try {
        const response = await api.get("/parents/me/children");

        if (ignore) return;

        const list = response.data.children || [];
        setChildren(list);

        if (list.length > 0) {
          setSelectedId(String(list[0].student_id));
        }
      } catch (err) {
        if (!ignore) {
          setError(
            err.response?.data?.message || "Could not load your children."
          );
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    loadChildren();

    return () => {
      ignore = true;
    };
  }, []);

  // Load details whenever the selected child changes.
  useEffect(() => {
    if (!selectedId) {
      setDetails(null);
      return;
    }

    let ignore = false;

    async function loadDetails() {
      setDetailsLoading(true);
      setDetails(null);

      try {
        const response = await api.get(
          `/parents/me/children/${selectedId}`
        );

        if (!ignore) {
          setDetails(response.data);
        }
      } catch (err) {
        if (!ignore) {
          setError(
            err.response?.data?.message || "Could not load child details."
          );
        }
      } finally {
        if (!ignore) setDetailsLoading(false);
      }
    }

    loadDetails();

    return () => {
      ignore = true;
    };
  }, [selectedId]);

  if (loading) {
    return <div className="p-8">Loading your parent dashboard...</div>;
  }

  if (error && children.length === 0) {
    return <div className="p-8 text-red-600">{error}</div>;
  }

  if (children.length === 0) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-gray-800">
          Parent Dashboard
        </h1>
        <p className="mt-4 text-gray-600">
          No children are linked to your account yet. Please contact the
          school administrator.
        </p>
      </div>
    );
  }

  const child = details?.child;
  const attendance = details?.attendance || [];
  const grades = details?.grades || [];
  const classes = details?.classes || [];

  const presentCount = attendance.filter(
    (item) => item.status === "present"
  ).length;

  const absentCount = attendance.filter(
    (item) => item.status === "absent"
  ).length;

  const lateCount = attendance.filter(
    (item) => item.status === "late"
  ).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">
          Parent Dashboard
        </h1>
        <p className="mt-1 text-gray-500">
          Monitor your child's academic progress.
        </p>
      </div>

      <div className="max-w-sm">
        <label className="mb-2 block text-sm font-medium text-gray-700">
          Select Child
        </label>

        <select
          value={selectedId}
          onChange={(e) => {
            setSelectedId(e.target.value);
            setError("");
          }}
          className="w-full rounded-lg border border-gray-300 bg-white p-3"
        >
          {children.map((item) => (
            <option key={item.student_id} value={item.student_id}>
              {item.full_name}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 p-3 text-red-700">{error}</p>
      )}

      {detailsLoading && (
        <p className="text-gray-500">Loading child's information...</p>
      )}

      {child && !detailsLoading && (
        <>
          <section className="rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-semibold text-gray-800">
              Student Profile
            </h2>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <p className="text-sm text-gray-500">Full Name</p>
                <p className="font-medium">{child.full_name}</p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Admission Number</p>
                <p className="font-medium">
                  {child.admission_number || "Not available"}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-medium">{child.email}</p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Relationship</p>
                <p className="font-medium">
                  {child.relationship || "Not specified"}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Phone</p>
                <p className="font-medium">
                  {child.phone || "Not available"}
                </p>
              </div>
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <p className="text-sm text-gray-500">Present</p>
              <p className="mt-2 text-3xl font-bold text-green-600">
                {presentCount}
              </p>
            </div>

            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <p className="text-sm text-gray-500">Absent</p>
              <p className="mt-2 text-3xl font-bold text-red-600">
                {absentCount}
              </p>
            </div>

            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <p className="text-sm text-gray-500">Late</p>
              <p className="mt-2 text-3xl font-bold text-amber-600">
                {lateCount}
              </p>
            </div>
          </section>

          <section className="rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-semibold">Enrolled Classes</h2>

            {classes.length === 0 ? (
              <p className="text-gray-500">No active classes found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="p-3">Class</th>
                      <th className="p-3">Academic Year</th>
                      <th className="p-3">Enrollment Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classes.map((item) => (
                      <tr key={item.enrollment_id} className="border-t">
                        <td className="p-3">{item.class_name}</td>
                        <td className="p-3">{item.academic_year}</td>
                        <td className="p-3">
                          {item.enrollment_date
                            ? new Date(item.enrollment_date).toLocaleDateString()
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-semibold">Attendance Records</h2>

            {attendance.length === 0 ? (
              <p className="text-gray-500">No attendance records found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="p-3">Date</th>
                      <th className="p-3">Class</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendance.map((item) => (
                      <tr key={item.id} className="border-t">
                        <td className="p-3">
                          {new Date(item.attendance_date).toLocaleDateString()}
                        </td>
                        <td className="p-3">{item.class_name}</td>
                        <td className="p-3 capitalize">{item.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-semibold">Marks & Grades</h2>

            {grades.length === 0 ? (
              <p className="text-gray-500">No grades available yet.</p>
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
                    {grades.map((item) => (
                      <tr key={item.id} className="border-t">
                        <td className="p-3">{item.subject}</td>
                        <td className="p-3">{item.assessment_type}</td>
                        <td className="p-3">
                          {item.score} / {item.maximum_score}
                        </td>
                        <td className="p-3">
                          {Number(item.percentage).toFixed(2)}%
                        </td>
                        <td className="p-3">
                          {item.assessment_date
                            ? new Date(item.assessment_date).toLocaleDateString()
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
