import axios from 'axios'

const baseURL = import.meta.env.VITE_API_URL || '/api'

export const publicApi = axios.create({
  baseURL
})

export const api = axios.create({
  baseURL
})

api.interceptors.request.use((request) => {
  const token = localStorage.getItem('smartpark_token')
  if (token) {
    request.headers.Authorization = `Bearer ${token}`
  }
  return request
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      localStorage.removeItem('smartpark_token')
      localStorage.removeItem('smartpark_user')
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)
