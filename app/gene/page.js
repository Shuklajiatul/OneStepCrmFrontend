import { cookies } from 'next/headers'
import GeneClient from './client'
import { API_BASE_URL } from '@/lib/api-endpoint'
import { authUtils } from '@/lib/auth-utils'
import { extractArray } from '@/lib/utils'

async function getOrganizations(headers) {
    try {
        const res = await fetch(`${API_BASE_URL}/api/organizations`, {
            headers,
            next: { revalidate: 3600 } // Cache for 1 hour
        })

        if (!res.ok) return []
        const data = await res.json()
        
        let orgsData = []
        if (Array.isArray(data)) orgsData = data
        else if (data.success && data.data) orgsData = data.data
        else if (data.data && Array.isArray(data.data)) orgsData = data.data
        else if (data.organizations && Array.isArray(data.organizations)) orgsData = data.organizations
        
        return orgsData
    } catch (error) {
        console.error('SSR Organizations Fetch Error:', error)
        return []
    }
}

async function getUsers(headers) {
    try {
        const res = await fetch(`${API_BASE_URL}/api/users`, {
            headers,
            next: { revalidate: 300 } // Cache for 5 minutes
        })

        if (!res.ok) return []
        const data = await res.json()

        let usersData = []
        if (Array.isArray(data)) usersData = data
        else if (data.success && data.data) usersData = data.data
        else if (data.data && Array.isArray(data.data)) usersData = data.data
        else if (data.users && Array.isArray(data.users)) usersData = data.users

        // Normalize users
        return usersData.map(user => {
            const firstName = user.first_name || '';
            const lastName = user.last_name || '';
            const fullName = `${firstName} ${lastName}`.trim();
            const displayName = fullName || user.username || user.email || user.id || user.user_id || 'Unknown';
            
            return {
                ...user,
                id: user.id || user.user_id,
                username: user.username || user.email || displayName,
                name: user.name || displayName
            }
        })
    } catch (error) {
        console.error('SSR Users Fetch Error:', error)
        return []
    }
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

async function getData() {
    const cookieStore = await cookies();

    try {
        const { result, newAccessToken } = await authUtils.executeWithRefresh(cookieStore, async (headers) => {
            const fetchOptions = { headers, cache: 'no-store' }
            return Promise.all([
                fetch(`${API_BASE_URL}/api/genes`, fetchOptions),
                getOrganizations(headers),
                getUsers(headers)
            ]);
        });

        const [genesRes, organizations, users] = result;

        if (!genesRes.ok) {
            console.error(`Failed to fetch genes: ${genesRes.status} ${genesRes.statusText}`)
            return { genes: [], pagination: null, organizations, users, newAccessToken }
        }

        const data = await genesRes.json()

        if (!data.success || !data.data) {
            return { genes: [], pagination: null, organizations, users, newAccessToken }
        }

        // Create user name map for mapping created_by to names
        const userMap = {}
        if (Array.isArray(users)) {
            users.forEach(user => {
                const id = user.id || user.user_id;
                if (id) {
                    userMap[String(id)] = user.name || user.username || 'Unknown'
                }
            })
        }

        const apiGenes = data.data || []

        // Transform API data to match component structure
        const transformedGenes = apiGenes.map(gene => {
            const levels = []
            if (gene.hierarchy_level && typeof gene.hierarchy_level === 'object') {
                Object.entries(gene.hierarchy_level).forEach(([key, value]) => {
                    const levelNum = key.replace(/[^0-9]/g, '')
                    if (levelNum) {
                        levels.push({
                            id: parseInt(levelNum),
                            title: value,
                            members: 0
                        })
                    }
                })
                levels.sort((a, b) => a.id - b.id)
            }

            const usersCount = gene.users ? (Array.isArray(gene.users) ? gene.users.length : 0) : 0
            const organizationsCount = gene.organizations ? (Array.isArray(gene.organizations) ? gene.organizations.length : 0) : 0

            // Safely look up created_by name in userMap or from existing details
            let createdByName = 'Unknown';
            if (gene.created_by_details) {
              const u = gene.created_by_details.user_data || gene.created_by_details;
              const fName = u.first_name || '';
              const lName = u.last_name || '';
              const fullName = `${fName} ${lName}`.trim();
              createdByName = fullName || u.name || u.username || u.email || 'Unknown';
            } else if (gene.created_by_name) {
              createdByName = gene.created_by_name;
            } else if (gene.created_by && typeof gene.created_by === 'object') {
              const u = gene.created_by;
              const fName = u.first_name || '';
              const lName = u.last_name || '';
              const fullName = `${fName} ${lName}`.trim();
              createdByName = fullName || u.name || u.username || u.email || 'Unknown';
            } else if (gene.created_by) {
              createdByName = userMap[String(gene.created_by)] || gene.created_by_name || gene.created_by;
            }

            return {
                id: gene.g_id,
                name: gene.g_name || 'Unnamed Gene',
                type: 'Gene',
                totalMembers: organizationsCount,
                hierarchyLevels: gene.level_depth || levels.length,
                users: usersCount,
                usersArray: gene.users || [],
                lastUpdated: new Date(gene.updated_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                }),
                completion: 100,
                createdBy: createdByName,
                createdById: gene.created_by,
                levels: levels,
                createdAt: gene.created_at,
                hierarchy_level: gene.hierarchy_level,
                level_depth: gene.level_depth,
                g_id: gene.g_id,
                g_name: gene.g_name,
                organizations: gene.organizations || [],
                is_active: gene.is_active
            }
        })

        return {
            genes: transformedGenes,
            pagination: data.pagination || null,
            organizations,
            users,
            newAccessToken
        }
    } catch (error) {
        console.error('SSR Data Fetch Error:', error)
        return { genes: [], pagination: null, organizations: [], users: [], newAccessToken: null }
    }
}

export default async function GenePage() {
    const data = await getData()
    return (
        <GeneClient
            initialGenes={data.genes}
            initialPagination={data.pagination}
            initialOrganizations={data.organizations}
            initialUsers={data.users}
            newAccessToken={data.newAccessToken}
        />
    )
}
