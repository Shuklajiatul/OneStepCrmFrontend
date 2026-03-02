import { cookies } from "next/headers"
import { authUtils } from "@/lib/auth-utils"
import { API_BASE_URL, FEATURE_ENDPOINTS } from "@/lib/api-endpoint"
import Client from "./client"

async function getData() {
  const cookieStore = await cookies()
  const headers = authUtils.getServerHeaders(cookieStore)

  try {
    const response = await fetch(`${API_BASE_URL}${FEATURE_ENDPOINTS.LIST}`, {
      headers,
      next: { revalidate: 0 } // Ensure fresh data on every request
    })

    if (!response.ok) {
      console.error(`Failed to fetch features: ${response.status} ${response.statusText}`)
      return []
    }

    const data = await response.json()
    // Normalizing data structure based on what featuresApi.getAll() handled
    return Array.isArray(data)
      ? data
      : data.data || data.features || []
  } catch (error) {
    console.error("Error fetching features in server component:", error)
    return []
  }
}

export default async function FeaturePage() {
  const initialFeatures = await getData()

  return <Client initialFeatures={initialFeatures} />
}