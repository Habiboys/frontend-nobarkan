import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { isAuthenticated } from '../stores/authStore'

export default function ProtectedRoute() {
  const location = useLocation()

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <Outlet />
}
