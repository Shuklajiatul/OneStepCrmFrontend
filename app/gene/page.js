import { cookies } from 'next/headers'
import GeneClient from './client'
import { API_BASE_URL } from '@/lib/api-endpoint'
import { authUtils } from '@/lib/auth-utils'
import { extractArray } from '@/lib/utils'

async function getData() {
    const cookieStore = await cookies()
    const headers = authUtils.getServerHeaders(cookieStore)

    try {
        const res = await fetch(`${API_BASE_URL}/api/genes`, {
            headers,
            next: { revalidate: 60 }
        })

        if (!res.ok) {
            console.error(`Failed to fetch genes: ${res.status} ${res.statusText}`)
            return { genes: [], pagination: null }
        }

        const data = await res.json()

        if (!data.success || !data.data) {
            return { genes: [], pagination: null }
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
                createdBy: gene.created_by || 'Unknown',
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
            pagination: data.pagination || null
        }
    } catch (error) {
        console.error('SSR Data Fetch Error:', error)
        return { genes: [], pagination: null }
    }
}

export default async function GenePage() {
    const data = await getData()

    return (
        <GeneClient
            initialGenes={data.genes}
            initialPagination={data.pagination}
        />
    )
}
