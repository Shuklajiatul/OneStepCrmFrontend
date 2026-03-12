import { cookies } from 'next/headers'
import MigratorClient from './client'
import { API_BASE_URL, DATATABLE_ENDPOINTS } from '@/lib/api-endpoint'
import { authUtils } from '@/lib/auth-utils'
import { extractArray } from '@/lib/utils'

async function getTables() {
    const cookieStore = await cookies()
    const headers = authUtils.getServerHeaders(cookieStore)

    try {
        const res = await fetch(`${API_BASE_URL}${DATATABLE_ENDPOINTS.LIST}`, {
            headers,
            next: { revalidate: 60 }
        })

        if (!res.ok) {
            console.warn('Failed to fetch tables on server:', res.status, res.statusText)
            return []
        }

        const data = await res.json()
        // Standardize data extraction based on common patterns in the project
        if (data.success && Array.isArray(data.data)) return data.data
        if (Array.isArray(data.data)) return data.data
        if (Array.isArray(data)) return data

        return []
    } catch (error) {
        console.warn('SSR Tables Fetch Error:', error.message)
        return []
    }
}

export default async function MigratorPage() {
    const tables = await getTables()

    return (
        <MigratorClient initialTables={tables} />
    )
}
