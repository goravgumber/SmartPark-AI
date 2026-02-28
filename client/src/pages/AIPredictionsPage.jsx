import { useMemo, useState } from 'react'
import {
  Area,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'
import ToastContainer from '../components/ui/ToastContainer'

function makeForecastData() {
  return Array.from({ length: 48 }, (_, i) => {
    const isFuture = i >= 24
    const base = 58 + Math.sin(i / 4) * 14 + (i > 30 ? 12 : 0)
    const predicted = Math.max(12, Math.min(98, Math.round(base + (isFuture ? 4 : 0))))
    return {
      hour: i - 24,
      observed: isFuture ? null : predicted,
      forecast: isFuture ? predicted : null,
      lower: isFuture ? Math.max(predicted - 12, 0) : null,
      upper: isFuture ? Math.min(predicted + 12, 100) : null
    }
  })
}

export default function AIPredictionsPage() {
  const [toasts, setToasts] = useState([])
  const data = useMemo(() => makeForecastData(), [])

  const rows = [
    { day: 'D-6', predicted: 78, actual: 73, error: '6.4%' },
    { day: 'D-5', predicted: 82, actual: 85, error: '3.5%' },
    { day: 'D-4', predicted: 69, actual: 64, error: '7.8%' },
    { day: 'D-3', predicted: 74, actual: 76, error: '2.6%' },
    { day: 'D-2', predicted: 71, actual: 68, error: '4.4%' },
    { day: 'D-1', predicted: 83, actual: 89, error: '6.7%' },
    { day: 'Today', predicted: 88, actual: 84, error: '4.7%' }
  ]

  const suggestions = [
    '💡 Open 10 reserved slots for public at 3 PM — low advance bookings',
    '⚡ Convert Zone C rows 3-4 to EV charging (12% utilization)',
    '💰 Price surge: Zone A 5-9 PM (+75%)'
  ]

  const removeToast = (id) => setToasts((prev) => prev.filter((t) => t.id !== id))
  const addToast = (toast) => setToasts((prev) => [...prev, { ...toast, id: crypto.randomUUID() }])

  return (
    <div className="space-y-4">
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      <div className="rounded-lg border border-brand-amber/40 bg-brand-amber/10 px-4 py-2 text-sm text-brand-amber">
        This feature uses AI predictive models. Accuracy ±12%.
      </div>

      <div className="panel-frame">
        <h3 className="mb-3 font-orbitron text-lg text-brand-cyan">48-Hour Occupancy Forecast</h3>
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data}>
              <XAxis dataKey="hour" tickFormatter={(v) => `${v}h`} stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip />
              <Area type="monotone" dataKey="observed" stroke="#00E5FF" fill="rgba(0,229,255,0.25)" name="Past 24h" />
              <Area type="monotone" dataKey="upper" stroke="none" fill="rgba(0,229,255,0.12)" name="Confidence" />
              <Area type="monotone" dataKey="lower" stroke="none" fill="rgba(5,11,24,0.85)" name="Lower" />
              <Line type="monotone" dataKey="forecast" stroke="#00E5FF" strokeDasharray="6 4" strokeWidth={2.5} dot={false} name="Forecast" />
              <ReferenceLine x={0} stroke="#FFB300" label={{ value: 'NOW', fill: '#FFB300', fontSize: 11 }} />
              <ReferenceLine x={19} stroke="#7B61FF" label={{ value: 'Event Nearby ↑', fill: '#7B61FF', fontSize: 10 }} />
              <ReferenceLine x={28} stroke="#7B61FF" label={{ value: 'Weekend Surge ↑', fill: '#7B61FF', fontSize: 10 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="panel-frame"><p className="text-sm text-slate-300">Next Peak</p><p className="font-mono text-2xl text-brand-cyan">6:30 PM – 8:00 PM</p><p className="text-xs text-brand-green">Confidence: 91%</p></div>
        <div className="panel-frame"><p className="text-sm text-slate-300">Max Occupancy</p><p className="font-mono text-2xl text-brand-cyan">94%</p><p className="text-xs text-slate-400">at 7:15 PM</p></div>
        <div className="panel-frame"><p className="text-sm text-slate-300">Revenue Forecast</p><p className="font-mono text-2xl text-brand-green">₹21,200</p><p className="text-xs text-slate-400">± ₹1,800</p></div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="panel-frame">
          <h3 className="mb-3 font-orbitron text-lg text-brand-cyan">Slot Recommendations</h3>
          <div className="space-y-3">
            {suggestions.map((text) => (
              <div key={text} className="glass-card px-3 py-2 text-sm">
                <p>{text}</p>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => addToast({ type: 'success', title: 'Recommendation applied!' })}
                    className="rounded bg-brand-green/20 px-2 py-1 text-xs text-brand-green"
                  >
                    Accept ✓
                  </button>
                  <button type="button" className="rounded border border-dark-border px-2 py-1 text-xs text-slate-300">Reject ✗</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel-frame">
          <h3 className="mb-3 font-orbitron text-lg text-brand-cyan">Model Health</h3>
          <div className="mb-3 grid grid-cols-3 gap-2 text-sm">
            <div className="rounded-lg border border-dark-border px-2 py-2"><p className="text-xs text-slate-400">Version</p><p className="font-mono">v2.8.4</p></div>
            <div className="rounded-lg border border-dark-border px-2 py-2"><p className="text-xs text-slate-400">Retrained</p><p className="font-mono">2h ago</p></div>
            <div className="rounded-lg border border-dark-border px-2 py-2"><p className="text-xs text-slate-400">Accuracy</p><p className="font-mono text-brand-green">87.3%</p></div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-slate-400">
                <tr><th className="py-1 text-left">Day</th><th className="py-1 text-left">Predicted</th><th className="py-1 text-left">Actual</th><th className="py-1 text-left">Error</th></tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.day} className="border-t border-dark-border/60"><td className="py-1">{r.day}</td><td className="py-1">{r.predicted}%</td><td className="py-1">{r.actual}%</td><td className="py-1">{r.error}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
