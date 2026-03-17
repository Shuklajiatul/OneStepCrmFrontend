import { cookies } from 'next/headers'
import { authUtils } from '@/lib/auth-utils'
import { API_BASE_URL, DATATABLE_ENDPOINTS, RECORD_ENDPOINTS, USER_ENDPOINTS, ACTIVITY_ENDPOINTS } from '@/lib/api-endpoint'
import RecordDetailsClient from './client'
import RecordDetailsSkeleton from './record-details-skeleton'
import { Suspense } from 'react'

async function getRecordDetailsData(tableId, recordId) {
    if (!tableId || !recordId) return null

    try {
        const cookieStore = await cookies();

        const { result: responses, newAccessToken } = await authUtils.executeWithRefresh(cookieStore, async (headers) => {
            const fetchOptions = { headers, next: { revalidate: 0 } }
            return Promise.all([
                fetch(`${API_BASE_URL}${RECORD_ENDPOINTS.GET_BY_ID(tableId, recordId)}`, fetchOptions),
                fetch(`${API_BASE_URL}${DATATABLE_ENDPOINTS.GET_COLUMNS(tableId)}`, fetchOptions),
                fetch(`${API_BASE_URL}${USER_ENDPOINTS.LIST}`, fetchOptions),
                fetch(`${API_BASE_URL}${RECORD_ENDPOINTS.GET_HISTORY(tableId, recordId)}`, fetchOptions),
                fetch(`${API_BASE_URL}${ACTIVITY_ENDPOINTS.LIST_BY_ORGANIZATION}`, fetchOptions)
            ])
        });

        console.log("Record details server responses:", responses.map(res => ({ url: res.url, status: res.status })));

        // Parse JSON responses
        const [recordData, columnsData, usersData, historyData, activitiesData] = await Promise.all(
            responses.map(res => res.ok ? res.json() : null)
        )

        // Process Record
        const initialRecord = recordData?.data?.data || recordData?.data || recordData || null
        // Process Columns
        const initialColumns = columnsData?.data?.data || columnsData?.data || columnsData || []

        // Process Users
        const initialUsers = Array.isArray(usersData) ? usersData : (usersData?.data?.data || usersData?.data || [])

        // Process History
        const initialHistory = historyData?.data?.data || historyData?.data || historyData || []

        // Process Activities
        const allActivities = activitiesData?.data?.data || activitiesData?.data || activitiesData || []
        const initialActivities = allActivities.filter(activity =>
            String(activity.related_table_id) === String(tableId) &&
            String(activity.related_record_id) === String(recordId)
        )

        return {
            initialRecord,
            initialColumns,
            initialUsers,
            initialHistory,
            initialActivities,
            newAccessToken
        }

    } catch (error) {
        console.error('Error fetching record details:', error)
        return null
    }
}

export default async function RecordDetailsPage({ searchParams }) {
    const awaitedSearchParams = await searchParams

    const tableId = awaitedSearchParams?.table_id || searchParams?.table_id
    const recordId = awaitedSearchParams?.record_id || searchParams?.record_id

    const data = await getRecordDetailsData(tableId, recordId)

    if (!data) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen">
                <p className="text-lg font-medium text-destructive">Failed to load record configuration.</p>
            </div>
        )
    }

    return (
        <Suspense fallback={<RecordDetailsSkeleton />}>
            <RecordDetailsClient
                tableId={tableId}
                recordId={recordId}
                initialRecord={data.initialRecord}
                initialColumns={data.initialColumns}
                initialUsers={data.initialUsers}
                initialHistory={data.initialHistory}
                initialActivities={data.initialActivities}
                newAccessToken={data.newAccessToken}
            />
        </Suspense>
    )
}
