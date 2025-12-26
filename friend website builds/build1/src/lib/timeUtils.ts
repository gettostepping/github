export function formatLastActive(lastActiveAt: string | Date): string {
  const now = new Date()
  const lastActive = new Date(lastActiveAt)
  const diffMs = now.getTime() - lastActive.getTime()
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  // If less than 1 minute, show as "Now"
  if (diffMinutes < 1) {
    return 'Now'
  }
  
  // If less than 1 hour, show in minutes
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`
  }
  
  // If less than 24 hours, show in hours
  if (diffHours < 24) {
    return `${diffHours}h ago`
  }
  
  // If more than 24 hours, show in days
  if (diffDays < 7) {
    return `${diffDays}d ago`
  }
  
  // If more than a week, show the date
  return lastActive.toLocaleDateString()
}

export function isCurrentlyActive(lastActiveAt: string | Date): boolean {
  const now = new Date()
  const lastActive = new Date(lastActiveAt)
  const diffMs = now.getTime() - lastActive.getTime()
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  
  return diffMinutes < 5 // Consider active if last seen within 5 minutes
}

export function formatSearchTime(createdAt: string | Date): string {
  const now = new Date()
  const searchTime = new Date(createdAt)
  const diffMs = now.getTime() - searchTime.getTime()
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  // If less than 1 minute, show as "Just now"
  if (diffMinutes < 1) {
    return 'Just now'
  }
  
  // If less than 1 hour, show in minutes
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`
  }
  
  // If less than 24 hours, show in hours
  if (diffHours < 24) {
    return `${diffHours}h ago`
  }
  
  // If less than 7 days, show in days
  if (diffDays < 7) {
    return `${diffDays}d ago`
  }
  
  // If more than a week, show the date
  return searchTime.toLocaleDateString()
}
