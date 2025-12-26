'use client'

import { useState, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faChartLine,
  faCheckCircle,
  faExclamationTriangle,
  faTimesCircle,
  faKey,
  faBan,
  faSnowflake,
  faServer,
  faBolt,
  faList,
  faClock
} from '@fortawesome/free-solid-svg-icons'

interface ApiStatusData {
  timeRange: string
  stats: {
    totalRequests: number
    requestsLastHour: number
    successfulRequests: number
    errorRequests: number
    rateLimitHits: number
    successRate: number
    errorRate: number
    healthStatus: 'healthy' | 'degraded' | 'down'
  }
  apiKeys: {
    active: number
    frozen: number
    revoked: number
    total: number
    allKeys?: Array<{ 
      id: string
      name: string
      frozen: boolean
      lastUsedAt: string | null
      createdAt: string
      userId: string | null
      tiedUserName: string | null
      tiedUserUid: number | null
      tiedUserImage: string | null
      permissions: string[]
    }>
  }
  topEndpoints: Array<{ endpoint: string; count: number }>
  activeKeys: Array<{ id: string; name: string; count: number; frozen: boolean }>
  errorBreakdown: Array<{ code: number; count: number }>
  recentErrors: Array<{ endpoint: string; method: string; statusCode: number; timestamp: string }>
  recentActivity: Array<{ endpoint: string; method: string; statusCode: number; apiKeyId: string | null; apiKeyName: string | null; responseTime: number; timestamp: string }>
  rateLimitWarnings: number
}

interface StatCard {
  label: string
  value: string | number
  icon: any
  bgClass: string
  borderClass: string
  iconClass: string
  valueClass: string
  subtitle?: string
}

