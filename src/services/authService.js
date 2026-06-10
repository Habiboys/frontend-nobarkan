import api from './api'
import { clearAuth, setAuth } from '../stores/authStore'

function normalizeAuthPayload(responseData) {
  const data = responseData?.data ?? responseData

  return {
    access_token: data?.access_token,
    refresh_token: data?.refresh_token,
    user: data?.user,
  }
}

export async function login(payload) {
  const response = await api.post('/auth/login', payload)
  const auth = normalizeAuthPayload(response.data)

  setAuth(auth)

  return auth
}

export async function register(payload) {
  const response = await api.post('/auth/register', payload)
  const auth = normalizeAuthPayload(response.data)

  setAuth(auth)

  return auth
}

export async function logout() {
  try {
    await api.post('/auth/logout')
  } finally {
    clearAuth()
  }
}

export async function getMe() {
  const response = await api.get('/users/me')
  return response.data?.data ?? response.data
}

export async function getWebRTCConfig() {
  const response = await api.get('/webrtc/config')
  return response.data?.data ?? response.data
}
