import { io } from 'socket.io-client'

const socketUrl = import.meta.env.VITE_WS_URL || ''

export const socket = io(socketUrl, {
  autoConnect: true,
  auth: {
    token: localStorage.getItem('smartpark_token') || ''
  }
})

export function joinFacility(facilityId) {
  if (!facilityId) return
  socket.emit('join:facility', facilityId)
}
