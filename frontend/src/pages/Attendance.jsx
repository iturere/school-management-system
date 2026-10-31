import { useEffect, useState } from "react";
import { Plus, RefreshCw, Search } from "lucide-react";
import api from "../services/api";

const today = new Date().toLocaleDateString("en-CA");

export default function Attendance() {
  const [records, setRecords] = useState([]);
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [search, setSearch] = useState("");
  const [date, setDate] = useState(today);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    student_id: "",
    class_id: "",
    attendance_date: today,
    status: "present",
  });

  const fetchRecords = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/attendance", {
        params: date ? { attendance_date: date } : {},
      });

      const data = response.data;
      setRecords(
        Array.isArray(data) ? data : data.attendance || data.records || data.data || []
      );
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load attendance.");
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
        Array.isArray(studentData) ? studentData : studentData.students || studentData.data || []
      );
      setClasses(
        Array.isArray(classData) ? classData : classData.classes || classData.data || []
      );
    } catch (err) {
      console.error("Unable to load attendance options:", err);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [date]);

  useEffect(() => {
    fetchOptions();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      await api.post("/attendance", {
        ...form,
        student_id: Number(form.student_id),
        class_id: Number(form.class_id),
      });

      setForm({ ...form, student_id: "", status: "present" });
      await fetchRecords();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to record attendance.");
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (record, newStatus) => {
    try {
      await api.patch(`/attendance/${record.id}`, { status: newStatus });
      await fetchRecords();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to update attendance.");
    }
  };

  const filtered = records.filter((item) =>
    [
      item.student_name,
      item.full_name,
      item.admission_number,
      item.class_name,
    ].some((value) => String(value || "").toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Attendance</h1>
        <p className="mt-1 text-sm text-slate-500">Record and monitor student attendance.</p>
      </div>

      <div className="mb-6 rounded-xl border bg-white p-5">
        <h2 className="mb-4 font-semibold text-slate-800">Record Attendance</h2>

        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <select
            required
            value={form.student_id}
            onChange={(e) => setForm({ ...form, student_id: e.target.value })}
            className="rounded-lg border p-3 text-sm"
          >
            <option value="">Select student</option>
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.full_name} — {student.admission_number}
              </option>
            ))}
          </select>

          <select
            required
            value={form.class_id}
            onChange={(e) => setForm({ ...form, class_id: e.target.value })}
            className="rounded-lg border p-3 text-sm"
          >
            <option value="">Select class</option>
            {classes.map((item) => (
              <option key={item.id} value={item.id}>{item.class_name}</option>
            ))}
          </select>

          <input
            type="date"
            required
            value={form.attendance_date}
            onChange={(e) => setForm({ ...form, attendance_date: e.target.value })}
            className="rounded-lg border p-3 text-sm"
          />

          <select
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
            className="rounded-lg border p-3 text-sm"
          >
            <option value="present">Present</option>
            <option value="absent">Absent</option>
            <option value="late">Late</option>
            <option value="excused">Excused</option>
          </select>

          <button
            disabled={saving}
            className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            <Plus size={17} /> {saving ? "Saving..." : "Record"}
          </button>
        </form>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border bg-white p-5">
        <div className="flex min-w-[200px] flex-1 items-center gap-2 rounded-lg border px-3">
          <Search size={18} className="text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search student or class..."
            className="w-full py-3 text-sm outline-none"
          />
        </div>

        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-lg border p-3 text-sm"
        />

        <button onClick={fetchRecords} title="Refresh" className="rounded-lg p-3 hover:bg-slate-100">
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
              <th className="px-5 py-4">Date</th>
              <th className="px-5 py-4">Attendance status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr><td colSpan="4" className="p-10 text-center">Loading attendance...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan="4" className="p-10 text-center text-slate-500">No attendance records found.</td></tr>
            ) : filtered.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50">
                <td className="px-5 py-4">
                  <p className="font-medium">{item.student_name || item.full_name || `Student #${item.student_id}`}</p>
                  <p className="text-xs text-slate-500">{item.admission_number || ""}</p>
                </td>
                <td className="px-5 py-4">{item.class_name || `Class #${item.class_id}`}</td>
                <td className="px-5 py-4">{String(item.attendance_date || "").slice(0, 10)}</td>
                <td className="px-5 py-4">
                  <select
                    value={item.status}
                    onChange={(e) => updateStatus(item, e.target.value)}
                    className="rounded-lg border p-2 text-xs capitalize"
                  >
                    <option value="present">Present</option>
                    <option value="absent">Absent</option>
                    <option value="late">Late</option>
                    <option value="excused">Excused</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}