import { useState } from 'react'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../store/auth'

const roles = [
  {
    id: 'DRIVER',
    label: 'Driver',
    icon: '🚗',
    email: 'driver@smartpark.ai',
    password: 'Admin@123'
  },
  {
    id: 'OWNER',
    label: 'Parking Owner',
    icon: '🏢',
    email: 'owner@smartpark.ai',
    password: 'Admin@123'
  },
  {
    id: 'ADMIN',
    label: 'City Admin',
    icon: '🛡️',
    email: 'admin@smartpark.ai',
    password: 'Admin@123'
  },
  {
    id: 'ANALYST',
    label: 'Analyst',
    icon: '📊',
    email: 'admin@smartpark.ai',
    password: 'Admin@123'
  }
]

export default function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [email, setEmail] = useState('driver@smartpark.ai')
  const [password, setPassword] = useState('Admin@123')
  const [remember, setRemember] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const loading = submitting

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      const minDelay = new Promise((resolve) => setTimeout(resolve, 800))
      const authCall = login(email, password)
      await Promise.all([minDelay, authCall])

      if (!remember) sessionStorage.setItem('smartpark_temp_login', 'true')

      navigate('/dashboard/map')
    } catch (err) {
      setError(err?.response?.data?.error || 'Authentication failed. Verify credentials.')
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <header className="mb-6 text-center">
          <h1 className="text-2xl font-semibold text-[#2b6cb0]">SmartPark</h1>
          <p className="mt-1 text-sm text-gray-600">Clear, simple parking insights</p>
        </header>

        <main className="panel-frame">
          <h2 className="mb-4 text-lg font-medium text-gray-800">Sign in to your account</h2>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="mb-1 block text-sm text-gray-700">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#2b6cb0]"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-gray-700">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 pr-10 text-sm outline-none focus:border-[#2b6cb0]"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400"
                  aria-label="toggle password visibility"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={() => setRemember((v) => !v)}
                  className="h-4 w-4 rounded border-gray-300 text-[#2b6cb0]"
                />
                Remember me
              </label>

              <a className="text-sm text-[#2b6cb0] hover:underline" href="#">Forgot?</a>
            </div>

            {error ? (
              <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-[#2b6cb0] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {loading ? <Loader2 className="animate-spin" size={16} /> : null}
              {loading ? 'Signing in...' : 'Sign in'}
            </button>

            <p className="pt-2 text-center text-xs text-gray-500">By signing in you agree to the terms.</p>
          </form>
        </main>
      </div>
    </div>
  )
}
