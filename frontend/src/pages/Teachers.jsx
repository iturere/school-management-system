import { useEffect, useState } from "react";
import { Plus, Search, Pencil, UserX, UserCheck, X, RefreshCw } from "lucide-react";
import api from "../services/api";

const emptyForm = {
  full_name: "",
  email: "",
  password: "",
  employee_number: "",
  phone: "",
  qualification: "",
  hire_date: "",
};

export default function Teachers() {
  const [teachers, setTeachers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const fetchTeachers = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/teachers", { params: { search } });
      const data = response.data;
      setTeachers(Array.isArray(data) ? data : data.teachers || data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load teachers.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(fetchTeachers, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (teacher) => {
    setEditing(teacher);
    setForm({
      full_name: teacher.full_name || "",
      email: teacher.email || "",
      password: "",
      employee_number: teacher.employee_number || "",
      phone: teacher.phone || "",
      qualification: teacher.qualification || "",
      hire_date: teacher.hire_date?.slice(0, 10) || "",
    });
    setShowForm(true);
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const payload = { ...form };

      if (editing) {
        delete payload.password;
        await api.put(`/teachers/${editing.id}`, payload);
      } else {
        await api.post("/teachers", payload);
      }

      setShowForm(false);
      setEditing(null);
      setForm(emptyForm);
      await fetchTeachers();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to save teacher.");
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (teacher) => {
    const active = teacher.is_active ?? teacher.user_is_active;

    const action = active ? "deactivate" : "reactivate";
    const confirmed = window.confirm(
      `Are you sure you want to ${action} ${teacher.full_name}?`
    );

    if (!confirmed) return;

    try {
      await api.patch(`/teachers/${teacher.id}/${action}`);
      await fetchTeachers();
    } catch (err) {
      setError(err.response?.data?.message || `Unable to ${action} teacher.`);
    }
  };

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Teachers</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage your school's teaching staff.
          </p>
        </div>

        <button onClick={openAdd} className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700">
          <Plus size={18} /> Add Teacher
        </button>
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-white p-5">
        <div className="flex w-full max-w-md items-center gap-3 rounded-lg border px-3">
          <Search size={18} className="text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email or employee number..."
            className="w-full py-3 text-sm outline-none"
          />
        </div>
        <div className="flex items-center gap-3 text-sm text-slate-600">
          {teachers.length} teachers
          <button onClick={fetchTeachers} title="Refresh" className="rounded-lg p-2 hover:bg-slate-100">
            <RefreshCw size={17} />
          </button>
        </div>
      </div>

      {error && <p className="mb-5 rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</p>}

      <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
        <table className="w-full min-w-[850px] text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-5 py-4">Teacher</th>
              <th className="px-5 py-4">Employee No.</th>
              <th className="px-5 py-4">Qualification</th>
              <th className="px-5 py-4">Phone</th>
              <th className="px-5 py-4">Status</th>
              <th className="px-5 py-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr><td colSpan="6" className="p-10 text-center text-slate-500">Loading teachers...</td></tr>
            ) : teachers.length === 0 ? (
              <tr><td colSpan="6" className="p-10 text-center text-slate-500">No teachers found.</td></tr>
            ) : teachers.map((teacher) => {
              const active = teacher.is_active ?? teacher.user_is_active ?? true;
              return (
                <tr key={teacher.id} className="hover:bg-slate-50">
                  <td className="px-5 py-4">
                    <p className="font-medium text-slate-800">{teacher.full_name}</p>
                    <p className="text-xs text-slate-500">{teacher.email}</p>
                  </td>
                  <td className="px-5 py-4">{teacher.employee_number}</td>
                  <td className="px-5 py-4">{teacher.qualification || "—"}</td>
                  <td className="px-5 py-4">{teacher.phone || "—"}</td>
                  <td className="px-5 py-4">
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${active ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"}`}>
                      {active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(teacher)} title="Edit" className="rounded-lg p-2 text-blue-600 hover:bg-blue-50">
                        <Pencil size={17} />
                      </button>
                      <button onClick={() => changeStatus(teacher)} title={active ? "Deactivate" : "Reactivate"} className={`rounded-lg p-2 ${active ? "text-red-600 hover:bg-red-50" : "text-green-600 hover:bg-green-50"}`}>
                        {active ? <UserX size={17} /> : <UserCheck size={17} />}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
          <div className="my-8 w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold">{editing ? "Edit Teacher" : "Add New Teacher"}</h2>
              <button onClick={() => setShowForm(false)} className="rounded-lg p-2 hover:bg-slate-100"><X size={20} /></button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 sm:grid-cols-2">
                <TeacherField label="Full name" name="full_name" value={form.full_name} onChange={handleChange} required />
                <TeacherField label="Email" name="email" type="email" value={form.email} onChange={handleChange} required />
                {!editing && <TeacherField label="Initial password" name="password" type="password" value={form.password} onChange={handleChange} required />}
                <TeacherField label="Employee number" name="employee_number" value={form.employee_number} onChange={handleChange} required />
                <TeacherField label="Phone" name="phone" value={form.phone} onChange={handleChange} />
                <TeacherField label="Qualification" name="qualification" value={form.qualification} onChange={handleChange} />
                <TeacherField label="Hire date" name="hire_date" type="date" value={form.hire_date} onChange={handleChange} />
              </div>

              <div className="mt-7 flex justify-end gap-3">
                <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border px-5 py-3 text-sm">Cancel</button>
                <button disabled={saving} className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white disabled:opacity-60">
                  {saving ? "Saving..." : editing ? "Update Teacher" : "Save Teacher"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function TeacherField({ label, name, value, onChange, type = "text", required = false }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-700">{label}</label>
      <input
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        className="w-full rounded-lg border border-slate-300 p-3 outline-none focus:border-blue-500"
      />
    </div>
  );
}