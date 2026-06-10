import { API_BASE_URL } from './api'

function getWebSocketURL() {
  const apiURL = new URL(API_BASE_URL)
  const protocol = apiURL.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${apiURL.host}${apiURL.pathname.replace(/\/$/, '')}/ws`
}

class RoomSocket {
  constructor() {
    this.ws = null
    this.listeners = new Map()
  }

  connect(token) {
    this.disconnect()

    const wsURL = `${getWebSocketURL()}?token=${encodeURIComponent(token)}`
    this.ws = new WebSocket(wsURL)

    this.ws.onopen = () => this.emit('socket:open', {})
    this.ws.onclose = (event) => this.emit('socket:close', event)
    this.ws.onerror = (event) => this.emit('socket:error', event)
    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)
        if (message?.type) {
          this.emit(message.type, message.payload ?? {})
        }
      } catch {
        // Abaikan pesan invalid dari server.
      }
    }

    return this.ws
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
    if (this.ws) {
      const socket = this.ws
      this.ws = null
      if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
        socket.close()
      }
    }
  }
}

export default new RoomSocket()
