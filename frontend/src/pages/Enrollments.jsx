import { useEffect, useState } from "react";
import { Plus, RefreshCw, X, Search } from "lucide-react";
import api from "../services/api";

export default function Enrollments() {
  const [enrollments, setEnrollments] = useState([]);
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    student_id: "",
    class_id: "",
  });

  const fetchEnrollments = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/enrollments", {
        params: status ? { status } : {},
      });

      const data = response.data;
      setEnrollments(
        Array.isArray(data) ? data : data.enrollments || data.data || []
      );
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load enrollments.");
    } finally {
      setLoading(false);
    }
  };

  const fetchOptions = async () => {
    try {
      const [studentResponse, classResponse] = await Promise.all([
        api.get("/students"),
        api.get("/classes"),
      ]);

      const studentData = studentResponse.data;
      const classData = classResponse.data;

      setStudents(
        Array.isArray(studentData)
          ? studentData
          : studentData.students || studentData.data || []
      );

      setClasses(
        Array.isArray(classData)
          ? classData
          : classData.classes || classData.data || []
      );
    } catch (err) {
      console.error("Unable to load enrollment options:", err);
    }
  };

  useEffect(() => {
    fetchEnrollments();
  }, [status]);

  useEffect(() => {
    fetchOptions();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      await api.post("/enrollments", {
        student_id: Number(form.student_id),
        class_id: Number(form.class_id),
      });

      setShowForm(false);
      setForm({ student_id: "", class_id: "" });
      await fetchEnrollments();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to create enrollment.");
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (enrollment, newStatus) => {
    if (!window.confirm(`Change this enrollment to ${newStatus}?`)) return;

    try {
      await api.patch(`/enrollments/${enrollment.id}/status`, {
        status: newStatus,
      });
      await fetchEnrollments();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to update enrollment.");
    }
  };

  const filtered = enrollments.filter((item) => {
    const text = search.toLowerCase();
    return [
      item.student_name,
      item.full_name,
      item.admission_number,
      item.class_name,
    ].some((value) => String(value || "").toLowerCase().includes(text));
  });

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Enrollments</h1>
          <p className="mt-1 text-sm text-slate-500">
            Register students in classes and manage their enrollment status.
          </p>
        </div>

        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
        >
          <Plus size={18} /> Enroll Student
        </button>
      </div>

      <div className="mb-6 flex flex-wrap gap-3 rounded-xl border bg-white p-5">
        <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-lg border px-3">
          <Search size={18} className="text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search student or class..."
            className="w-full py-3 text-sm outline-none"
          />
        </div>

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-lg border px-4 py-3 text-sm"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="withdrawn">Withdrawn</option>
        </select>

        <button onClick={fetchEnrollments} className="rounded-lg p-3 hover:bg-slate-100">
          <RefreshCw size={18} />
        </button>
      </div>

      {error && <p className="mb-5 rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</p>}

      <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
        <table className="w-full min-w-[750px] text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-5 py-4">Student</th>
              <th className="px-5 py-4">Class</th>
              <th className="px-5 py-4">Enrollment date</th>
              <th className="px-5 py-4">Status</th>
              <th className="px-5 py-4">Update status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr><td colSpan="5" className="p-10 text-center">Loading enrollments...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan="5" className="p-10 text-center text-slate-500">No enrollments found.</td></tr>
            ) : filtered.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50">
                <td className="px-5 py-4">
                  <p className="font-medium">{item.student_name || item.full_name || `Student #${item.student_id}`}</p>
                  <p className="text-xs text-slate-500">{item.admission_number || ""}</p>
                </td>
                <td className="px-5 py-4">{item.class_name || `Class #${item.class_id}`}</td>
                <td className="px-5 py-4">
                  {item.enrollment_date ? String(item.enrollment_date).slice(0, 10) : "—"}
                </td>
                <td className="px-5 py-4">
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                    item.status === "active"
                      ? "bg-green-100 text-green-700"
                      : item.status === "completed"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-slate-100 text-slate-600"
                  }`}>
                    {item.status}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <select
                    value={item.status}
                    onChange={(e) => updateStatus(item, e.target.value)}
                    className="rounded-lg border p-2 text-xs"
                  >
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="withdrawn">Withdrawn</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold">Enroll a Student</h2>
              <button onClick={() => setShowForm(false)}><X size={20} /></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium">Student</label>
                <select
                  required
                  value={form.student_id}
                  onChange={(e) => setForm({ ...form, student_id: e.target.value })}
                  className="w-full rounded-lg border p-3"
                >
                  <option value="">Select student</option>
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.full_name} — {student.admission_number}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Class</label>
                <select
                  required
                  value={form.class_id}
                  onChange={(e) => setForm({ ...form, class_id: e.target.value })}
                  className="w-full rounded-lg border p-3"
                >
                  <option value="">Select class</option>
                  {classes.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.class_name} — {item.academic_year}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border px-5 py-3">Cancel</button>
                <button disabled={saving} className="rounded-lg bg-blue-600 px-6 py-3 text-white disabled:opacity-60">
                  {saving ? "Enrolling..." : "Enroll Student"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}