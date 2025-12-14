import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { MainLayout } from './components/layout';
import { FloatingChatbot } from './components/common';

// Pages
import { Login } from './pages/auth';
import { StudentDashboard, FacultyDashboard, GuardDashboard, AdminDashboard } from './pages/dashboard';
import { Announcements } from './pages/announcements';
import { Facilities } from './pages/facilities';
import { Organizations } from './pages/organizations';
import { Assistant } from './pages/assistant';
import { Schedule } from './pages/schedule';
import { EmergencyDirectory, BuildingDirectory } from './pages/directory';
import { ReportIssue } from './pages/report';

// Styles
import './styles/theme.css';
import './styles/components.css';
import './styles/layouts.css';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
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
  
  return children;
};

// Dashboard Router - redirects based on role
const DashboardRouter = () => {
  const { user } = useAuth();
  
  switch (user?.role) {
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
  const { isAuthenticated } = useAuth();

  return (
    <>
      <Routes>
        {/* Public Routes */}
        <Route 
          path="/login" 
          element={
            isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />
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
          
          {/* Faculty Routes */}
          <Route path="booking" element={<Facilities />} />
          <Route path="my-bookings" element={<Schedule />} />
          
          {/* Guard Routes */}
          <Route path="dispatch" element={<GuardDashboard />} />
        <Route path="request-history" element={<Schedule />} />
        
        {/* Admin Routes */}
        <Route path="analytics" element={<AdminDashboard />} />
        <Route path="moderation" element={<AdminDashboard />} />
        <Route path="users" element={<AdminDashboard />} />
        <Route path="settings" element={<AdminDashboard />} />
      </Route>
      
      {/* Catch all - redirect to login if not authenticated */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
    
    {/* Floating Chatbot - visible when authenticated */}
    {isAuthenticated && <FloatingChatbot />}
    </>
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
