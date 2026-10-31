import Teachers from "./pages/Teachers";
import Students from "./pages/Students";
import Classes from "./pages/Classes";
import Enrollments from "./pages/Enrollments";
import Attendance from "./pages/Attendance";
import Grades from "./pages/Grades";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import DashboardLayout from "./layouts/DashboardLayout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";

function ComingSoon({ title }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-8">
      <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
      <p className="mt-2 text-slate-500">
        This management section will be connected to the backend next.
      </p>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<DashboardLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              {/* <Route path="/students" element={<ComingSoon title="Students" />} /> */}
              <Route path="/students" element={<Students />} />
              {/* <Route path="/teachers" element={<ComingSoon title="Teachers" />} /> */}
              <Route path="/teachers" element={<Teachers />} />
              {/* <Route path="/classes" element={<ComingSoon title="Classes" />} />  */}
              <Route path="/classes" element={<Classes />} />
              {/* <Route path="/enrollments" element={<ComingSoon title="Enrollments" />} />
              <Route path="/attendance" element={<ComingSoon title="Attendance" />} />
              <Route path="/grades" element={<ComingSoon title="Grades" />} /> */}
              <Route path="/enrollments" element={<Enrollments />} />
              <Route path="/attendance" element={<Attendance />} />
              <Route path="/grades" element={<Grades />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;