import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import AdminRoute     from './components/AdminRoute'

import LoginPage          from './pages/LoginPage'
import BoardPage          from './pages/BoardPage'
import HistoryPage        from './pages/HistoryPage'
import EnvironmentsPage   from './pages/admin/EnvironmentsPage'
import UsersPage          from './pages/admin/UsersPage'
import LogsPage           from './pages/admin/LogsPage'

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route path="/" element={<ProtectedRoute><BoardPage /></ProtectedRoute>} />
        <Route path="/environments/:id/history" element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />

        <Route path="/admin/environments" element={<AdminRoute><EnvironmentsPage /></AdminRoute>} />
        <Route path="/admin/users"        element={<AdminRoute><UsersPage /></AdminRoute>} />
        <Route path="/admin/logs"         element={<AdminRoute><LogsPage /></AdminRoute>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}
