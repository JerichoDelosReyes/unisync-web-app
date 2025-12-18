import { Routes, Route, Navigate } from 'react-router-dom'
import AuthPage from './pages/AuthPage.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/auth" replace />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/login" element={<Navigate to="/auth" replace />} />
      <Route path="/signup" element={<Navigate to="/auth" replace />} />
    </Routes>
  )
}
