import useCountUp from '../../hooks/useCountUp'

export default function StatCard({
  title,
  value = 0,
  unit = '',
  trend = 'up',
  trendValue = '',
  color = 'text-gray-800',
  icon = null,
  decimals = 0
}) {
  const counted = useCountUp(Number(value) || 0, 1200)
  const formatted = counted.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  })

  return (
    <div className="panel-frame">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-gray-600">{title}</p>
        {icon ? <span className="text-gray-700">{icon}</span> : null}
      </div>

      <div className={`font-mono text-3xl font-semibold ${color}`}>
        {formatted}
        {unit ? <span className="ml-1 text-lg font-medium">{unit}</span> : null}
      </div>

      <div className="mt-2 text-xs text-gray-500">
        <span className={trend === 'down' ? 'text-red-600' : 'text-green-600'}>{trend === 'down' ? '↓' : '↑'}</span>{' '}
        {trendValue}
      </div>
    </div>
  )
}
