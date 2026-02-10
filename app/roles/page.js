import { cookies } from 'next/headers'
import RolesClient from './client'
import { API_BASE_URL, ROLE_ENDPOINTS } from '@/lib/api-endpoint'
import { authUtils } from '@/lib/auth-utils'
import { extractArray } from '@/lib/utils'

async function getData() {
  const cookieStore = await cookies()
  const headers = authUtils.getServerHeaders(cookieStore)

  try {
    const res = await fetch(`${API_BASE_URL}${ROLE_ENDPOINTS.LIST}`, {
      headers,
      next: { revalidate: 3600 }
    })

    if (!res.ok) {
      console.error(`Failed to fetch roles: ${res.status} ${res.statusText}`)
      return []
    }

    const data = await res.json()
    return extractArray(data, 'roles')
  } catch (error) {
    console.error('SSR Data Fetch Error:', error)
    return []
  }
}

export default async function RolesPage() {
  const roles = await getData()

  return (
    <RolesClient initialRoles={roles} />
  )
}