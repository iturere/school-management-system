
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
} from "react-router-dom";

import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import DashboardLayout from "./layouts/DashboardLayout";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Students from "./pages/Students";
import Teachers from "./pages/Teachers";
import Classes from "./pages/Classes";
import Enrollments from "./pages/Enrollments";
import Attendance from "./pages/Attendance";
import Grades from "./pages/Grades";
import Parents from "./pages/Parents";

// Only administrators can access this section.
function AdminRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="p-6">Checking permissions...</div>;
  }

  if (user?.role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
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

              <Route path="/students" element={<Students />} />
              <Route path="/teachers" element={<Teachers />} />
              <Route path="/classes" element={<Classes />} />
              <Route path="/enrollments" element={<Enrollments />} />
              <Route path="/attendance" element={<Attendance />} />
              <Route path="/grades" element={<Grades />} />

              {/* Administrator-only section */}
              <Route element={<AdminRoute />}>
                <Route path="/parents" element={<Parents />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
