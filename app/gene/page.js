import { cookies } from 'next/headers'
import GeneClient from './client'

async function getData() {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get('accessToken')?.value || cookieStore.get('token')?.value

  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(accessToken && { 'Authorization': `Bearer ${accessToken}` })
  }

  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://10.10.15.194:3001'

  try {
    const res = await fetch(`${baseUrl}/api/genes`, {
      headers,
      next: { revalidate: 60 } // Cache genes for 60 seconds
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

    // Transform API data to match component structure (replicating client-side logic)
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
