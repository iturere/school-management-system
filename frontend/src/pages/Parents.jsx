
import { useCallback, useEffect, useState } from "react";
import {
  Users,
  UserPlus,
  RefreshCw,
  Search,
  Eye,
  Pencil,
  Trash2,
  X,
  Link as LinkIcon,
} from "lucide-react";

import api from "../services/api";

const emptyForm = {
  full_name: "",
  email: "",
  password: "",
  phone: "",
  address: "",
  occupation: "",
  student_ids: [],
  relationship: "parent",
};

export default function Parents() {
  const [parents, setParents] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingParent, setEditingParent] = useState(null);
  const [selectedParent, setSelectedParent] = useState(null);
  const [children, setChildren] = useState([]);

  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  // ==========================================
  // LOAD PARENTS
  // ==========================================

  const fetchParents = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/parents");
      setParents(response.data.parents || []);
    } catch (err) {
      setError(
        err.response?.data?.message || "Could not load parents."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // ==========================================
  // LOAD STUDENTS
  // ==========================================

  const fetchStudents = useCallback(async () => {
    setStudentsLoading(true);

    try {
      const response = await api.get("/students");

      const data = response.data;
      const list =
        data.students ||
        data.data ||
        data.rows ||
        [];

      setStudents(
        Array.isArray(list)
          ? list.map((student) => ({
              ...student,
              id: Number(student.id),
            }))
          : []
      );
    } catch (err) {
      console.error("Could not load students:", err);
      setError(
        err.response?.data?.message ||
          "Could not load students. Check the Students API."
      );
    } finally {
      setStudentsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchParents();
    fetchStudents();
  }, [fetchParents, fetchStudents]);

  // ==========================================
  // OPEN CREATE FORM
  // ==========================================

  const openCreateForm = () => {
    setEditingParent(null);
    setForm({ ...emptyForm });
    setError("");
    setSuccess("");
    setShowForm(true);
  };

  // ==========================================
  // OPEN EDIT FORM
  // ==========================================

  const openEditForm = async (parent) => {
    setEditingParent(parent);
    setForm({
      full_name: parent.full_name || "",
      email: parent.email || "",
      password: "",
      phone: parent.phone || "",
      address: parent.address || "",
      occupation: parent.occupation || "",
      student_ids: [],
      relationship: "parent",
    });

    setError("");
    setSuccess("");
    setShowForm(true);

    // Load students again when opening the form.
    await fetchStudents();
  };

  // ==========================================
  // HANDLE INPUT CHANGES
  // ==========================================

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // ==========================================
  // SELECT / UNSELECT STUDENTS
  // ==========================================

  const handleStudentSelection = (studentId) => {
    const id = Number(studentId);

    setForm((previous) => {
      const exists = previous.student_ids.includes(id);

      return {
        ...previous,
        student_ids: exists
          ? previous.student_ids.filter(
              (selectedId) => selectedId !== id
            )
          : [...previous.student_ids, id],
      };
    });
  };

  // ==========================================
  // SAVE PARENT
  // ==========================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      if (form.student_ids.length === 0) {
        setError("Please select at least one student.");
        return;
      }

      if (editingParent) {
        // Update existing parent information.
        await api.put(`/parents/${editingParent.id}`, {
          full_name: form.full_name,
          email: form.email,
          phone: form.phone,
          address: form.address,
          occupation: form.occupation,
        });

        // Link selected students to existing parent.
        await api.post(
          `/parents/${editingParent.id}/children`,
          {
            student_ids: form.student_ids,
            relationship: form.relationship,
          }
        );

        setSuccess("Parent updated and students linked successfully.");
      } else {
        if (!form.password) {
          setError("Please enter a password for the parent.");
          return;
        }

        const childrenToCreate = form.student_ids.map(
          (studentId) => ({
            student_id: studentId,
            relationship: form.relationship,
          })
        );

        await api.post("/parents", {
          full_name: form.full_name,
          email: form.email,
          password: form.password,
          phone: form.phone,
          address: form.address,
          occupation: form.occupation,
          children: childrenToCreate,
        });

        setSuccess("Parent account created successfully.");
      }

      setShowForm(false);
      setEditingParent(null);
      setForm({ ...emptyForm });

      await fetchParents();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not save parent information."
      );
    } finally {
      setSaving(false);
    }
  };

  // ==========================================
  // VIEW LINKED CHILDREN
  // ==========================================

  const viewChildren = async (parent) => {
    setSelectedParent(parent);
    setChildren([]);
    setError("");

    try {
      const response = await api.get(
        `/parents/${parent.id}/children`
      );

      setChildren(response.data.children || []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not load linked children."
      );
      setSelectedParent(null);
    }
  };

  // ==========================================
  // DELETE PARENT
  // ==========================================

  const deleteParent = async (parent) => {
    const confirmed = window.confirm(
      `Delete parent account for ${parent.full_name}? This action cannot be undone.`
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");

    try {
      await api.delete(`/parents/${parent.id}`);

      setSuccess("Parent deleted successfully.");
      await fetchParents();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not delete parent."
      );
    }
  };

  // ==========================================
  // SEARCH
  // ==========================================

  const filteredParents = parents.filter((parent) => {
    const searchText = search.toLowerCase();

    return (
      parent.full_name?.toLowerCase().includes(searchText) ||
      parent.email?.toLowerCase().includes(searchText) ||
      parent.phone?.toLowerCase().includes(searchText)
    );
  });

  // ==========================================
  // PAGE
  // ==========================================

  return (
    <div className="space-y-6">

      {/* HEADER */}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-blue-600">
            SCHOOL MANAGEMENT
          </p>

          <h1 className="mt-2 text-3xl font-bold text-gray-800">
            Parent Management
          </h1>

          <p className="mt-2 text-gray-500">
            Register parents and manage their student relationships.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={fetchParents}
            className="flex items-center gap-2 rounded-lg border bg-white px-4 py-2 text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw size={17} />
            Refresh
          </button>

          <button
            onClick={openCreateForm}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            <UserPlus size={18} />
            Add Parent
          </button>
        </div>
      </div>

      {/* ERROR */}

      {error && (
        <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          <p>{error}</p>

          <button onClick={() => setError("")}>
            <X size={18} />
          </button>
        </div>
      )}

      {/* SUCCESS */}

      {success && (
        <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 p-4 text-green-700">
          <p>{success}</p>

          <button onClick={() => setSuccess("")}>
            <X size={18} />
          </button>
        </div>
      )}

      {/* SUMMARY */}

      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="rounded-xl bg-blue-100 p-3 text-blue-600">
            <Users size={25} />
          </div>

          <div>
            <p className="text-sm text-gray-500">
              Registered Parents
            </p>

            <h2 className="text-3xl font-bold text-gray-800">
              {parents.length}
            </h2>
          </div>
        </div>
      </div>

      {/* SEARCH */}

      <div className="relative max-w-md">
        <Search
          size={19}
          className="absolute left-3 top-3 text-gray-400"
        />

        <input
          type="text"
          placeholder="Search parents..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border bg-white py-2.5 pl-10 pr-4 outline-none focus:border-blue-500"
        />
      </div>

      {/* PARENT TABLE */}

      <section className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <div className="border-b p-5">
          <h2 className="font-semibold text-gray-800">
            Registered Parents
          </h2>
        </div>

        {loading ? (
          <p className="p-6 text-gray-500">
            Loading parents...
          </p>
        ) : filteredParents.length === 0 ? (
          <p className="p-6 text-gray-500">
            No parents found.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="p-4">Parent</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">Phone</th>
                  <th className="p-4">Children</th>
                  <th className="p-4">Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredParents.map((parent) => (
                  <tr
                    key={parent.id}
                    className="border-t hover:bg-gray-50"
                  >
                    <td className="p-4 font-medium text-gray-800">
                      {parent.full_name}
                    </td>

                    <td className="p-4 text-gray-600">
                      {parent.email}
                    </td>

                    <td className="p-4 text-gray-600">
                      {parent.phone || "—"}
                    </td>

                    <td className="p-4">
                      <span
                        className={
                          Number(parent.children_count) > 0
                            ? "font-semibold text-green-600"
                            : "font-semibold text-red-500"
                        }
                      >
                        {parent.children_count ?? 0}
                      </span>
                    </td>

                    <td className="p-4">
                      <div className="flex gap-2">

                        <button
                          onClick={() => viewChildren(parent)}
                          title="View children"
                          className="rounded-lg bg-blue-50 p-2 text-blue-600 hover:bg-blue-100"
                        >
                          <Eye size={17} />
                        </button>

                        <button
                          onClick={() => openEditForm(parent)}
                          title="Edit parent and link students"
                          className="rounded-lg bg-green-50 p-2 text-green-600 hover:bg-green-100"
                        >
                          <LinkIcon size={17} />
                        </button>

                        <button
                          onClick={() => openEditForm(parent)}
                          title="Edit parent"
                          className="rounded-lg bg-amber-50 p-2 text-amber-600 hover:bg-amber-100"
                        >
                          <Pencil size={17} />
                        </button>

                        <button
                          onClick={() => deleteParent(parent)}
                          title="Delete parent"
                          className="rounded-lg bg-red-50 p-2 text-red-600 hover:bg-red-100"
                        >
                          <Trash2 size={17} />
                        </button>

                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* CREATE / EDIT MODAL */}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
          <div className="my-8 w-full max-w-2xl rounded-xl bg-white shadow-xl">

            <div className="flex items-center justify-between border-b p-5">
              <div>
                <h2 className="text-xl font-bold text-gray-800">
                  {editingParent
                    ? "Edit Parent / Link Students"
                    : "Register Parent"}
                </h2>

                {editingParent && (
                  <p className="mt-1 text-sm text-gray-500">
                    Select additional students to link to this parent.
                  </p>
                )}
              </div>

              <button
                onClick={() => setShowForm(false)}
                className="rounded-lg p-2 hover:bg-gray-100"
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-4 p-5"
            >

              {/* PARENT INFORMATION */}

              <div className="grid gap-4 sm:grid-cols-2">

                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Full Name
                  </label>

                  <input
                    required
                    name="full_name"
                    value={form.full_name}
                    onChange={handleChange}
                    className="w-full rounded-lg border p-3"
                    placeholder="Parent's full name"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Email
                  </label>

                  <input
                    required
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    className="w-full rounded-lg border p-3"
                    placeholder="parent@example.com"
                  />
                </div>

                {!editingParent && (
                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Initial Password
                    </label>

                    <input
                      required
                      type="password"
                      name="password"
                      minLength={8}
                      value={form.password}
                      onChange={handleChange}
                      className="w-full rounded-lg border p-3"
                      placeholder="At least 8 characters"
                    />
                  </div>
                )}

                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Phone
                  </label>

                  <input
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    className="w-full rounded-lg border p-3"
                    placeholder="Phone number"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Occupation
                  </label>

                  <input
                    name="occupation"
                    value={form.occupation}
                    onChange={handleChange}
                    className="w-full rounded-lg border p-3"
                    placeholder="Occupation"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Address
                  </label>

                  <input
                    name="address"
                    value={form.address}
                    onChange={handleChange}
                    className="w-full rounded-lg border p-3"
                    placeholder="Address"
                  />
                </div>
              </div>

              {/* RELATIONSHIP */}

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Relationship to Student
                </label>

                <select
                  name="relationship"
                  value={form.relationship}
                  onChange={handleChange}
                  className="w-full rounded-lg border bg-white p-3"
                >
                  <option value="parent">Parent</option>
                  <option value="father">Father</option>
                  <option value="mother">Mother</option>
                  <option value="guardian">Guardian</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* STUDENT SELECTION */}

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="block text-sm font-medium">
                    {editingParent
                      ? "Link Additional Students"
                      : "Link Students"}
                  </label>

                  <span className="text-xs text-blue-600">
                    {form.student_ids.length} selected
                  </span>
                </div>

                <div className="max-h-56 space-y-2 overflow-y-auto rounded-lg border p-3">

                  {studentsLoading ? (
                    <p className="text-sm text-gray-500">
                      Loading students...
                    </p>
                  ) : students.length === 0 ? (
                    <p className="text-sm text-gray-500">
                      No students available. Register students first.
                    </p>
                  ) : (
                    students.map((student) => {
                      const studentId = Number(student.id);

                      return (
                        <label
                          key={student.id}
                          className="flex cursor-pointer items-center gap-3 rounded-lg p-2 hover:bg-gray-50"
                        >
                          <input
                            type="checkbox"
                            checked={form.student_ids.includes(studentId)}
                            onChange={() =>
                              handleStudentSelection(studentId)
                            }
                          />

                          <span className="text-sm text-gray-700">
                            {student.full_name ||
                              student.name ||
                              `Student #${student.id}`}

                            {student.admission_number
                              ? ` (${student.admission_number})`
                              : ""}
                          </span>
                        </label>
                      );
                    })
                  )}

                </div>

                <p className="mt-2 text-xs text-gray-500">
                  {editingParent
                    ? "Only select students that are not already linked to this parent. Existing links will remain."
                    : "Select the students belonging to this parent."}
                </p>
              </div>

              {/* BUTTONS */}

              <div className="flex justify-end gap-3 border-t pt-4">

                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-lg border px-4 py-2 text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving || studentsLoading}
                  className="rounded-lg bg-blue-600 px-5 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
                    : editingParent
                    ? "Update and Link Students"
                    : "Create Parent"}
                </button>

              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW LINKED CHILDREN MODAL */}

      {selectedParent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">

            <div className="flex items-center justify-between border-b p-5">
              <div>
                <h2 className="text-xl font-bold text-gray-800">
                  Linked Children
                </h2>

                <p className="text-sm text-gray-500">
                  {selectedParent.full_name}
                </p>
              </div>

              <button
                onClick={() => setSelectedParent(null)}
                className="rounded-lg p-2 hover:bg-gray-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3 p-5">

              {children.length === 0 ? (
                <p className="text-gray-500">
                  No linked children found.
                </p>
              ) : (
                children.map((child) => (
                  <div
                    key={child.student_id}
                    className="rounded-lg border p-4"
                  >
                    <p className="font-semibold text-gray-800">
                      {child.full_name}
                    </p>

                    <p className="mt-1 text-sm text-gray-500">
                      Admission number:{" "}
                      {child.admission_number || "N/A"}
                    </p>

                    <p className="text-sm text-gray-500">
                      Relationship: {child.relationship || "N/A"}
                    </p>
                  </div>
                ))
              )}

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
