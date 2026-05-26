import { cookies } from 'next/headers'
import { authUtils } from '@/lib/auth-utils'
import {
    API_BASE_URL,
    USER_ENDPOINTS,
    DATATABLE_ENDPOINTS,
    FORM_ENDPOINTS,
    ROLE_ENDPOINTS,
    GENE_ENDPOINTS,
    FEATURE_ENDPOINTS,
    POLICY_ENDPOINTS,
    ACTIVITY_ENDPOINTS,
    RECORD_ENDPOINTS,
} from '@/lib/api-endpoint'
import { extractArray } from '@/lib/utils'
import DashboardClient from './client'



async function fetchJson(url, headers, revalidate = 60) {
    try {
        const res = await fetch(url, { headers, next: { revalidate } })
        if (!res.ok) return null
        return await res.json()
    } catch {
        return null
    }
}

export default async function DashboardPage() {
    const cookieStore = await cookies()
    const headers = authUtils.getServerHeaders(cookieStore)
    const orgId = authUtils.getServerOrganizationId(cookieStore)

    // User data is now stored in localStorage (client-side only).
    // The DashboardClient hydrates the user on the client via authUtils.
    let currentUser = null

    // Fetch tables first — needed for forms & records lookups
    const tablesRaw = await fetchJson(`${API_BASE_URL}${DATATABLE_ENDPOINTS.LIST}`, headers)
    const tablesData = extractArray(tablesRaw, 'tables')

    // We only fetch details for the top 10 most active tables to optimize performance
    const activeTables = [...tablesData]
        .filter(t => t.is_active !== false)
        .sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at))

    const tablesToFetchDetail = activeTables.slice(0, 10)

    // Fetch all other data in parallel
    const [usersRaw, rolesRaw, genesRaw, featuresRaw, policiesRaw, activitiesRaw] = await Promise.all([
        fetchJson(`${API_BASE_URL}${USER_ENDPOINTS.LIST}`, headers),
        fetchJson(`${API_BASE_URL}${ROLE_ENDPOINTS.LIST}`, headers),
        fetchJson(`${API_BASE_URL}${GENE_ENDPOINTS.LIST}`, headers),
        fetchJson(`${API_BASE_URL}${FEATURE_ENDPOINTS.LIST}`, headers),
        fetchJson(`${API_BASE_URL}${POLICY_ENDPOINTS.LIST}`, headers),
        fetchJson(`${API_BASE_URL}${ACTIVITY_ENDPOINTS.LIST_BY_ORGANIZATION}`, headers, 0), // Activities should be fresh
    ])

    // Dynamically fetch forms AND records from the most active tables in parallel
    const [formResults, recordResults] = tablesToFetchDetail.length > 0 && orgId
        ? await Promise.all([
            Promise.all(
                tablesToFetchDetail.map(table => {
                    const tId = table.table_id || table.id
                    return fetchJson(`${API_BASE_URL}${FORM_ENDPOINTS.LIST(orgId, tId)}`, headers)
                        .then(raw => Array.isArray(raw?.data) ? raw.data : [])
                })
            ),
            Promise.all(
                tablesToFetchDetail.map(table => {
                    const tId = table.table_id || table.id
                    return fetchJson(`${API_BASE_URL}${RECORD_ENDPOINTS.LIST(tId)}`, headers)
                        .then(raw => {
                            const records = Array.isArray(raw?.data) ? raw.data : Array.isArray(raw) ? raw : []
                            return records.map(r => ({ ...r, _source_table_id: tId, _source_table_name: table.table_name || table.name }))
                        })
                })
            )
        ])
        : [[], []]

    // Latest 5 leads across all tables
    const leadsData = recordResults
        .flat()
        .filter(r => r.created_at)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 5)

    // Process Users
    const usersData = extractArray(usersRaw)
    const usersCount = usersData.length
    const uMap = {}
    usersData.forEach(user => {
        const userId = user.user_id || user.id || user._id
        if (userId) {
            uMap[userId] = {
                name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email || 'Unknown',
                avatar: user.avatar_url,
                email: user.email,
                role_id: user.role_id,
                reporting_id: user.reporting_id
            }
        }
    })

    // Process Forms — deduplicate by form_id across all tables, keep most recently active version
    const allFormsFlat = formResults.flat()
    const uniqueFormsMap = new Map()
    allFormsFlat.forEach(f => {
        const fId = f.form_id || f.id
        const fActivity = new Date(f.updated_at || f.created_at)
        const existing = uniqueFormsMap.get(fId)
        const existingActivity = existing ? new Date(existing.updated_at || existing.created_at) : new Date(0)
        if (!existing || fActivity > existingActivity) {
            uniqueFormsMap.set(fId, f)
        }
    })
    console.log("uniqueFormsMap", uniqueFormsMap);
    const sortedForms = [...uniqueFormsMap.values()]
        .sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at))
        .slice(0, 5)
    const formsCount = uniqueFormsMap.size

    // Process Tables - filter active tables and sort by most recent activity
    const tablesCount = tablesData.length
    const sortedTables = [...tablesData]
        .filter(t => t.is_active !== false) // Only show active tables
        .sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at))
        .slice(0, 5)

    // Process Roles
    const rolesData = extractArray(rolesRaw, 'roles')
    const rolesCount = rolesData.length
    const rolesWithUsers = rolesData.map(role => {
        const roleId = role.role_id || role.id
        const usersInRole = usersData.filter(u => (u.role_id || u.roles?.[0]) === roleId)
        return { ...role, userCount: usersInRole.length, users: usersInRole }
    })

    // Process Genes
    const genesData = extractArray(genesRaw, 'genes')

    // Process Features
    const featuresData = extractArray(featuresRaw)

    // Process Policies
    const policiesData = extractArray(policiesRaw, 'policies')



    // Team Members (moved to client side because currentUser is in localStorage)

    // Chart Data
    const chartData = [
        { name: 'Users', value: usersCount, color: '#3b82f6' },
        { name: 'Forms', value: formsCount, color: '#10b981' },
        { name: 'Tables', value: tablesCount, color: '#f59e0b' },
        { name: 'Roles', value: rolesCount, color: '#8b5cf6' },
        { name: 'Genes', value: genesData.length, color: '#ec4899' },
    ]

    // Stats
    const stats = {
        users: usersCount,
        forms: formsCount,
        tables: tablesCount,
        roles: rolesCount,
        genes: genesData.length,
        features: featuresData.length,
    }

    // Activities - aggregate from forms, tables, leads, and CRM activities
    // NOTE: Icon components cannot be passed as server-to-client props (not serializable).
    // We pass an iconKey string and resolve to the actual icon in the client component.
    const activitiesData = Array.isArray(activitiesRaw?.data)
        ? activitiesRaw.data
        : Array.isArray(activitiesRaw) ? activitiesRaw : []

    const allActivities = [
        ...sortedForms.map(f => ({ id: `form-${f.form_id}-${f.version || 1}`, title: 'Form Created', desc: `New form "${f.form_name}" is now live`, time: f.created_at, iconKey: 'FileText', color: 'text-emerald-500', bg: 'bg-emerald-50' })),
        ...tablesData.filter(t => t.created_at).slice(0, 5).map(t => ({ id: `table-${t.table_id}`, title: 'Table Added', desc: `Schema "${t.table_name}" was initialized`, time: t.created_at, iconKey: 'Database', color: 'text-amber-500', bg: 'bg-amber-50' })),
        ...leadsData.filter(l => l.created_at).map(l => ({ id: `lead-${l.record_id}`, title: 'Lead Captured', desc: `New record received`, time: l.created_at, iconKey: 'Zap', color: 'text-indigo-500', bg: 'bg-indigo-50' })),
        ...activitiesData.filter(a => a.created_at || a.updated_at).slice(0, 10).map(a => {
            const type = (a.activity_type || 'task').toLowerCase()
            let iconKey = 'Flag', color = 'text-blue-500', bg = 'bg-blue-50'
            if (type === 'call') { iconKey = 'Activity'; color = 'text-green-500'; bg = 'bg-green-50' }
            else if (type === 'meeting') { iconKey = 'CalendarCheck'; color = 'text-purple-500'; bg = 'bg-purple-50' }
            else if (type === 'email') { iconKey = 'Bell'; color = 'text-amber-500'; bg = 'bg-amber-50' }
            return { id: `activity-${a.activity_id}`, title: a.title || 'New Activity', desc: `${type.charAt(0).toUpperCase() + type.slice(1)} assigned to ${uMap[a.assigned_to]?.name || 'User'}`, time: a.created_at || a.updated_at, iconKey, color, bg }
        })
    ].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 15)

    const upcomingActivities = activitiesData
        .filter(a => !a.completed && new Date(a.due_date) >= new Date())
        .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
        .slice(0, 5)

    return (
        <DashboardClient
            initialStats={stats}
            initialRecentForms={sortedForms}
            initialRecentTables={sortedTables}
            initialRecentLeads={leadsData}
            initialUserMap={uMap}
            initialActivities={allActivities}
            initialGenes={genesData}
            initialPolicies={policiesData}
            initialRoles={rolesWithUsers}
            initialTeamMembers={[]} 
            initialChartData={chartData}
            initialUpcomingActivities={upcomingActivities}
            initialCurrentUser={currentUser}
            initialAllUsers={usersData}
            initialActiveTables={activeTables}
        />
    )
}
