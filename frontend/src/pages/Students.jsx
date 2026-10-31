import { useEffect, useState } from "react";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  Users,
  RefreshCw,
} from "lucide-react";
import api from "../services/api";

const emptyForm = {
  full_name: "",
  email: "",
  password: "",
  admission_number: "",
  date_of_birth: "",
  gender: "",
  phone: "",
  address: "",
};

export default function Students() {
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [form, setForm] = useState(emptyForm);

  // Load students from the backend
  const fetchStudents = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/students", {
        params: { search },
      });

      const data = response.data;

      setStudents(
        Array.isArray(data)
          ? data
          : data.students || data.data || []
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load students. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchStudents();
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  const openAddForm = () => {
    setEditingStudent(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEditForm = (student) => {
    setEditingStudent(student);

    setForm({
      full_name: student.full_name || "",
      email: student.email || "",
      password: "",
      admission_number: student.admission_number || "",
      date_of_birth: student.date_of_birth?.slice(0, 10) ||
        student.dob?.slice(0, 10) || "",
      gender: student.gender || "",
      phone: student.phone || "",
      address: student.address || "",
    });

    setShowForm(true);
  };

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const payload = { ...form };

      // Do not send an empty password when editing.
      if (editingStudent && !payload.password) {
        delete payload.password;
      }

      if (editingStudent) {
        delete payload.password;

        await api.put(
          `/students/${editingStudent.id}`,
          payload
        );
      } else {
        await api.post("/students", payload);
      }

      setShowForm(false);
      setForm(emptyForm);
      setEditingStudent(null);

      await fetchStudents();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to save student. Check the information and try again."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (student) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${student.full_name}? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      await api.delete(`/students/${student.id}`);
      await fetchStudents();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to delete student."
      );
    }
  };

  return (
    <div>
      {/* Page heading */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Students
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage registered students in your school.
          </p>
        </div>

        <button
          onClick={openAddForm}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
        >
          <Plus size={18} />
          Add Student
        </button>
      </div>

      {/* Search and count */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex w-full max-w-md items-center gap-3 rounded-lg border border-slate-300 px-3">
          <Search size={19} className="text-slate-400" />

          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email or admission number..."
            className="w-full py-3 text-sm outline-none"
          />
        </div>

        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Users size={18} />
          {students.length} students
          <button
            onClick={fetchStudents}
            title="Refresh students"
            className="ml-2 rounded-lg p-2 hover:bg-slate-100"
          >
            <RefreshCw size={17} />
          </button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Students table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[750px] text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-6 py-4 font-semibold">Student</th>
              <th className="px-6 py-4 font-semibold">Admission No.</th>
              <th className="px-6 py-4 font-semibold">Gender</th>
              <th className="px-6 py-4 font-semibold">Phone</th>
              <th className="px-6 py-4 font-semibold">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan="5" className="px-6 py-12 text-center text-slate-500">
                  Loading students...
                </td>
              </tr>
            ) : students.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-6 py-12 text-center text-slate-500">
                  No students found.
                </td>
              </tr>
            ) : (
              students.map((student) => (
                <tr key={student.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <p className="font-medium text-slate-800">
                      {student.full_name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {student.email}
                    </p>
                  </td>

                  <td className="px-6 py-4 text-slate-600">
                    {student.admission_number}
                  </td>

                  <td className="px-6 py-4 capitalize text-slate-600">
                    {student.gender || "—"}
                  </td>

                  <td className="px-6 py-4 text-slate-600">
                    {student.phone || "—"}
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditForm(student)}
                        title="Edit student"
                        className="rounded-lg p-2 text-blue-600 hover:bg-blue-50"
                      >
                        <Pencil size={17} />
                      </button>

                      <button
                        onClick={() => handleDelete(student)}
                        title="Delete student"
                        className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit student modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
          <div className="my-8 w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-800">
                  {editingStudent ? "Edit Student" : "Add New Student"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Enter the student's information below.
                </p>
              </div>

              <button
                onClick={() => setShowForm(false)}
                className="rounded-lg p-2 hover:bg-slate-100"
              >
                <X size={21} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  label="Full name"
                  name="full_name"
                  value={form.full_name}
                  onChange={handleChange}
                  required
                />

                <FormField
                  label="Email address"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  required
                />

                {!editingStudent && (
                  <FormField
                    label="Initial password"
                    name="password"
                    type="password"
                    value={form.password}
                    onChange={handleChange}
                    required
                  />
                )}

                <FormField
                  label="Admission number"
                  name="admission_number"
                  value={form.admission_number}
                  onChange={handleChange}
                  required
                />

                <FormField
                  label="Date of birth"
                  name="date_of_birth"
                  type="date"
                  value={form.date_of_birth}
                  onChange={handleChange}
                />

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Gender
                  </label>
                  <select
                    name="gender"
                    value={form.gender}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-slate-300 p-3 outline-none focus:border-blue-500"
                  >
                    <option value="">Select gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <FormField
                  label="Phone number"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                />

                <FormField
                  label="Address"
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                />
              </div>

              <div className="mt-7 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-lg border border-slate-300 px-5 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {saving
                    ? "Saving..."
                    : editingStudent
                      ? "Update Student"
                      : "Save Student"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function FormField({
  label,
  name,
  value,
  onChange,
  type = "text",
  required = false,
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        className="w-full rounded-lg border border-slate-300 p-3 outline-none focus:border-blue-500"
      />
    </div>
  );
}