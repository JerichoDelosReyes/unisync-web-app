import { Routes, Route, Navigate } from 'react-router-dom'
import AuthPage from './pages/AuthPage.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<AuthPage />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route path="/signup" element={<Navigate to="/" replace />} />
      <Route path="/dashboard" element={<div className="p-8 text-center"><h1 className="text-2xl font-bold">Dashboard</h1><p>Coming soon...</p></div>} />
    </Routes>
  )
}
