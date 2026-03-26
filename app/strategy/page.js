import { cookies } from 'next/headers'
import { authUtils } from '@/lib/auth-utils'
import { API_BASE_URL, DATATABLE_ENDPOINTS } from '@/lib/api-endpoint'
import StrategyPageClient from './client'
import { Suspense } from 'react'
import { PageBreadcrumb } from "@/components/page-breadcrumb"

async function getTables() {
  const cookieStore = await cookies()

  try {
    const { result: response, newAccessToken } = await authUtils.executeWithRefresh(cookieStore, async (headers) => {
      return fetch(`${API_BASE_URL}${DATATABLE_ENDPOINTS.LIST}`, {
        headers,
        next: { revalidate: 0 }
      });
    });

    if (!response.ok) {
      return { tables: [], newAccessToken }
    }

    const data = await response.json()
    let tables = []

    if (Array.isArray(data)) {
      tables = data
    } else if (data?.data && Array.isArray(data.data)) {
      tables = data.data
    } else if (data?.tables && Array.isArray(data.tables)) {
      tables = data.tables
    }

    return { tables, newAccessToken }
  } catch (error) {
    console.error('Error fetching tables in StrategyPage:', error)
    return { tables: [], newAccessToken: null }
  }
}

export default async function StrategyPage() {
  const { tables, newAccessToken } = await getTables()

  return (
    <div className="flex flex-col h-screen overflow-hidden p-0 md:p-0">
      <div className="px-0 pt-0 pb-0 shrink-0">
        <PageBreadcrumb />
      </div>
      <Suspense fallback={
        <div className="flex items-center justify-center flex-1">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      }>
        <StrategyPageClient initialTables={tables} newAccessToken={newAccessToken} />
      </Suspense>
    </div>
  )
}
