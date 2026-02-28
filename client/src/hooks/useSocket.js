import { useEffect, useState } from 'react'
import { joinFacility, socket } from '../lib/socket'

export default function useSocket(facilityId) {
  const [isConnected, setIsConnected] = useState(socket.connected)
  const [lastEvent, setLastEvent] = useState(null)

  useEffect(() => {
    function onConnect() {
      setIsConnected(true)
      if (facilityId) joinFacility(facilityId)
    }

    function onDisconnect() {
      setIsConnected(false)
    }

    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)

    if (facilityId && socket.connected) {
      joinFacility(facilityId)
    }

    return () => {
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
    }
  }, [facilityId])

  useEffect(() => {
    function onSlotUpdated(event) {
      setLastEvent({ type: 'slot:updated', payload: event, at: Date.now() })
    }

    function onAlertNew(event) {
      setLastEvent({ type: 'alert:new', payload: event, at: Date.now() })
    }

    socket.on('slot:updated', onSlotUpdated)
    socket.on('alert:new', onAlertNew)

    return () => {
      socket.off('slot:updated', onSlotUpdated)
      socket.off('alert:new', onAlertNew)
    }
  }, [])

  return { isConnected, lastEvent }
}
