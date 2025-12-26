export async function jsonFetcher(input: RequestInfo | URL, init?: RequestInit) {
  const res = await fetch(input, init)
  if (!res.ok) {
    const message = await res.text()
    throw new Error(message || `Request failed: ${res.status}`)
  }
  return res.json()
}


