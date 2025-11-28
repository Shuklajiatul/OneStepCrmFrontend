import { cookies } from 'next/headers'
import OrganizationsClient from './client'

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
    const res = await fetch(`${baseUrl}/api/organizations`, {
      headers,
      next: { revalidate: 3600 } // Cache organizations for 1 hour
    })

    if (!res.ok) {
      console.error(`Failed to fetch organizations: ${res.status} ${res.statusText}`)
      return []
    }

    const data = await res.json()

    // Handle different response structures
    if (Array.isArray(data)) return data
    if (data && Array.isArray(data.data)) return data.data
    if (data && Array.isArray(data.organizations)) return data.organizations

    return []
  } catch (error) {
    console.error('SSR Data Fetch Error:', error)
    return []
  }
}

export default async function OrganizationsPage() {
  const organizations = await getData()

  return (
    <OrganizationsClient initialOrganizations={organizations} />
  )
}