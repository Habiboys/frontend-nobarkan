import api from './api'

const CACHE_KEY = 'nobarkan_extractors'
const CACHE_TTL = 60 * 60 * 1000 // 1 hour

export async function listExtractors() {
  // Check localStorage cache first
  try {
    const cached = localStorage.getItem(CACHE_KEY)
    if (cached) {
      const parsed = JSON.parse(cached)
      if (Date.now() - parsed.ts < CACHE_TTL) {
        return {
          count: parsed.count,
          extractors: parsed.extractors,
        }
      }
    }
  } catch {
    // ignore
  }

  const response = await api.get('/extractors')
  const data = {
    count: response.data?.data?.count ?? 0,
    extractors: response.data?.data?.extractors ?? [],
  }

  // Cache in localStorage
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ ts: Date.now(), ...data }),
    )
  } catch {
    // ignore (quota exceeded)
  }

  return data
}
