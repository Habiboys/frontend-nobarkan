import api from './api'

export async function updateProfile(payload) {
  const response = await api.put('/users/me', payload)
  return response.data?.data ?? response.data
}

export async function changePassword(payload) {
  const response = await api.put('/users/me/password', payload)
  return response.data
}
