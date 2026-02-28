import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './store/auth'
import LoginPage from './pages/LoginPage'
import AppShell from './components/layout/AppShell'
import MapOverviewPage from './pages/MapOverviewPage'
import AnalyticsPage from './pages/AnalyticsPage'
import EnvironmentPage from './pages/EnvironmentPage'

function ProtectedRoute() {
  const token = localStorage.getItem('smartpark_token')
  const { loading } = useAuth()

  if (!token) {
    return <Navigate to="/login" replace />
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-dark-base">
        <div className="glass-card px-6 py-4 font-mono text-brand-cyan">Verifying command token...</div>
      </div>
    )
  }

  return <Outlet />
}

function HomeRedirect() {
  const token = localStorage.getItem('smartpark_token')
  return <Navigate to={token ? '/dashboard/map' : '/login'} replace />
}

function PlaceholderPage({ title }) {
  return (
    <div className="panel-frame flex min-h-[72vh] items-center justify-center">
      <h2 className="page-title">{title}</h2>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<HomeRedirect />} />
        <Route path="/login" element={<LoginPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<AppShell />}>
            <Route index element={<Navigate to="map" replace />} />
            <Route path="map" element={<MapOverviewPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="environment" element={<EnvironmentPage />} />
            <Route path="reservations" element={<PlaceholderPage title="Reservations" />} />
            <Route path="revenue" element={<PlaceholderPage title="Revenue" />} />
            <Route path="alerts" element={<PlaceholderPage title="Alerts" />} />
            <Route path="ai" element={<PlaceholderPage title="AI Predictions" />} />
            <Route path="admin" element={<PlaceholderPage title="Admin Panel" />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}
