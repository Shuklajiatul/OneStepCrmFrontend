import { cookies } from 'next/headers'
import UsersClient from './client'

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
    const [usersRes, rolesRes, genesRes, policiesRes] = await Promise.all([
      fetch(`${baseUrl}/api/users`, {
        headers,
        next: { revalidate: 60 } // Cache users for 60 seconds
      }),
      fetch(`${baseUrl}/api/roles`, {
        headers,
        next: { revalidate: 3600 } // Cache roles for 1 hour
      }),
      fetch(`${baseUrl}/api/genes`, {
        headers,
        next: { revalidate: 3600 } // Cache genes for 1 hour
      }),
      fetch(`${baseUrl}/api/policies`, {
        headers,
        next: { revalidate: 3600 } // Cache policies for 1 hour
      })
    ])

    const usersData = usersRes.ok ? await usersRes.json() : []
    const rolesData = rolesRes.ok ? await rolesRes.json() : []
    const genesData = genesRes.ok ? await genesRes.json() : []
    const policiesData = policiesRes.ok ? await policiesRes.json() : []

    // Helper to extract array from response
    const extractArray = (data, key) => {
      if (Array.isArray(data)) return data
      if (data && Array.isArray(data.data)) return data.data
      if (data && key && Array.isArray(data[key])) return data[key]
      return []
    }

    // Filter genes mapped to users (replicating client-side logic)
    const users = extractArray(usersData)
    const allGenes = extractArray(genesData, 'genes')

    // Extract all unique gene IDs that are mapped to users
    const mappedGeneIds = new Set()
    users.forEach((user) => {
      if (user["g_ids"]) {
        if (Array.isArray(user["g_ids"])) {
          user["g_ids"].forEach((gId) => {
            if (gId) mappedGeneIds.add(String(gId))
          })
        } else if (user["g_ids"]) {
          mappedGeneIds.add(String(user["g_ids"]))
        }
      }
    })

    const mappedGenes = allGenes.filter((gene) => {
      const geneId = String(gene.g_id || gene.id || "")
      return mappedGeneIds.has(geneId)
    })

    return {
      users,
      roles: extractArray(rolesData, 'roles'),
      genes: mappedGenes,
      policies: extractArray(policiesData, 'policies')
    }
  } catch (error) {
    console.error('SSR Data Fetch Error:', error)
    return { users: [], roles: [], genes: [], policies: [] }
  }
}

export default async function UsersPage() {
  const data = await getData()

  return (
    <UsersClient
      initialUsers={data.users}
      initialRoles={data.roles}
      initialGenes={data.genes}
      initialPolicies={data.policies}
    />
  )
}