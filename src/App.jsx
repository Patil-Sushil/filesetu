import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="min-h-screen flex flex-col bg-gray-50">
          <Routes>
            <Route path="/login" element={<Login />} />
            {/* Unified Dashboard for both Admin and SubAdmin */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            {/* Legacy route redirects */}
            <Route
              path="/subadmin-dashboard"
              element={<Navigate to="/dashboard" replace />}
            />
            <Route
              path="/dashboard-file-upload"
              element={<Navigate to="/dashboard" replace />}
            />
            <Route
              path="/dashboard-records-view"
              element={<Navigate to="/dashboard" replace />}
            />
            <Route
              path="/dashboard-user-management"
              element={<Navigate to="/dashboard" replace />}
            />
            <Route
              path="/dashboard-logbook"
              element={<Navigate to="/dashboard" replace />}
            />
            <Route
              path="/dashboard-dairy"
              element={<Navigate to="/dashboard" replace />}
            />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
