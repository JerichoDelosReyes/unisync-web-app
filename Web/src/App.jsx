import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute, { FacultyRoute, AdminRoute, SuperAdminRoute } from './components/auth/ProtectedRoute'
import PWAUpdatePrompt from './components/ui/PWAUpdatePrompt'

// Layouts
import DashboardLayout from './layouts/DashboardLayout'

// Public Pages
import AuthPage from './pages/AuthPage.jsx'
import Unauthorized from './pages/Unauthorized'

// Protected Pages
import Dashboard from './pages/Dashboard'
import Announcements from './pages/Announcements'
import Schedule from './pages/Schedule'
import Rooms from './pages/Rooms'
import UserManagement from './pages/UserManagement'
import Moderation from './pages/Moderation'
import SystemSettings from './pages/SystemSettings'
import ScheduleArchive from './pages/ScheduleArchive'
import FacultyRequests from './pages/FacultyRequests'
import Profile from './pages/Profile'
import OrganizationsPage from './pages/OrganizationsPage'
import Logs from './pages/Logs'

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<AuthPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="/signup" element={<Navigate to="/" replace />} />
        <Route path="/unauthorized" element={<Unauthorized />} />

        {/* Protected Routes - Dashboard Layout */}
        <Route
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          {/* All authenticated users */}
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/announcements" element={<Announcements />} />
          <Route path="/schedule" element={<Schedule />} />
          <Route path="/rooms" element={<Rooms />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/organizations" element={<OrganizationsPage />} />
          
          {/* Faculty and above only */}
          <Route
            path="/users"
            element={
              <FacultyRoute>
                <UserManagement />
              </FacultyRoute>
            }
          />
          
          {/* Admin and above only */}
          <Route
            path="/moderation"
            element={
              <AdminRoute>
                <Moderation />
              </AdminRoute>
            }
          />
          <Route
            path="/faculty-requests"
            element={
              <AdminRoute>
                <FacultyRequests />
              </AdminRoute>
            }
          />
          
          {/* Super Admin only */}
          <Route
            path="/settings"
            element={
              <SuperAdminRoute>
                <SystemSettings />
              </SuperAdminRoute>
            }
          />
          <Route
            path="/archives"
            element={
              <SuperAdminRoute>
                <ScheduleArchive />
              </SuperAdminRoute>
            }
          />
          <Route
            path="/logs"
            element={
              <SuperAdminRoute>
                <Logs />
              </SuperAdminRoute>
            }
          />
        </Route>

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      
      {/* PWA Update Prompt */}
      <PWAUpdatePrompt />
    </AuthProvider>
  )
}

