import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { MainLayout } from './components/layout';

// Pages
import { Login, Register, VerifyEmail } from './pages/auth';
import { StudentDashboard, FacultyDashboard, GuardDashboard, AdminDashboard } from './pages/dashboard';
import { Announcements } from './pages/announcements';
import { Facilities } from './pages/facilities';
import { Organizations } from './pages/organizations';
import { Assistant } from './pages/assistant';
import { Schedule } from './pages/schedule';
import { EmergencyDirectory, BuildingDirectory } from './pages/directory';
import { ReportIssue } from './pages/report';
import { SeedDatabase, AdminSetup } from './pages/admin';

// Styles
import './styles/theme.css';
import './styles/components.css';
import './styles/layouts.css';

// Protected Route Component - requires both authentication AND email verification
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, emailVerified, loading } = useAuth();
  
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100vh' 
      }}>
        <div className="loader loader-lg" />
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  // Redirect to verify email if not verified
  if (!emailVerified) {
    return <Navigate to="/verify-email" replace />;
  }
  
  return children;
};

// Admin Only Route Component
const AdminRoute = ({ children }) => {
  const { userProfile } = useAuth();
  
  if (userProfile?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
};

// Dashboard Router - redirects based on role
const DashboardRouter = () => {
  const { userProfile } = useAuth();
  
  switch (userProfile?.role) {
    case 'admin':
      return <AdminDashboard />;
    case 'faculty':
      return <FacultyDashboard />;
    case 'guard':
      return <GuardDashboard />;
    default:
      return <StudentDashboard />;
  }
};

function AppContent() {
  const { isAuthenticated, emailVerified } = useAuth();

  return (
    <Routes>
      {/* Public Routes */}
      <Route 
        path="/login" 
        element={
          isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />
        } 
      />
      <Route 
        path="/register" 
        element={
          isAuthenticated ? <Navigate to="/dashboard" replace /> : <Register />
        } 
      />
      
      {/* Email Verification Route */}
      <Route 
        path="/verify-email" 
        element={
          !isAuthenticated ? <Navigate to="/login" replace /> : 
          emailVerified ? <Navigate to="/dashboard" replace /> : <VerifyEmail />
        } 
      />
      
      {/* Protected Routes */}
      <Route 
        path="/" 
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardRouter />} />
        <Route path="announcements" element={<Announcements />} />
        <Route path="facilities" element={<Facilities />} />
        <Route path="organizations" element={<Organizations />} />
        <Route path="assistant" element={<Assistant />} />
        <Route path="schedule" element={<Schedule />} />
        <Route path="emergency" element={<EmergencyDirectory />} />
        <Route path="directory" element={<BuildingDirectory />} />
        <Route path="report" element={<ReportIssue />} />
        <Route path="admin-setup" element={<AdminSetup />} />
        
        {/* Faculty Routes */}
        <Route path="booking" element={<Facilities />} />
        <Route path="my-bookings" element={<Schedule />} />
        
        {/* Guard Routes */}
        <Route path="dispatch" element={<GuardDashboard />} />
        <Route path="request-history" element={<Schedule />} />
        
        {/* Admin Routes - Protected */}
        <Route path="analytics" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path="moderation" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path="users" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path="settings" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path="seed-database" element={<AdminRoute><SeedDatabase /></AdminRoute>} />
      </Route>
      
      {/* Catch all */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;
