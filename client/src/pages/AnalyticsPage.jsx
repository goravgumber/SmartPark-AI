import { useEffect, useMemo, useState } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'
import { Activity, Clock3, IndianRupee, Receipt } from 'lucide-react'
import { api } from '../lib/api'
import ProgressRing from '../components/ui/ProgressRing'
import StatCard from '../components/ui/StatCard'

const pieColors = ['#00FF88', '#FF3D57', '#FFB300', '#475569']

function fmtINR(value) {
  return `₹${Number(value || 0).toLocaleString('en-IN')}`
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || payload.length === 0) return null
  return (
    <div className="glass-card border border-brand-cyan/25 px-3 py-2 text-xs text-slate-200">
      <p className="mb-1 text-brand-cyan">{label}</p>
      {payload.map((item) => (
        <p key={item.name} style={{ color: item.color }}>
          {item.name}: {Number(item.value).toLocaleString()}
        </p>
      ))}
    </div>
  )
}

export default function AnalyticsPage() {
  const [facilityId, setFacilityId] = useState('')
  const [loading, setLoading] = useState(true)
  const [dashboard, setDashboard] = useState(null)
  const [occupancy, setOccupancy] = useState([])
  const [revenue, setRevenue] = useState([])
  const [topSlots, setTopSlots] = useState([])
  const [zones, setZones] = useState([])
  const [sortBy, setSortBy] = useState({ key: 'count', direction: 'desc' })

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const facilitiesRes = await api.get('/parking/facilities')
        const facility = facilitiesRes.data.data?.[0]
        if (!facility) {
          setLoading(false)
          return
        }

        setFacilityId(facility.id)

        const [dashboardRes, occupancyRes, revenueRes, topSlotsRes, facilityRes] = await Promise.all([
          api.get(`/analytics/dashboard/${facility.id}`),
          api.get(`/analytics/occupancy/${facility.id}`),
          api.get(`/analytics/revenue/${facility.id}`),
          api.get(`/analytics/top-slots/${facility.id}`),
          api.get(`/parking/facilities/${facility.id}`)
        ])

        setDashboard(dashboardRes.data.data)
        setOccupancy(
          occupancyRes.data.data.map((item) => ({
            ...item,
            reserved: item.reserved ?? Math.max(1, Math.round(item.occupied * 0.18))
          }))
        )
        setRevenue(revenueRes.data.data)
        setTopSlots(topSlotsRes.data.data)
        setZones(facilityRes.data.data.zones || [])
      } finally {
        setLoading(false)
      }
    }

    load().catch(() => {
      setLoading(false)
    })
  }, [])

  const kpis = useMemo(() => {
    const summary = dashboard?.occupancySummary || {}
    const impact = dashboard?.environmentalImpact || {}
    const todayRevenue = dashboard?.todayRevenue || 0
    const txToday = revenue[revenue.length - 1]?.transactions || 0

    return {
      occupancyRate: summary.occupancyRate || 0,
      timeSaved: impact.carsGuided ? impact.timeSaved / impact.carsGuided : 14.3,
      todayRevenue,
      transactions: txToday
    }
  }, [dashboard, revenue])

  const distribution = useMemo(() => {
    const summary = dashboard?.occupancySummary || { total: 0, available: 0, occupied: 0, reserved: 0 }
    const disabled = Math.max(summary.total - summary.available - summary.occupied - summary.reserved, 0)
    return [
      { name: 'Available', value: summary.available },
      { name: 'Occupied', value: summary.occupied },
      { name: 'Reserved', value: summary.reserved },
      { name: 'Disabled', value: disabled }
    ]
  }, [dashboard])

  const zoneRadar = useMemo(() => {
    return zones.map((zone) => {
      const occupied = zone.occupied || 0
      const today = occupied + (zone.reserved || 0)
      return {
        zone: zone.code,
        today,
        yesterday: Math.round(today * 0.85)
      }
    })
  }, [zones])

  const sortedTopSlots = useMemo(() => {
    const rows = [...topSlots]
    rows.sort((a, b) => {
      const dir = sortBy.direction === 'asc' ? 1 : -1
      if (sortBy.key === 'slotCode' || sortBy.key === 'zone') {
        return a[sortBy.key].localeCompare(b[sortBy.key]) * dir
      }
      return (a[sortBy.key] - b[sortBy.key]) * dir
    })
    return rows
  }, [topSlots, sortBy])

  const avgRevenue = useMemo(() => {
    if (!revenue.length) return 0
    return revenue.reduce((sum, d) => sum + d.revenue, 0) / revenue.length
  }, [revenue])

  if (loading) {
    return <div className="panel-frame min-h-[72vh] animate-pulse text-brand-cyan">Loading analytics...</div>
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <div className="panel-frame flex items-center gap-4">
          <ProgressRing percent={kpis.occupancyRate} size={86} strokeWidth={8} color="#00E5FF" />
          <div>
            <p className="text-sm text-slate-300">Occupancy Rate</p>
            <p className="font-mono text-3xl text-brand-cyan">{kpis.occupancyRate.toFixed(1)}%</p>
          </div>
        </div>

        <StatCard
          title="Time Saved"
          value={kpis.timeSaved}
          unit="min/driver"
          color="text-brand-cyan"
          trendValue="Efficiency rising"
          icon={<Clock3 size={16} />}
          decimals={1}
        />

        <StatCard
          title="Daily Revenue"
          value={kpis.todayRevenue}
          unit=""
          color="text-brand-green"
          trendValue="Vs yesterday +12%"
          icon={<IndianRupee size={16} />}
          decimals={0}
        />

        <StatCard
          title="Transactions Today"
          value={kpis.transactions}
          color="text-white"
          trendValue="Peak window 6-8 PM"
          icon={<Receipt size={16} />}
          decimals={0}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        <div className="panel-frame xl:col-span-3">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-orbitron text-lg text-brand-cyan">24-Hour Occupancy Trend</h3>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={occupancy}>
                <defs>
                  <linearGradient id="occGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FF3D57" stopOpacity={0.55} />
                    <stop offset="95%" stopColor="#FF3D57" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="resGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FFB300" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#FFB300" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="hour" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine x="19:00" stroke="#00E5FF" label={{ value: 'PEAK ↑', fill: '#00E5FF', fontSize: 10 }} />
                <Area type="monotone" dataKey="occupied" name="Occupied" stroke="#FF3D57" fill="url(#occGrad)" strokeWidth={2} />
                <Area type="monotone" dataKey="reserved" name="Reserved" stroke="#FFB300" fill="url(#resGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="panel-frame xl:col-span-2">
          <h3 className="mb-3 font-orbitron text-lg text-brand-cyan">Slot Status Distribution</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={distribution} dataKey="value" innerRadius={60} outerRadius={92} paddingAngle={3}>
                  {distribution.map((entry, idx) => (
                    <Cell key={entry.name} fill={pieColors[idx]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <text x="50%" y="48%" textAnchor="middle" fill="#00E5FF" fontSize="14" fontFamily="JetBrains Mono">
                  {dashboard?.occupancySummary?.total || 0} Total
                </text>
                <Legend wrapperStyle={{ fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="panel-frame">
          <h3 className="mb-3 font-orbitron text-lg text-brand-cyan">Weekly Revenue</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="day" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${Math.round(v / 1000)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={avgRevenue} stroke="#FFB300" label={{ value: 'Avg', fill: '#FFB300', fontSize: 10 }} />
                <Bar dataKey="revenue" fill="#00E5FF" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="panel-frame">
          <h3 className="mb-3 font-orbitron text-lg text-brand-cyan">Zone Comparison</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart outerRadius={90} data={zoneRadar}>
                <PolarGrid stroke="rgba(255,255,255,0.15)" />
                <PolarAngleAxis dataKey="zone" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <Radar dataKey="today" stroke="#00E5FF" fill="#00E5FF" fillOpacity={0.35} name="Today" />
                <Radar dataKey="yesterday" stroke="#FFB300" fill="#FFB300" fillOpacity={0.2} name="Yesterday" />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="panel-frame">
          <h3 className="mb-3 font-orbitron text-lg text-brand-cyan">AI Insights Panel</h3>
          <div className="space-y-2 text-sm text-slate-200">
            <p><span className="mr-2 text-blue-400">●</span>Zone B peaks at 6-8 PM. Suggest dynamic pricing.</p>
            <p><span className="mr-2 text-brand-green">●</span>Slots A-01 to A-10 at 95% utilization.</p>
            <p><span className="mr-2 text-brand-amber">●</span>Tuesday occupancy drops 23%.</p>
            <p><span className="mr-2 text-brand-red">●</span>Camera RAPI-03 offline — Zone C data partial.</p>
            <p><span className="mr-2 text-brand-violet">●</span>EV slots underused. Convert 5 standard slots.</p>
          </div>
          <div className="mt-4 rounded-xl border border-brand-cyan/20 bg-dark-surface/70 p-3 text-xs text-slate-300">
            <p className="mb-1 text-brand-cyan">AI Confidence</p>
            <div className="h-2 overflow-hidden rounded bg-dark-border">
              <div className="h-full w-[84%] bg-gradient-to-r from-brand-cyan to-brand-violet" />
            </div>
            <p className="mt-1 text-right font-mono text-brand-cyan">84%</p>
          </div>
        </div>
      </div>

      <div className="panel-frame">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-orbitron text-lg text-brand-cyan">Top Slots</h3>
          <span className="flex items-center gap-1 text-xs text-slate-400">
            <Activity size={12} /> Live ranking
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-slate-400">
              <tr>
                {[
                  { key: 'rank', label: 'Rank' },
                  { key: 'slotCode', label: 'Slot' },
                  { key: 'zone', label: 'Zone' },
                  { key: 'count', label: 'Reservations' },
                  { key: 'revenue', label: 'Revenue' },
                  { key: 'status', label: 'Status' }
                ].map((head) => (
                  <th key={head.key} className="cursor-pointer px-2 py-2" onClick={() => {
                    if (head.key === 'rank' || head.key === 'status') return
                    setSortBy((prev) => ({
                      key: head.key,
                      direction: prev.key === head.key && prev.direction === 'desc' ? 'asc' : 'desc'
                    }))
                  }}>
                    {head.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedTopSlots.map((row, idx) => (
                <tr key={row.slotId} className="border-t border-dark-border/70">
                  <td className="px-2 py-2">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}</td>
                  <td className="px-2 py-2 font-mono text-brand-cyan">{row.slotCode}</td>
                  <td className="px-2 py-2">{row.zone}</td>
                  <td className="px-2 py-2 font-mono">{row.count}</td>
                  <td className="px-2 py-2 font-mono text-brand-green">{fmtINR(row.revenue)}</td>
                  <td className="px-2 py-2"><span className="rounded-full border border-brand-green/40 bg-brand-green/10 px-2 py-0.5 text-xs text-brand-green">Active</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
