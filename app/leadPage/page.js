import { cookies } from 'next/headers'
import { authUtils } from '@/lib/auth-utils'
import { API_BASE_URL, DATATABLE_ENDPOINTS } from '@/lib/api-endpoint'
import LeadsPageClient from './client'
import { Suspense } from 'react'
import LeadPageSkeleton from './components/lead-page-skeleton'

async function getTables() {
  const cookieStore = await cookies()

  try {
    const { result: response, newAccessToken } = await authUtils.executeWithRefresh(cookieStore, async (headers) => {
      return fetch(`${API_BASE_URL}${DATATABLE_ENDPOINTS.LIST}`, {
        headers,
        next: { revalidate: 0 }
      });
    });

    console.log('Fetch Status:', response.status, response.statusText);

    if (!response.ok) {
      console.error('Failed to fetch tables in server component:', response.status, response.statusText)
      try {
        const errorData = await response.json()
        console.error('Error details:', errorData)
      } catch (e) {
        console.error('Could not parse error response body as JSON')
      }
      return { tables: [], newAccessToken }
    }

    const data = await response.json()
    let tables = []

    // Handle different response formats
    if (Array.isArray(data)) {
      tables = data
    } else if (data?.data && Array.isArray(data.data)) {
      tables = data.data
    } else if (data?.tables && Array.isArray(data.tables)) {
      tables = data.tables
    }

    return { tables, newAccessToken }
  } catch (error) {
    console.error('Error fetching tables:', error)
    return { tables: [], newAccessToken }
  }
}

export default async function LeadsPage() {
  const { tables, newAccessToken } = await getTables()

  return (
    <Suspense fallback={<LeadPageSkeleton />}>
      <LeadsPageClient initialTables={tables} newAccessToken={newAccessToken} />
    </Suspense>
  )
}