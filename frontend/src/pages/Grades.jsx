import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Search, X, RefreshCw } from "lucide-react";
import api from "../services/api";

const emptyForm = {
  student_id: "",
  class_id: "",
  subject: "",
  assessment_type: "exam",
  score: "",
  maximum_score: "100",
  assessment_date: new Date().toLocaleDateString("en-CA"),
};

export default function Grades() {
  const [grades, setGrades] = useState([]);
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const fetchGrades = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/grades");
      const data = response.data;
      setGrades(Array.isArray(data) ? data : data.grades || data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load grades.");
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
      console.error("Unable to load grade options:", err);
    }
  };

  useEffect(() => {
    fetchGrades();
    fetchOptions();
  }, []);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (grade) => {
    setEditing(grade);
    setForm({
      student_id: String(grade.student_id),
      class_id: String(grade.class_id),
      subject: grade.subject || "",
      assessment_type: grade.assessment_type || "exam",
      score: String(grade.score),
      maximum_score: String(grade.maximum_score),
      assessment_date: grade.assessment_date
        ? String(grade.assessment_date).slice(0, 10)
        : "",
    });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      if (editing) {
        await api.patch(`/grades/${editing.id}`, {
          score: Number(form.score),
          maximum_score: Number(form.maximum_score),
        });
      } else {
        await api.post("/grades", {
          ...form,
          student_id: Number(form.student_id),
          class_id: Number(form.class_id),
          score: Number(form.score),
          maximum_score: Number(form.maximum_score),
        });
      }

      setShowForm(false);
      setEditing(null);
      setForm(emptyForm);
      await fetchGrades();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to save grade.");
    } finally {
      setSaving(false);
    }
  };

  const deleteGrade = async (grade) => {
    if (!window.confirm("Are you sure you want to delete this grade?")) return;

    try {
      await api.delete(`/grades/${grade.id}`);
      await fetchGrades();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to delete grade.");
    }
  };

  const filtered = grades.filter((item) =>
    [
      item.student_name,
      item.full_name,
      item.admission_number,
      item.class_name,
      item.subject,
    ].some((value) => String(value || "").toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Grades</h1>
          <p className="mt-1 text-sm text-slate-500">
            Record and manage student assessment results.
          </p>
        </div>

        <button
          onClick={openAdd}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
        >
          <Plus size={18} /> Add Grade
        </button>
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-white p-5">
        <div className="flex w-full max-w-md items-center gap-2 rounded-lg border px-3">
          <Search size={18} className="text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search student, class or subject..."
            className="w-full py-3 text-sm outline-none"
          />
        </div>

        <div className="flex items-center gap-3 text-sm text-slate-600">
          {grades.length} grades
          <button onClick={fetchGrades} title="Refresh" className="rounded-lg p-2 hover:bg-slate-100">
            <RefreshCw size={17} />
          </button>
        </div>
      </div>

      {error && <p className="mb-5 rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</p>}

      <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
        <table className="w-full min-w-[850px] text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-5 py-4">Student</th>
              <th className="px-5 py-4">Class</th>
              <th className="px-5 py-4">Subject</th>
              <th className="px-5 py-4">Assessment</th>
              <th className="px-5 py-4">Score</th>
              <th className="px-5 py-4">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y">
            {loading ? (
              <tr><td colSpan="6" className="p-10 text-center">Loading grades...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan="6" className="p-10 text-center text-slate-500">No grades found.</td></tr>
            ) : filtered.map((grade) => (
              <tr key={grade.id} className="hover:bg-slate-50">
                <td className="px-5 py-4">
                  <p className="font-medium">{grade.student_name || grade.full_name || `Student #${grade.student_id}`}</p>
                  <p className="text-xs text-slate-500">{grade.admission_number || ""}</p>
                </td>
                <td className="px-5 py-4">{grade.class_name || `Class #${grade.class_id}`}</td>
                <td className="px-5 py-4">{grade.subject}</td>
                <td className="px-5 py-4 capitalize">{grade.assessment_type}</td>
                <td className="px-5 py-4 font-semibold">
                  {grade.score} / {grade.maximum_score}
                </td>
                <td className="px-5 py-4">
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(grade)} title="Edit score" className="rounded-lg p-2 text-blue-600 hover:bg-blue-50">
                      <Pencil size={17} />
                    </button>
                    <button onClick={() => deleteGrade(grade)} title="Delete grade" className="rounded-lg p-2 text-red-600 hover:bg-red-50">
                      <Trash2 size={17} />
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
          <div className="my-8 w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold">{editing ? "Edit Grade" : "Add New Grade"}</h2>
              <button onClick={() => setShowForm(false)}><X size={20} /></button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 sm:grid-cols-2">
                {!editing && (
                  <>
                    <div>
                      <label className="mb-2 block text-sm font-medium">Student</label>
                      <select required value={form.student_id} onChange={(e) => setForm({ ...form, student_id: e.target.value })} className="w-full rounded-lg border p-3">
                        <option value="">Select student</option>
                        {students.map((student) => (
                          <option key={student.id} value={student.id}>{student.full_name} — {student.admission_number}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium">Class</label>
                      <select required value={form.class_id} onChange={(e) => setForm({ ...form, class_id: e.target.value })} className="w-full rounded-lg border p-3">
                        <option value="">Select class</option>
                        {classes.map((item) => (
                          <option key={item.id} value={item.id}>{item.class_name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium">Subject</label>
                      <input required maxLength="100" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="w-full rounded-lg border p-3" placeholder="Computer Science" />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium">Assessment type</label>
                      <select value={form.assessment_type} onChange={(e) => setForm({ ...form, assessment_type: e.target.value })} className="w-full rounded-lg border p-3">
                        <option value="assignment">Assignment</option>
                        <option value="test">Test</option>
                        <option value="exam">Exam</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium">Assessment date</label>
                      <input type="date" value={form.assessment_date} onChange={(e) => setForm({ ...form, assessment_date: e.target.value })} className="w-full rounded-lg border p-3" />
                    </div>
                  </>
                )}

                <div>
                  <label className="mb-2 block text-sm font-medium">Score</label>
                  <input required type="number" min="0" step="0.01" value={form.score} onChange={(e) => setForm({ ...form, score: e.target.value })} className="w-full rounded-lg border p-3" />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">Maximum score</label>
                  <input required type="number" min="0.01" step="0.01" value={form.maximum_score} onChange={(e) => setForm({ ...form, maximum_score: e.target.value })} className="w-full rounded-lg border p-3" />
                </div>
              </div>

              <div className="mt-7 flex justify-end gap-3">
                <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border px-5 py-3">Cancel</button>
                <button disabled={saving} className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white disabled:opacity-60">
                  {saving ? "Saving..." : editing ? "Update Grade" : "Save Grade"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}