import { cookies } from 'next/headers'
import RolesClient from './client'
import { ROLE_ENDPOINTS } from '@/lib/api-endpoint'

async function getData() {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get('accessToken')?.value || cookieStore.get('token')?.value

  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(accessToken && { 'Authorization': `Bearer ${accessToken}` })
  }

  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://10.10.15.194:3001'

  try {
    const res = await fetch(`${baseUrl}${ROLE_ENDPOINTS.LIST}`, {
      headers,
      next: { revalidate: 3600 } // Cache roles for 1 hour
    })

    if (!res.ok) {
      // If 404 or other error, return empty array but don't crash
      console.error(`Failed to fetch roles: ${res.status} ${res.statusText}`)
      return []
    }

    const data = await res.json()

    // Handle different response structures
    if (Array.isArray(data)) return data
    if (data && Array.isArray(data.data)) return data.data
    if (data && Array.isArray(data.roles)) return data.roles

    return []
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