import { cookies } from 'next/headers'
import OrganizationsClient from './client'
import { API_BASE_URL, ORGANIZATION_ENDPOINTS } from '@/lib/api-endpoint'
import { authUtils } from '@/lib/auth-utils'
import { extractArray } from '@/lib/utils'

async function getData() {
  const cookieStore = await cookies()
  const headers = authUtils.getServerHeaders(cookieStore)

  try {
    const res = await fetch(`${API_BASE_URL}${ORGANIZATION_ENDPOINTS.LIST}`, {
      headers,
      next: { revalidate: 3600 }
    })

    if (!res.ok) {
      console.error(`Failed to fetch organizations: ${res.status} ${res.statusText}`)
      return []
    }

    const data = await res.json()
    return extractArray(data, 'organizations')
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