import { cookies } from 'next/headers'
import UsersClient from './client'
import { API_BASE_URL, USER_ENDPOINTS, ROLE_ENDPOINTS, GENE_ENDPOINTS, POLICY_ENDPOINTS } from '@/lib/api-endpoint'
import { authUtils } from '@/lib/auth-utils'
import { extractArray } from '@/lib/utils'

async function getData() {
  const cookieStore = await cookies()
  const headers = authUtils.getServerHeaders(cookieStore)

  try {
    const [usersRes, rolesRes, genesRes, policiesRes] = await Promise.all([
      fetch(`${API_BASE_URL}${USER_ENDPOINTS.LIST}`, {
        headers,
        next: { revalidate: 60 }
      }),
      fetch(`${API_BASE_URL}${ROLE_ENDPOINTS.LIST}`, {
        headers,
        next: { revalidate: 3600 }
      }),
      fetch(`${API_BASE_URL}${GENE_ENDPOINTS.LIST}`, {
        headers,
        next: { revalidate: 3600 }
      }),
      fetch(`${API_BASE_URL}${POLICY_ENDPOINTS.LIST}`, {
        headers,
        next: { revalidate: 3600 }
      })
    ])

    const usersData = usersRes.ok ? await usersRes.json() : []
    const rolesData = rolesRes.ok ? await rolesRes.json() : []
    const genesData = genesRes.ok ? await genesRes.json() : []
    const policiesData = policiesRes.ok ? await policiesRes.json() : []

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