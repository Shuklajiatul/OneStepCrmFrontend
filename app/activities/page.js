import { cookies } from 'next/headers'
import ActivitiesClient from './client'
import { API_BASE_URL, ACTIVITY_ENDPOINTS, USER_ENDPOINTS, DATATABLE_ENDPOINTS } from '@/lib/api-endpoint'
import { authUtils } from '@/lib/auth-utils'
import { extractArray } from '@/lib/utils'

async function getData() {
    const cookieStore = await cookies()
    const headers = authUtils.getServerHeaders(cookieStore)

    try {
        const [activitiesRes, usersRes, tablesRes] = await Promise.all([
            fetch(`${API_BASE_URL}${ACTIVITY_ENDPOINTS.LIST_BY_ORGANIZATION}`, {
                headers,
                next: { revalidate: 0 }
            }),
            fetch(`${API_BASE_URL}${USER_ENDPOINTS.LIST}`, {
                headers,
                next: { revalidate: 3600 }
            }),
            fetch(`${API_BASE_URL}${DATATABLE_ENDPOINTS.LIST}`, {
                headers,
                next: { revalidate: 3600 }
            })
        ])

        const activitiesDataRaw = activitiesRes.ok ? await activitiesRes.json() : []
        const usersDataRaw = usersRes.ok ? await usersRes.json() : []
        const tablesDataRaw = tablesRes.ok ? await tablesRes.json() : []

        const data = {
            activities: extractArray(activitiesDataRaw),
            users: extractArray(usersDataRaw),
            tables: extractArray(tablesDataRaw)
        }

        return data
    } catch (error) {
        console.error('Activities SSR Data Fetch Error:', error)
        return { activities: [], users: [], tables: [] }
    }
}

export default async function ActivitiesPage() {
    const data = await getData()

    return (
        <ActivitiesClient
            initialActivities={data.activities}
            initialUsers={data.users}
            initialRoles={[]}
            initialGenes={[]}
            initialTables={data.tables}
        />
    )
}
