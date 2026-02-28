import { useEffect, useMemo, useState } from 'react'
import { Play, Square } from 'lucide-react'
import { socket } from '../lib/socket'
import ToastContainer from './ui/ToastContainer'

const speedOptions = [
  { label: 'Slow (10s)', value: 10 },
  { label: 'Medium (5s)', value: 5 },
  { label: 'Fast (2s)', value: 2 }
]

function getApiBase() {
  return import.meta.env.VITE_API_URL || '/api'
}

export default function SimulationPanel({ facilityId }) {
  const [intervalSeconds, setIntervalSeconds] = useState(5)
  const [status, setStatus] = useState({ isRunning: false, updatesCount: 0, uptimeSeconds: 0 })
  const [slotsChanged, setSlotsChanged] = useState(0)
  const [loadingAction, setLoadingAction] = useState('')
  const [toasts, setToasts] = useState([])

  const removeToast = (id) => setToasts((prev) => prev.filter((t) => t.id !== id))
  const addToast = (toast) => setToasts((prev) => [...prev, { ...toast, id: crypto.randomUUID() }])

  async function request(path, method = 'GET', body) {
    const token = localStorage.getItem('smartpark_token')
    const response = await fetch(`${getApiBase()}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: body ? JSON.stringify(body) : undefined
    })

    const payload = await response.json()
    if (!response.ok) {
      throw new Error(payload?.error || 'Simulation request failed.')
    }
    return payload.data
  }

  async function refreshStatus() {
    try {
      const data = await request('/simulation/status')
      setStatus(data)
    } catch (_error) {
      // Keep quiet for polling failures.
    }
  }

  useEffect(() => {
    if (!facilityId) return
    refreshStatus()
    const poll = setInterval(refreshStatus, 2000)
    return () => clearInterval(poll)
  }, [facilityId])

  useEffect(() => {
    function onLive(payload) {
      setSlotsChanged((prev) => prev + (payload?.changedCount || 0))
      if (typeof payload?.updatesCount === 'number') {
        setStatus((prev) => ({ ...prev, updatesCount: payload.updatesCount }))
      }
    }

    socket.on('occupancy:live', onLive)
    return () => socket.off('occupancy:live', onLive)
  }, [])

  async function startSimulation() {
    if (!facilityId) return
    setLoadingAction('start')
    try {
      const data = await request('/simulation/start', 'POST', {
        facilityId,
        intervalSeconds
      })
      addToast({ type: 'success', title: data.message, message: `Interval ${intervalSeconds}s` })
      setSlotsChanged(0)
      refreshStatus()
    } catch (error) {
      addToast({ type: 'error', title: 'Could not start simulation', message: error.message })
    } finally {
      setLoadingAction('')
    }
  }

  async function stopSimulation() {
    setLoadingAction('stop')
    try {
      const data = await request('/simulation/stop', 'POST')
      addToast({ type: 'warning', title: data.message })
      refreshStatus()
    } catch (error) {
      addToast({ type: 'error', title: 'Could not stop simulation', message: error.message })
    } finally {
      setLoadingAction('')
    }
  }

  const uptimeLabel = useMemo(() => {
    const sec = status.uptimeSeconds || 0
    const min = Math.floor(sec / 60)
    const rem = sec % 60
    return `${min}m ${String(rem).padStart(2, '0')}s`
  }, [status.uptimeSeconds])

  return (
    <div className="space-y-2">
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <div className="glass-card w-full max-w-[320px] border border-brand-cyan/30 p-4 shadow-xl shadow-brand-cyan/10">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-orbitron text-sm text-brand-cyan">🥧 Raspberry Pi Simulator</h3>
          <span className={`rounded-full px-2 py-0.5 text-[10px] ${status.isRunning ? 'bg-brand-green/20 text-brand-green' : 'bg-slate-500/20 text-slate-300'}`}>
            {status.isRunning ? 'Live' : 'Stopped'}
          </span>
        </div>

        <div className="mb-3 flex gap-2">
          <button
            type="button"
            onClick={startSimulation}
            disabled={!facilityId || loadingAction !== '' || status.isRunning}
            className="inline-flex items-center gap-1 rounded-lg bg-brand-green/20 px-3 py-1.5 text-xs text-brand-green disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Play size={12} /> Start
          </button>
          <button
            type="button"
            onClick={stopSimulation}
            disabled={loadingAction !== '' || !status.isRunning}
            className="inline-flex items-center gap-1 rounded-lg bg-brand-red/20 px-3 py-1.5 text-xs text-brand-red disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Square size={12} /> Stop
          </button>
        </div>

        <div className="mb-3 grid grid-cols-1 gap-1.5 text-xs">
          {speedOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setIntervalSeconds(option.value)}
              className={`rounded-md border px-2 py-1 text-left ${
                intervalSeconds === option.value
                  ? 'border-brand-cyan bg-brand-cyan/20 text-brand-cyan'
                  : 'border-dark-border bg-dark-surface text-slate-300'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="rounded-lg bg-dark-surface/80 p-2">
            <p className="text-slate-400">Updates</p>
            <p className="font-mono text-brand-cyan">{status.updatesCount || 0}</p>
          </div>
          <div className="rounded-lg bg-dark-surface/80 p-2">
            <p className="text-slate-400">Slots</p>
            <p className="font-mono text-brand-amber">{slotsChanged}</p>
          </div>
          <div className="rounded-lg bg-dark-surface/80 p-2">
            <p className="text-slate-400">Uptime</p>
            <p className="font-mono text-brand-green">{uptimeLabel}</p>
          </div>
        </div>

        <p className="mt-3 text-[11px] text-slate-400">Simulating YOLOv8 vehicle detection on Raspberry Pi 4</p>
      </div>
    </div>
  )
}
