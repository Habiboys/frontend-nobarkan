import { Navigate, Outlet } from 'react-router-dom'
import { isAuthenticated } from '../stores/authStore'

export default function PublicRoute() {
  if (isAuthenticated()) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}
