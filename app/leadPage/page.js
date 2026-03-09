import { cookies } from 'next/headers'
import { authUtils } from '@/lib/auth-utils'
import { API_BASE_URL, DATATABLE_ENDPOINTS } from '@/lib/api-endpoint'
import LeadsPageClient from './client'
import { Suspense } from 'react'
import LeadPageSkeleton from './components/lead-page-skeleton'

async function getTables() {
  const cookieStore = await cookies()
  let headers = authUtils.getServerHeaders(cookieStore)
  let newAccessToken = null

  try {
    let response = await fetch(`${API_BASE_URL}${DATATABLE_ENDPOINTS.LIST}`, {
      headers,
      next: { revalidate: 0 }
    })

    console.log('Initial Fetch Status:', response.status, response.statusText)

    // Handle 401 Unauthorized - attempt server-side refresh
    if (response.status === 401) {
      const refreshToken = cookieStore.get('refreshToken')?.value
      if (refreshToken) {
        try {
          console.log('Attempting server-side token refresh...')
          const refreshData = await authUtils.serverRefresh(refreshToken)

          if (refreshData?.accessToken) {
            newAccessToken = refreshData.accessToken
            console.log('Refresh successful, retrying fetch with new token')

            // Retry with new token
            const retryHeaders = {
              ...headers,
              'Authorization': `Bearer ${newAccessToken}`
            }

            response = await fetch(`${API_BASE_URL}${DATATABLE_ENDPOINTS.LIST}`, {
              headers: retryHeaders,
              next: { revalidate: 0 }
            })
            console.log('Retry Fetch Status:', response.status, response.statusText)
          }
        } catch (refreshError) {
          console.error('Server-side token refresh failed:', refreshError)
        }
      }
    }

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