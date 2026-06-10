import api from './api'

export async function listRooms(params = {}) {
  const response = await api.get('/rooms', { params })
  return {
    data: response.data?.data ?? [],
    meta: response.data?.meta ?? {},
  }
}

export async function listMyRooms() {
  const response = await api.get('/rooms/my')
  return response.data?.data ?? []
}

export async function getRoom(code) {
  const response = await api.get(`/rooms/${code}`)
  return response.data?.data ?? response.data
}

export async function createRoom(payload) {
  const response = await api.post('/rooms', payload)
  return response.data?.data ?? response.data
}

export async function joinRoom(code, payload = {}) {
  const response = await api.post(`/rooms/${code}/join`, payload)
  return response.data?.data ?? response.data
}

export async function leaveRoom(code) {
  const response = await api.post(`/rooms/${code}/leave`)
  return response.data
}

export async function closeRoom(code) {
  const response = await api.post(`/rooms/${code}/close`)
  return response.data
}

export async function deleteRoom(code) {
  const response = await api.delete(`/rooms/${code}`)
  return response.data
}

export async function updateRoom(code, payload) {
  const response = await api.put(`/rooms/${code}`, payload)
  return response.data?.data ?? response.data
}

export async function listRoomChats(code, params = {}) {
  const response = await api.get(`/rooms/${code}/chats`, { params })
  return {
    data: response.data?.data ?? [],
    meta: response.data?.meta ?? {},
  }
}