export default function ApiStatusDashboard() {
  const [data, setData] = useState<ApiStatusData | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<string>('24h')
  const [selectedApiKeyId, setSelectedApiKeyId] = useState<string | null>(null)
  const [keyActivity, setKeyActivity] = useState<Array<{ endpoint: string; method: string; statusCode: number; apiKeyId: string | null; apiKeyName: string | null; responseTime: number; timestamp: string }>>([])
  const [keyLoading, setKeyLoading] = useState(false)
  const [apiKeyDropdownOpen, setApiKeyDropdownOpen] = useState(false)
  const [apiKeySearchQuery, setApiKeySearchQuery] = useState('')

  const fetchStatus = async () => {
    try {
      const res = await fetch(`/api/admin/api-status?range=${timeRange}`)
      if (res.ok) {
        const apiData = await res.json()
        setData(apiData)
      } else {
        // Try to get error message from response
        const errorData = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
        console.error('Failed to fetch API status:', errorData)
        setData(null)
      }
    } catch (error) {
      console.error('Failed to fetch API status:', error)
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  const fetchKeyActivity = async (keyId: string) => {
    if (!keyId) {
      setKeyActivity([])
      return
    }
    
    setKeyLoading(true)
    try {
      const res = await fetch(`/api/admin/api-status?range=${timeRange}&keyId=${keyId}`)
      if (res.ok) {
        const keyData = await res.json()
        setKeyActivity(keyData.keyActivity || [])
      }
    } catch (error) {
      console.error('Failed to fetch key activity:', error)
      setKeyActivity([])
    } finally {
      setKeyLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
    // Auto-refresh every 10 seconds
    const interval = setInterval(fetchStatus, 10000)
    return () => clearInterval(interval)
  }, [timeRange])

  useEffect(() => {
    if (selectedApiKeyId) {
      fetchKeyActivity(selectedApiKeyId)
      // Auto-refresh key activity every 10 seconds
      const interval = setInterval(() => fetchKeyActivity(selectedApiKeyId), 10000)
      return () => clearInterval(interval)
    } else {
      setKeyActivity([])
    }
  }, [selectedApiKeyId, timeRange])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (apiKeyDropdownOpen) {
        const target = event.target as HTMLElement
        const dropdown = document.querySelector('[data-api-key-dropdown]')
        const input = document.querySelector('[data-api-key-input]')
        
        if (dropdown && !dropdown.contains(target) && input && !input.contains(target)) {
          setApiKeyDropdownOpen(false)
        }
      }
    }

    if (apiKeyDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [apiKeyDropdownOpen])

  if (loading && !data) {
    return (
      <div className="p-6 bg-neutral-900/50 border border-neutral-700/50 rounded-xl backdrop-blur-sm">
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-400"></div>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="p-6 bg-neutral-900/50 border border-neutral-700/50 rounded-xl backdrop-blur-sm">
        <div className="text-center py-8">
          <p className="text-neutral-400 mb-2">Failed to load API status</p>
          <p className="text-neutral-500 text-sm">Check the browser console for details</p>
        </div>
      </div>
    )
  }

  // Get health status badge
  const getHealthBadge = () => {
    switch (data.stats.healthStatus) {
      case 'healthy':
        return {
          text: 'Online',
          bg: 'bg-green-500/20',
          border: 'border-green-500/30',
          textColor: 'text-green-400',
          icon: faCheckCircle
        }
      case 'degraded':
        return {
          text: 'Degraded',
          bg: 'bg-yellow-500/20',
          border: 'border-yellow-500/30',
          textColor: 'text-yellow-400',
          icon: faExclamationTriangle
        }
      case 'down':
        return {
          text: 'Down',
          bg: 'bg-red-500/20',
          border: 'border-red-500/30',
          textColor: 'text-red-400',
          icon: faTimesCircle
        }
    }
  }

  const healthBadge = getHealthBadge()

  // Get time range label
  const getTimeRangeLabel = (range: string) => {
    switch (range) {
      case '1h': return 'Past Hour'
      case '24h': return 'Past 24 Hours'
      case '7d': return 'Past Week'
      case '30d': return 'Past Month'
      case '1y': return 'Past Year'
      default: return 'Past 24 Hours'
    }
  }

  // Get status code badge classes
  const getStatusCodeColor = (code: number) => {
    if (code >= 200 && code < 300) return 'px-2 py-0.5 rounded text-xs font-bold border border-green-500/30 bg-green-500/20 text-green-400'
    if (code >= 300 && code < 400) return 'px-2 py-0.5 rounded text-xs font-bold border border-blue-500/30 bg-blue-500/20 text-blue-400'
    if (code >= 400 && code < 500) return 'px-2 py-0.5 rounded text-xs font-bold border border-orange-500/30 bg-orange-500/20 text-orange-400'
    if (code >= 500) return 'px-2 py-0.5 rounded text-xs font-bold border border-red-500/30 bg-red-500/20 text-red-400'
    return 'px-2 py-0.5 rounded text-xs font-bold border border-neutral-500/30 bg-neutral-500/20 text-neutral-400'
  }

  // Get method badge classes
  const getMethodColor = (method: string) => {
    switch (method.toUpperCase()) {
      case 'GET': return 'px-2 py-0.5 rounded text-xs font-bold border border-green-500/30 bg-green-500/20 text-green-400'
      case 'POST': return 'px-2 py-0.5 rounded text-xs font-bold border border-blue-500/30 bg-blue-500/20 text-blue-400'
      case 'PUT': return 'px-2 py-0.5 rounded text-xs font-bold border border-yellow-500/30 bg-yellow-500/20 text-yellow-400'
      case 'DELETE': return 'px-2 py-0.5 rounded text-xs font-bold border border-red-500/30 bg-red-500/20 text-red-400'
      case 'PATCH': return 'px-2 py-0.5 rounded text-xs font-bold border border-purple-500/30 bg-purple-500/20 text-purple-400'
      default: return 'px-2 py-0.5 rounded text-xs font-bold border border-neutral-500/30 bg-neutral-500/20 text-neutral-400'
    }
  }

  // Mask API key ID for display
  const getRequestSource = (apiKeyName: string | null) => {
    return apiKeyName || 'Session'
  }

  // Get API type from permissions (same logic as ApiKeyManagement)
  const getApiTypeFromPermissions = (permissions: string[]): 'public' | 'private' | 'mixed' => {
    const hasPublic = permissions.some(p => p.startsWith('public.'))
    const hasPrivate = permissions.some(p => p.startsWith('admin.'))
    
    // If has admin.* wildcard, it's private (unless it's explicitly mixed with individual public perms)
    if (permissions.includes('admin.*')) {
      // Check if there are individual public permissions (not just public.*)
      const hasIndividualPublic = permissions.some(p => 
        p.startsWith('public.') && p !== 'public.*'
      )
      return hasIndividualPublic ? 'mixed' : 'private'
    }
    
    // If has public.* wildcard only, it's public
    if (permissions.includes('public.*') && !hasPrivate) {
      return 'public'
    }
    
    // If has both individual public and private perms, it's mixed
    if (hasPublic && hasPrivate) return 'mixed'
    
    // If has only private perms, it's private
    if (hasPrivate) return 'private'
    
    // Otherwise it's public
    return 'public'
  }

  const statCards: StatCard[] = [
    {
      label: 'API Health',
      value: healthBadge.text,
      icon: healthBadge.icon,
      bgClass: healthBadge.bg,
      borderClass: healthBadge.border,
      iconClass: healthBadge.textColor,
      valueClass: healthBadge.textColor
    },
    {
      label: 'Total Requests',
      value: data.stats.totalRequests.toLocaleString(),
      icon: faChartLine,
      bgClass: 'bg-blue-500/10',
      borderClass: 'border-blue-500/30',
      iconClass: 'text-blue-400',
      valueClass: 'text-blue-400',
      subtitle: `${data.stats.requestsLastHour} in last hour`
    },
    {
      label: 'Success Rate',
      value: `${data.stats.successRate.toFixed(1)}%`,
      icon: faCheckCircle,
      bgClass: data.stats.successRate >= 95 ? 'bg-green-500/10' : data.stats.successRate >= 90 ? 'bg-yellow-500/10' : 'bg-red-500/10',
      borderClass: data.stats.successRate >= 95 ? 'border-green-500/30' : data.stats.successRate >= 90 ? 'border-yellow-500/30' : 'border-red-500/30',
      iconClass: data.stats.successRate >= 95 ? 'text-green-400' : data.stats.successRate >= 90 ? 'text-yellow-400' : 'text-red-400',
      valueClass: data.stats.successRate >= 95 ? 'text-green-400' : data.stats.successRate >= 90 ? 'text-yellow-400' : 'text-red-400'
    },
    {
      label: 'Active Keys',
      value: data.apiKeys.active,
      icon: faKey,
      bgClass: 'bg-purple-500/10',
      borderClass: 'border-purple-500/30',
      iconClass: 'text-purple-400',
      valueClass: 'text-purple-400',
      subtitle: `${data.apiKeys.frozen} frozen, ${data.apiKeys.revoked} revoked`
    },
    {
      label: 'Errors',
      value: data.stats.errorRequests.toLocaleString(),
      icon: faTimesCircle,
      bgClass: data.stats.errorRate > 25 ? 'bg-red-500/10' : data.stats.errorRate > 10 ? 'bg-yellow-500/10' : 'bg-orange-500/10',
      borderClass: data.stats.errorRate > 25 ? 'border-red-500/30' : data.stats.errorRate > 10 ? 'border-yellow-500/30' : 'border-orange-500/30',
      iconClass: data.stats.errorRate > 25 ? 'text-red-400' : data.stats.errorRate > 10 ? 'text-yellow-400' : 'text-orange-400',
      valueClass: data.stats.errorRate > 25 ? 'text-red-400' : data.stats.errorRate > 10 ? 'text-yellow-400' : 'text-orange-400',
      subtitle: `${data.stats.errorRate.toFixed(1)}% error rate`
    },
    {
      label: 'Rate Limit Hits',
      value: data.stats.rateLimitHits,
      icon: faBan,
      bgClass: 'bg-red-500/10',
      borderClass: 'border-red-500/30',
      iconClass: 'text-red-400',
      valueClass: 'text-red-400'
    }
  ]

  // Generate alerts
  const alerts: Array<{ type: 'warning' | 'critical' | 'info'; message: string }> = []
  if (data.stats.errorRate > 25) {
    alerts.push({ type: 'critical', message: `Critical: Error rate is ${data.stats.errorRate.toFixed(1)}%` })
  } else if (data.stats.errorRate > 10) {
    alerts.push({ type: 'warning', message: `Warning: Error rate is ${data.stats.errorRate.toFixed(1)}%` })
  }
  if (data.stats.rateLimitHits > 0) {
    alerts.push({ type: 'critical', message: `${data.stats.rateLimitHits} rate limit hit(s) detected` })
  }
  if (data.rateLimitWarnings > 0) {
    alerts.push({ type: 'warning', message: `${data.rateLimitWarnings} API key(s) near rate limit` })
  }
  if (data.apiKeys.frozen > 0) {
    alerts.push({ type: 'info', message: `${data.apiKeys.frozen} API key(s) are frozen` })
  }

  return (
    <div className="p-6 bg-neutral-900/50 border border-neutral-700/50 rounded-xl backdrop-blur-sm space-y-6">
      {/* Header with time range selector */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <FontAwesomeIcon icon={faServer} className="text-brand-400 w-5 h-5" />
            API Status Dashboard
          </h3>
          <p className="text-xs text-neutral-500 mt-1">Auto-updates every 10s</p>
        </div>
        <div className="flex items-center gap-2">
          <FontAwesomeIcon icon={faClock} className="text-neutral-400 w-4 h-4" />
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="bg-neutral-800 border border-neutral-700 rounded-md px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="1h">Past Hour</option>
            <option value="24h">Past 24 Hours</option>
            <option value="7d">Past Week</option>
            <option value="30d">Past Month</option>
            <option value="1y">Past Year</option>
          </select>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, index) => (
            <div
              key={index}
              className={`p-3 rounded-lg border ${
                alert.type === 'critical'
                  ? 'bg-red-500/10 border-red-500/30 text-red-400'
                  : alert.type === 'warning'
                  ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
                  : 'bg-blue-500/10 border-blue-500/30 text-blue-400'
              } flex items-center gap-2`}
            >
              <FontAwesomeIcon
                icon={alert.type === 'critical' ? faTimesCircle : alert.type === 'warning' ? faExclamationTriangle : faCheckCircle}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium">{alert.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((card, index) => (
          <div
            key={index}
            className={`${card.bgClass} ${card.borderClass} border rounded-lg p-4 hover:scale-105 transition-transform duration-200`}
          >
            <div className="flex items-center gap-2 mb-2">
              <FontAwesomeIcon icon={card.icon} className={`${card.iconClass} w-4 h-4`} />
              <div className="text-neutral-400 text-xs font-medium">{card.label}</div>
            </div>
            <div className={`${card.valueClass} text-2xl font-bold`}>{card.value}</div>
            {card.subtitle && (
              <div className="text-neutral-500 text-xs mt-1">{card.subtitle}</div>
            )}
          </div>
        ))}
      </div>

      {/* Top Endpoints and Active Keys */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top Endpoints */}
        <div className="bg-neutral-800/50 border border-neutral-700 rounded-lg p-4">
          <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
            <FontAwesomeIcon icon={faBolt} className="text-brand-400 w-4 h-4" />
            Most Used Endpoints
          </h4>
          <div className="space-y-2">
            {data.topEndpoints.length > 0 ? (
              data.topEndpoints.map((endpoint, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <code className="text-brand-400 font-mono text-xs">{endpoint.endpoint}</code>
                  <span className="text-neutral-400">{endpoint.count.toLocaleString()}</span>
                </div>
              ))
            ) : (
              <p className="text-neutral-500 text-sm">No endpoints tracked</p>
            )}
          </div>
        </div>

        {/* Active Keys */}
        <div className="bg-neutral-800/50 border border-neutral-700 rounded-lg p-4">
          <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
            <FontAwesomeIcon icon={faKey} className="text-brand-400 w-4 h-4" />
            Most Active Keys
          </h4>
          <div className="space-y-2">
            {data.activeKeys.length > 0 ? (
              data.activeKeys.map((key, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-white">{key.name}</span>
                    {key.frozen && (
                      <span className="px-1.5 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded border border-purple-500/30">
                        Frozen
                      </span>
                    )}
                  </div>
                  <span className="text-neutral-400">{key.count.toLocaleString()}</span>
                </div>
              ))
            ) : (
              <p className="text-neutral-500 text-sm">No API key activity</p>
            )}
          </div>
        </div>
      </div>

      {/* API Key Activity Monitoring */}
      {data.apiKeys.allKeys && data.apiKeys.allKeys.length > 0 && (
        <div className="bg-neutral-800/50 border border-neutral-700 rounded-lg p-4">
          <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
            <FontAwesomeIcon icon={faKey} className="text-brand-400 w-4 h-4" />
            API Key Activity Monitor
          </h4>
          <div className="mb-4">
            <label className="text-neutral-400 text-sm mb-2 block">Select API Key to Monitor</label>
            <div className="relative">
              {selectedApiKeyId && data.apiKeys.allKeys ? (() => {
                const selectedKey = data.apiKeys.allKeys!.find(k => k.id === selectedApiKeyId)
                if (!selectedKey) return null
                
                const keyType = getApiTypeFromPermissions(selectedKey.permissions)
                const typeLabel = keyType === 'public' ? 'Public' : keyType === 'private' ? 'Private' : 'Mixed'
                const typeBadgeClass = keyType === 'public' 
                  ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                  : keyType === 'private'
                  ? 'bg-purple-500/20 text-purple-400 border-purple-500/30'
                  : 'bg-orange-500/20 text-orange-400 border-orange-500/30'
                
                return (
                  <div className="w-full rounded-md bg-neutral-800 border border-neutral-700 px-4 py-2 flex items-center gap-3 flex-wrap">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium border ${typeBadgeClass}`}>
                      {typeLabel}
                    </span>
                    {selectedKey.frozen && (
                      <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded border border-purple-500/30">
                        Frozen
                      </span>
                    )}
                    <span className="text-white text-sm flex-1 truncate">
                      {selectedKey.name}
                    </span>
                    {selectedKey.tiedUserName && (
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {selectedKey.tiedUserImage ? (
                          <img
                            src={selectedKey.tiedUserImage}
                            alt={selectedKey.tiedUserName}
                            className="w-6 h-6 rounded-full flex-shrink-0"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement
                              target.style.display = 'none'
                            }}
                          />
                        ) : null}
                        <span className="text-neutral-400 text-xs">
                          {selectedKey.tiedUserName}
                          {selectedKey.tiedUserUid && ` (${selectedKey.tiedUserUid})`}
                        </span>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedApiKeyId(null)
                        setApiKeySearchQuery('')
                        setApiKeyDropdownOpen(false)
                      }}
                      className="text-neutral-400 hover:text-white transition-colors flex-shrink-0"
                    >
                      ×
                    </button>
                  </div>
                )
              })(              ) : (
                <input
                  type="text"
                  data-api-key-input
                  value={apiKeySearchQuery}
                  onChange={(e) => {
                    setApiKeySearchQuery(e.target.value)
                    setApiKeyDropdownOpen(true)
                  }}
                  onFocus={() => setApiKeyDropdownOpen(true)}
                  placeholder="Search API keys..."
                  className="w-full rounded-md bg-neutral-800 border border-neutral-700 px-4 py-2 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              )}
              
              {/* Dropdown */}
              {apiKeyDropdownOpen && !selectedApiKeyId && data.apiKeys.allKeys && (
                <div
                  data-api-key-dropdown
                  className="absolute z-50 w-full mt-1 bg-neutral-800 border border-neutral-700 rounded-md shadow-lg max-h-60 overflow-y-auto"
                  onClick={(e) => e.stopPropagation()}
                >
                  {data.apiKeys.allKeys
                      .filter(key => {
                        if (!apiKeySearchQuery) return true
                        const query = apiKeySearchQuery.toLowerCase()
                        const keyType = getApiTypeFromPermissions(key.permissions)
                        const typeLabel = keyType === 'public' ? 'Public' : keyType === 'private' ? 'Private' : 'Mixed'
                        return (
                          key.name.toLowerCase().includes(query) ||
                          typeLabel.toLowerCase().includes(query) ||
                          (key.tiedUserName && key.tiedUserName.toLowerCase().includes(query)) ||
                          (key.tiedUserUid && key.tiedUserUid.toString().includes(query))
                        )
                      })
                      .map((key) => {
                        const keyType = getApiTypeFromPermissions(key.permissions)
                        const typeLabel = keyType === 'public' ? 'Public' : keyType === 'private' ? 'Private' : 'Mixed'
                        const typeBadgeClass = keyType === 'public' 
                          ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                          : keyType === 'private'
                          ? 'bg-purple-500/20 text-purple-400 border-purple-500/30'
                          : 'bg-orange-500/20 text-orange-400 border-orange-500/30'
                        
                        return (
                          <button
                            key={key.id}
                            type="button"
                            onClick={() => {
                              setSelectedApiKeyId(key.id)
                              setApiKeySearchQuery(key.name)
                              setApiKeyDropdownOpen(false)
                            }}
                            className={`w-full px-4 py-2 flex items-center gap-3 hover:bg-neutral-700 transition-colors text-left ${
                              selectedApiKeyId === key.id ? 'bg-neutral-700' : ''
                            }`}
                          >
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className={`px-2 py-0.5 rounded text-xs font-medium border ${typeBadgeClass}`}>
                                {typeLabel}
                              </span>
                              {key.frozen && (
                                <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded border border-purple-500/30">
                                  Frozen
                                </span>
                              )}
                            </div>
                            {key.tiedUserImage && (
                              <img
                                src={key.tiedUserImage}
                                alt={key.tiedUserName || 'User'}
                                className="w-8 h-8 rounded-full flex-shrink-0"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement
                                  target.style.display = 'none'
                                }}
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="text-white text-sm font-medium truncate">
                                {key.name}
                              </div>
                              {key.tiedUserName && (
                                <div className="text-neutral-400 text-xs truncate">
                                  {key.tiedUserName}
                                  {key.tiedUserUid && ` (${key.tiedUserUid})`}
                                </div>
                              )}
                            </div>
                            {selectedApiKeyId === key.id && (
                              <div className="text-brand-400 flex-shrink-0">✓</div>
                            )}
                          </button>
                        )
                      })}
                    {data.apiKeys.allKeys.filter(key => {
                      if (!apiKeySearchQuery) return true
                      const query = apiKeySearchQuery.toLowerCase()
                      const keyType = getApiTypeFromPermissions(key.permissions)
                      const typeLabel = keyType === 'public' ? 'Public' : keyType === 'private' ? 'Private' : 'Mixed'
                      return (
                        key.name.toLowerCase().includes(query) ||
                        typeLabel.toLowerCase().includes(query) ||
                        (key.tiedUserName && key.tiedUserName.toLowerCase().includes(query)) ||
                        (key.tiedUserUid && key.tiedUserUid.toString().includes(query))
                      )
                    }).length === 0 && (
                      <div className="p-4 text-center text-neutral-400">No API keys found</div>
                    )}
                </div>
              )}
            </div>
          </div>
          {selectedApiKeyId && (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {keyLoading ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-400"></div>
                </div>
              ) : keyActivity.length > 0 ? (
                keyActivity.map((activity, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between text-sm py-2 border-b border-neutral-700/50 last:border-0"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className={getMethodColor(activity.method)}>
                        {activity.method}
                      </span>
                      <code className="text-brand-400 font-mono text-xs truncate">{activity.endpoint}</code>
                      <span className={getStatusCodeColor(activity.statusCode)}>
                        {activity.statusCode}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-neutral-400">
                      <span className="px-2 py-0.5 bg-neutral-700/50 rounded border border-neutral-600/50">
                        {getRequestSource(activity.apiKeyName)}
                      </span>
                      <span>{activity.responseTime}ms</span>
                      <span>{new Date(activity.timestamp).toLocaleTimeString()}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-neutral-500 text-sm">No activity for this API key in the selected time range</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Recent Activity Feed */}
      <div className="bg-neutral-800/50 border border-neutral-700 rounded-lg p-4">
        <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
          <FontAwesomeIcon icon={faList} className="text-brand-400 w-4 h-4" />
          Recent Activity
        </h4>
        <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
          {data.recentActivity.length > 0 ? (
            data.recentActivity.map((activity, index) => (
              <div
                key={index}
                className="flex items-center justify-between text-sm py-2 border-b border-neutral-700/50 last:border-0"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className={getMethodColor(activity.method)}>
                    {activity.method}
                  </span>
                  <code className="text-brand-400 font-mono text-xs truncate">{activity.endpoint}</code>
                  <span className={getStatusCodeColor(activity.statusCode)}>
                    {activity.statusCode}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-neutral-400">
                  <span className="px-2 py-0.5 bg-neutral-700/50 rounded border border-neutral-600/50">
                    {getRequestSource(activity.apiKeyName)}
                  </span>
                  <span>{activity.responseTime}ms</span>
                  <span>{new Date(activity.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>
            ))
          ) : (
            <p className="text-neutral-500 text-sm">No recent activity</p>
          )}
        </div>
      </div>
    </div>
  )
}

