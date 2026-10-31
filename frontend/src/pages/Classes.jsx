import { useEffect, useState } from "react";
import { Plus, Search, Pencil, Power, X, RefreshCw } from "lucide-react";
import api from "../services/api";

const emptyForm = {
  class_name: "",
  academic_year: "2026-2027",
  teacher_id: "",
};

export default function Classes() {
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const fetchClasses = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/classes", {
        params: { search },
      });

      const data = response.data;
      setClasses(Array.isArray(data) ? data : data.classes || data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load classes.");
    } finally {
      setLoading(false);
    }
  };

  const fetchTeachers = async () => {
    try {
      const response = await api.get("/teachers");
      const data = response.data;
      const list = Array.isArray(data) ? data : data.teachers || data.data || [];
      setTeachers(list.filter((teacher) => teacher.is_active ?? teacher.user_is_active ?? true));
    } catch (err) {
      console.error("Unable to load teachers:", err);
    }
  };

  useEffect(() => {
    const timer = setTimeout(fetchClasses, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    fetchTeachers();
  }, []);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({
      class_name: item.class_name || "",
      academic_year: item.academic_year || "",
      teacher_id: item.teacher_id ? String(item.teacher_id) : "",
    });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const payload = {
        ...form,
        teacher_id: form.teacher_id ? Number(form.teacher_id) : null,
      };

      if (editing) {
        await api.put(`/classes/${editing.id}`, payload);
      } else {
        await api.post("/classes", payload);
      }

      setShowForm(false);
      setEditing(null);
      setForm(emptyForm);
      await fetchClasses();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to save class.");
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (item) => {
    const active = item.is_active;
    const action = active ? "deactivate" : "reactivate";

    if (!window.confirm(`Are you sure you want to ${action} ${item.class_name}?`)) {
      return;
    }

    try {
      await api.patch(`/classes/${item.id}/${action}`);
      await fetchClasses();
    } catch (err) {
      setError(err.response?.data?.message || `Unable to ${action} class.`);
    }
  };

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Classes</h1>
          <p className="mt-1 text-sm text-slate-500">Manage classes and teacher assignments.</p>
        </div>

        <button onClick={openAdd} className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700">
          <Plus size={18} /> Add Class
        </button>
      </div>

      <div className="mb-6 flex items-center justify-between gap-4 rounded-xl border bg-white p-5">
        <div className="flex w-full max-w-md items-center gap-3 rounded-lg border px-3">
          <Search size={18} className="text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search classes..."
            className="w-full py-3 text-sm outline-none"
          />
        </div>

        <div className="flex items-center gap-2 text-sm text-slate-600">
          {classes.length} classes
          <button onClick={fetchClasses} title="Refresh" className="rounded-lg p-2 hover:bg-slate-100">
            <RefreshCw size={17} />
          </button>
        </div>
      </div>

      {error && <p className="mb-5 rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</p>}

      <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
        <table className="w-full min-w-[700px] text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-5 py-4">Class</th>
              <th className="px-5 py-4">Academic year</th>
              <th className="px-5 py-4">Teacher ID</th>
              <th className="px-5 py-4">Status</th>
              <th className="px-5 py-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr><td colSpan="5" className="p-10 text-center text-slate-500">Loading classes...</td></tr>
            ) : classes.length === 0 ? (
              <tr><td colSpan="5" className="p-10 text-center text-slate-500">No classes found.</td></tr>
            ) : classes.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50">
                <td className="px-5 py-4 font-medium text-slate-800">{item.class_name}</td>
                <td className="px-5 py-4">{item.academic_year}</td>
                <td className="px-5 py-4">{item.teacher_id || "Not assigned"}</td>
                <td className="px-5 py-4">
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${item.is_active ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"}`}>
                    {item.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(item)} title="Edit" className="rounded-lg p-2 text-blue-600 hover:bg-blue-50">
                      <Pencil size={17} />
                    </button>
                    <button onClick={() => changeStatus(item)} title={item.is_active ? "Deactivate" : "Reactivate"} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100">
                      <Power size={17} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
          <div className="my-8 w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold">{editing ? "Edit Class" : "Add New Class"}</h2>
              <button onClick={() => setShowForm(false)} className="rounded-lg p-2 hover:bg-slate-100"><X size={20} /></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium">Class name</label>
                <input
                  required
                  value={form.class_name}
                  onChange={(e) => setForm({ ...form, class_name: e.target.value })}
                  className="w-full rounded-lg border p-3 outline-none focus:border-blue-500"
                  placeholder="e.g. Senior 3 Software Development"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Academic year</label>
                <input
                  required
                  value={form.academic_year}
                  onChange={(e) => setForm({ ...form, academic_year: e.target.value })}
                  className="w-full rounded-lg border p-3 outline-none focus:border-blue-500"
                  placeholder="2026-2027"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Assign teacher</label>
                <select
                  value={form.teacher_id}
                  onChange={(e) => setForm({ ...form, teacher_id: e.target.value })}
                  className="w-full rounded-lg border p-3 outline-none focus:border-blue-500"
                >
                  <option value="">No teacher assigned</option>
                  {teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.full_name} — {teacher.employee_number}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border px-5 py-3 text-sm">Cancel</button>
                <button disabled={saving} className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white disabled:opacity-60">
                  {saving ? "Saving..." : editing ? "Update Class" : "Save Class"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}