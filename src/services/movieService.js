import api from './api'

export async function listMovies(params = {}) {
  const response = await api.get('/movies', { params })
  return {
    data: response.data?.data ?? [],
    meta: response.data?.meta ?? {},
  }
}

export async function getMovie(id) {
  const response = await api.get(`/movies/${id}`)
  return response.data?.data ?? response.data
}

export async function createGDriveMovie(payload) {
  const response = await api.post('/movies', payload)
  return response.data?.data ?? response.data
}

export async function deleteMovie(id) {
  const response = await api.delete(`/movies/${id}`)
  return response.data
}

export async function updateMovie(id, payload) {
  const response = await api.put(`/movies/${id}`, payload)
  return response.data?.data ?? response.data
}

export async function getTranscodeStatus(id) {
  const response = await api.get(`/movies/${id}/transcode-status`)
  return response.data?.data ?? response.data
}
