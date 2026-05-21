const toneMap = {
  success: 'border-gray-200 bg-green-50 text-green-700',
  error: 'border-gray-200 bg-red-50 text-red-700',
  warning: 'border-gray-200 bg-yellow-50 text-yellow-700',
  info: 'border-gray-200 bg-blue-50 text-blue-700'
}

export default function Toast({ toast, onRemove }) {
  return (
    <div
      className={`glass-card w-80 animate-slide-up border px-4 py-3 shadow ${toneMap[toast.type] || toneMap.info}`}
      role="status"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-800">{toast.title}</p>
          {toast.message ? <p className="mt-1 text-xs text-gray-600">{toast.message}</p> : null}
        </div>
        <button
          type="button"
          onClick={() => onRemove(toast.id)}
          className="rounded px-1 text-gray-500 hover:bg-gray-100"
        >
          ×
        </button>
      </div>
    </div>
  )
}
