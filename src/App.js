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
        <div className="App">
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

            {/* Redirect old routes to new unified dashboard */}
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
              path="/subadmin-dashboard-file-upload"
              element={<Navigate to="/dashboard" replace />}
            />
            <Route
              path="/subadmin-dashboard-records-view"
              element={<Navigate to="/dashboard" replace />}
            />

            {/* Default redirect */}
            <Route path="/" element={<Navigate to="/login" />} />
          </Routes>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
