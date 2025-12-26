import axios from 'axios'

const TMDB_BASE = 'https://api.themoviedb.org/3'

function authHeaders() {
  const bearer = process.env.TMDB_BEARER
  const apiKey = process.env.TMDB_API_KEY
  if (bearer) return { Authorization: `Bearer ${bearer}` }
  if (apiKey) return {}
  throw new Error('TMDB credentials missing')
}

export async function tmdbGet<T>(endpoint: string, params: Record<string, any> = {}) {
  const headers = authHeaders()
  const url = `${TMDB_BASE}${endpoint}`
  const apiKey = process.env.TMDB_BEARER ? undefined : process.env.TMDB_API_KEY
  const res = await axios.get<T>(url, { headers, params: { ...(apiKey ? { api_key: apiKey } : {}), ...params } })
  return res.data
}


