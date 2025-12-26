import useSWR from 'swr'
import { jsonFetcher } from '@/lib/fetcher'

export interface AdminUser {
  id: string
  name: string | null
  uid: number
  image: string | null
  discordId: string | null
  roles?: Array<{ name: string }>
}

interface UsersResponse {
  users: AdminUser[]
}

export function useAdminUsers() {
  const { data, error, isLoading, mutate, isValidating } = useSWR<UsersResponse>(
    '/api/admin/users',
    jsonFetcher,
    {
      dedupingInterval: 60_000,
      revalidateOnFocus: false
    }
  )

  return {
    users: data?.users ?? [],
    error,
    isLoading,
    isValidating,
    mutate
  }
}


