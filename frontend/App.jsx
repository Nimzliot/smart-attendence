import { Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "react-hot-toast";

import AppLayout from "./layouts/AppLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import AttendanceLogsPage from "./pages/AttendanceLogsPage";
import StudentManagementPage from "./pages/StudentManagementPage";
import FaceRegistrationPage from "./pages/FaceRegistrationPage";
import StudentFacesPage from "./pages/StudentFacesPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import DeviceStatusPage from "./pages/DeviceStatusPage";
import SettingsPage from "./pages/SettingsPage";
import ProfilePage from "./pages/ProfilePage";

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="attendance" element={<AttendanceLogsPage />} />
          <Route path="students" element={<StudentManagementPage />} />
          <Route path="face-registration" element={<FaceRegistrationPage />} />
          <Route path="student-faces" element={<StudentFacesPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="devices" element={<DeviceStatusPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>
      </Routes>
      <Toaster position="top-right" />
    </>
  );
}
