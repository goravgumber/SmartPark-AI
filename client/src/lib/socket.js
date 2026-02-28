import { io } from 'socket.io-client'

const socketUrl = import.meta.env.VITE_WS_URL || ''

export const socket = io(socketUrl, {
  autoConnect: false,
  auth: {
    token: ''
  }
})

export function syncSocketAuth() {
  const token = localStorage.getItem('smartpark_token') || ''
  socket.auth = { token }
}

export function connectSocket() {
  syncSocketAuth()
  if (!socket.connected) {
    socket.connect()
  }
}

export function disconnectSocket() {
  if (socket.connected) {
    socket.disconnect()
  }
}

export function joinFacility(facilityId) {
  if (!facilityId) return
  connectSocket()
  socket.emit('join:facility', facilityId)
}
