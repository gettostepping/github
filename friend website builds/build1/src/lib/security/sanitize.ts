import { AuthUser } from './auth'

export interface SanitizeUserOptions {
  isSelf?: boolean
  isAdmin?: boolean
  includeEmail?: boolean
}

export interface SanitizeUsersOptions {
  currentUserId?: string
  isAdmin?: boolean
}

/**
 * Sanitize a single user object - removes sensitive fields
 */
export function sanitizeUser(user: any, options: SanitizeUserOptions = {}): any {
  const { isSelf = false, isAdmin = false, includeEmail = false } = options

  const sanitized = { ...user }

  // Always remove password
  delete sanitized.password

  // Only include email if explicitly requested and user is viewing self or is admin
  if (!includeEmail || (!isSelf && !isAdmin)) {
    delete sanitized.email
  }

  // Only include roles if user is admin or viewing self
  if (!isAdmin && !isSelf) {
    delete sanitized.roles
  }

  return sanitized
}

/**
 * Sanitize an array of users
 */
export function sanitizeUsers(users: any[], options: SanitizeUsersOptions = {}): any[] {
  const { currentUserId, isAdmin = false } = options

  return users.map(user => {
    const isSelf = !!(currentUserId && user.id === currentUserId)
    return sanitizeUser(user, {
      isSelf,
      isAdmin,
      includeEmail: false // Never include emails in list views
    })
  })
}

