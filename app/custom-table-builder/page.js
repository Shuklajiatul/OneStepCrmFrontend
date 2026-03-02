import { cookies } from 'next/headers'
import { authUtils } from '@/lib/auth-utils'
import {
  API_BASE_URL,
  DATATABLE_ENDPOINTS,
  RECORD_ENDPOINTS,
} from '@/lib/api-endpoint'
import {
  mapBackendTableToFrontend,
  mapBackendRecordsToFrontend
} from '@/lib/utils'
import CustomTableBuilderClient from './client'

export const metadata = {
    title: 'SlashCRM | Custom Table Builder',
    description: 'Build and manage custom data structures with our flexible table builder.',
}

async function fetchJson(url, headers) {
  try {
    const res = await fetch(url, { headers, cache: 'no-store' })
    if (!res.ok) {
      console.error(`Fetch failed for ${url}: ${res.status} ${res.statusText}`)
      return { data: null, success: false }
    }
    return await res.json()
  } catch (error) {
    console.error(`Fetch error for ${url}:`, error)
    return { data: null, success: false }
  }
}

export default async function CustomTableBuilderPage({ searchParams }) {
  const cookieStore = await cookies()
  const headers = authUtils.getServerHeaders(cookieStore)

  const params = await searchParams
  const tableId = params?.tableId

  // Fetch all tables for the list view
  const tablesRes = await fetchJson(`${API_BASE_URL}${DATATABLE_ENDPOINTS.LIST}`, headers)

  let initialTables = []
  if (tablesRes && (tablesRes.success || tablesRes.status === 'success')) {
    const responseData = tablesRes.data
    let rawTables = []
    if (Array.isArray(responseData)) {
      rawTables = responseData
    } else if (responseData && Array.isArray(responseData.data)) {
      rawTables = responseData.data
    }
    initialTables = rawTables.map(mapBackendTableToFrontend)
  }

  let initialCurrentTable = null
  let initialRecords = []

  if (tableId) {
    // Fetch specific table, its columns and its records in parallel
    const [tableRes, columnsRes, recordsRes] = await Promise.all([
      fetchJson(`${API_BASE_URL}${DATATABLE_ENDPOINTS.GET_BY_ID(tableId)}`, headers),
      fetchJson(`${API_BASE_URL}${DATATABLE_ENDPOINTS.GET_COLUMNS(tableId)}`, headers),
      fetchJson(`${API_BASE_URL}${RECORD_ENDPOINTS.LIST(tableId)}`, headers)
    ])

    if (tableRes && (tableRes.success || tableRes.status === 'success')) {
      const backendTable = tableRes.data
      const columns = (columnsRes && (columnsRes.success || columnsRes.status === 'success'))
        ? (columnsRes.data || [])
        : []

      initialCurrentTable = mapBackendTableToFrontend({ ...backendTable, columns })

      if (recordsRes && (recordsRes.success || recordsRes.status === 'success')) {
        const recordsData = recordsRes.data
        let rawRecords = []
        if (Array.isArray(recordsData)) {
          rawRecords = recordsData
        } else if (recordsData && Array.isArray(recordsData.data)) {
          rawRecords = recordsData.data
        }

        initialRecords = mapBackendRecordsToFrontend(rawRecords, initialCurrentTable.columns)
        initialCurrentTable.rows = initialRecords
      }
    }
  }

  return (
    <CustomTableBuilderClient
      initialTables={initialTables}
      initialCurrentTable={initialCurrentTable}
      initialRecords={initialRecords}
    />
  )
}