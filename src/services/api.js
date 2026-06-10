import axios from 'axios'
import { clearAuth, getAccessToken } from '../stores/authStore'

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/v1'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const token = getAccessToken()

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearAuth()
    }

    return Promise.reject(error)
  },
)

export function getApiErrorMessage(error, fallback = 'Terjadi kesalahan. Silakan coba lagi.') {
  const errBody = error?.response?.data

  if (errBody?.error && typeof errBody.error === 'object') {
    return errBody.error.message || fallback
  }

  if (errBody?.error && typeof errBody.error === 'string') {
    return errBody.error
  }

  return errBody?.message || error?.message || fallback
}

export default api
