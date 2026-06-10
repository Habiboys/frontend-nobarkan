const AUTH_STORAGE_KEY = 'nobarkan_auth'

export function getAuth() {
  const raw = localStorage.getItem(AUTH_STORAGE_KEY)

  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw)
  } catch {
    clearAuth()
    return null
  }
}

export function setAuth(auth) {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth))
}

export function clearAuth() {
  localStorage.removeItem(AUTH_STORAGE_KEY)
}

export function getAccessToken() {
  return getAuth()?.access_token ?? null
}

export function getRefreshToken() {
  return getAuth()?.refresh_token ?? null
}

export function getUser() {
  return getAuth()?.user ?? null
}

export function isAuthenticated() {
  return Boolean(getAccessToken())
}
