import { API_BASE_URL } from './api'

function getWebSocketURL() {
  const apiURL = new URL(API_BASE_URL)
  const protocol = apiURL.protocol === 'https:' ? 'wss:' : 'ws:'
  const pathname = apiURL.pathname.replace(/\/+/g, '/').replace(/\/$/, '')
  return `${protocol}//${apiURL.host}${pathname}/ws`
}

class RoomSocket {
  constructor() {
    this.ws = null
    this.listeners = new Map()
    this.token = null
    this.reconnectTimer = null
    this.reconnectAttempts = 0
    this.intentionalClose = false
  }

  connect(token) {
    this.token = token
    this.intentionalClose = false
    this.clearReconnectTimer()
    this.closeCurrentSocket()
    this.openSocket()
    return this.ws
  }

  openSocket() {
    if (!this.token) return null

    const wsURL = `${getWebSocketURL()}?token=${encodeURIComponent(this.token)}`
    const socket = new WebSocket(wsURL)
    this.ws = socket

    socket.onopen = () => {
      if (this.ws !== socket) return
      this.reconnectAttempts = 0
      this.emit('socket:open', {})
    }

    socket.onclose = (event) => {
      if (this.ws !== socket) return
      this.ws = null
      this.emit('socket:close', event)
      if (!this.intentionalClose) {
        this.scheduleReconnect()
      }
    }

    socket.onerror = (event) => this.emit('socket:error', event)
    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)
        if (message?.type) {
          this.emit(message.type, message.payload ?? {})
        }
      } catch {
        // Abaikan pesan invalid dari server.
      }
    }

    return socket
  }

  scheduleReconnect() {
    this.clearReconnectTimer()
    const delay = Math.min(10000, 1000 * 2 ** this.reconnectAttempts)
    this.reconnectAttempts += 1
    this.reconnectTimer = setTimeout(() => {
      if (!this.intentionalClose) {
        this.openSocket()
      }
    }, delay)
  }

  clearReconnectTimer() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }

  closeCurrentSocket() {
    if (!this.ws) return
    const socket = this.ws
    this.ws = null
    if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
      socket.close()
    }
  }

  on(type, callback) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set())
    }
    this.listeners.get(type).add(callback)
  }

  off(type, callback) {
    this.listeners.get(type)?.delete(callback)
  }

  emit(type, payload) {
    this.listeners.get(type)?.forEach((callback) => callback(payload))
  }

  send(type, payload = {}) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return false
    }

    this.ws.send(JSON.stringify({ type, payload }))
    return true
  }

  disconnect() {
    this.intentionalClose = true
    this.token = null
    this.clearReconnectTimer()
    this.closeCurrentSocket()
  }
}

export default new RoomSocket()
