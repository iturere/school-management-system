import { useEffect, useState } from "react";
import { Plus, RefreshCw, X } from "lucide-react";
import api from "../services/api";

export default function Enrollments() {
  const [items, setItems] = useState([]);
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    student_id: "",
    class_id: "",
  });

  const loadData = async () => {
    setLoading(true);
    setError("");

    try {
      const [enrollmentRes, studentRes, classRes] = await Promise.all([
        api.get("/enrollments"),
        api.get("/students"),
        api.get("/classes"),
      ]);

      const normalize = (data, key) =>
        Array.isArray(data) ? data : data[key] || data.data || [];

      setItems(normalize(enrollmentRes.data, "enrollments"));
      setStudents(normalize(studentRes.data, "students"));
      setClasses(normalize(classRes.data, "classes"));
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load enrollment data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const createEnrollment = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      await api.post("/enrollments", {
        student_id: Number(form.student_id),
        class_id: Number(form.class_id),
      });

      setForm({ student_id: "", class_id: "" });
      setShowForm(false);
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to enroll student.");
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await api.patch(`/enrollments/${id}/status`, { status });
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to update enrollment.");
    }
  };

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Enrollments</h1>
          <p className="mt-1 text-sm text-slate-500">
            Assign students to classes and manage their enrollment.
          </p>
        </div>

        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
        >
          <Plus size={18} /> Enroll Student
        </button>
      </div>

      {error && <p className="mb-5 rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</p>}

      <div className="mb-5 flex justify-end">
        <button onClick={loadData} className="flex items-center gap-2 rounded-lg border bg-white px-4 py-2 text-sm">
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
        <table className="w-full min-w-[700px] text-left text-sm">
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
            ) : items.length === 0 ? (
              <tr><td colSpan="5" className="p-10 text-center text-slate-500">No enrollments found.</td></tr>
            ) : items.map((item) => (
              <tr key={item.id}>
                <td className="px-5 py-4 font-medium">{item.full_name || item.student_name || `Student #${item.student_id}`}</td>
                <td className="px-5 py-4">{item.class_name || `Class #${item.class_id}`}</td>
                <td className="px-5 py-4">{item.enrollment_date?.slice(0, 10) || "—"}</td>
                <td className="px-5 py-4">
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs capitalize text-blue-700">{item.status}</span>
                </td>
                <td className="px-5 py-4">
                  <select
                    value={item.status}
                    onChange={(e) => updateStatus(item.id, e.target.value)}
                    className="rounded-lg border p-2"
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
          <form onSubmit={createEnrollment} className="w-full max-w-lg space-y-5 rounded-2xl bg-white p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Enroll Student</h2>
              <button type="button" onClick={() => setShowForm(false)}><X /></button>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Student</label>
              <select required value={form.student_id} onChange={(e) => setForm({ ...form, student_id: e.target.value })} className="w-full rounded-lg border p-3">
                <option value="">Select student</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>{s.full_name} — {s.admission_number}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Class</label>
              <select required value={form.class_id} onChange={(e) => setForm({ ...form, class_id: e.target.value })} className="w-full rounded-lg border p-3">
                <option value="">Select class</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.class_name} — {c.academic_year}</option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border px-5 py-3">Cancel</button>
              <button disabled={saving} className="rounded-lg bg-blue-600 px-5 py-3 text-white disabled:opacity-60">
                {saving ? "Saving..." : "Enroll Student"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}