import { cookies } from 'next/headers'
import { authUtils } from '@/lib/auth-utils'
import { API_BASE_URL, DATATABLE_ENDPOINTS } from '@/lib/api-endpoint'
import LeadsPageClient from './client'
import { Suspense } from 'react'

async function getTables() {
  try {
    const cookieStore = await cookies()
    const headers = authUtils.getServerHeaders(cookieStore)

    const response = await fetch(`${API_BASE_URL}${DATATABLE_ENDPOINTS.LIST}`, {
      headers,
      next: { revalidate: 0 }
    })
    console.log('Fetch URL:', `${API_BASE_URL}${DATATABLE_ENDPOINTS.LIST}`)
    console.log('Fetch Response Status:', response.status, response.statusText)

    if (!response.ok) {
      console.error('Failed to fetch tables in server component:', response.status, response.statusText)
      try {
        const errorData = await response.json()
        console.error('Error details:', errorData)
      } catch (e) {
        console.error('Could not parse error response body as JSON')
        try {
          const textData = await response.text()
          console.error('Error text body:', textData)
        } catch (textErr) {
          console.error('Could not read error response body at all')
        }
      }
      return []
    }

    const data = await response.json()

    // Handle different response formats exactly like the old client
    if (Array.isArray(data)) {
      return data
    } else if (data?.data && Array.isArray(data.data)) {
      return data.data
    } else if (data?.tables && Array.isArray(data.tables)) {
      return data.tables
    }
    return []
  } catch (error) {
    console.error('Error fetching tables:', error)
    return []
  }
}

export default async function LeadsPage() {
  const initialTables = await getTables()

  return (
    <Suspense fallback={<div>Loading data...</div>}>
      <LeadsPageClient initialTables={initialTables} />
    </Suspense>
  )
}