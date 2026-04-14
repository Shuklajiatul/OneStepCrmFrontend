import { cookies } from "next/headers"
import { authUtils } from "@/lib/auth-utils"
import { API_BASE_URL, FORM_ENDPOINTS, SUBMISSION_ENDPOINTS } from "@/lib/api-endpoint"
import FormSubmissionsClient from "./client"

export const metadata = {
  title: "Form Submissions | SlashCRM",
  description: "View and manage form submissions",
}


export default async function FormSubmissionsPage({ params, searchParams }) {
  const { formId } = await params
  const { table_id } = await searchParams

  const cookieStore = await cookies()
  const headers = authUtils.getServerHeaders(cookieStore)
  const orgId = authUtils.getServerOrganizationId(cookieStore)
  const tableId = table_id

  let formDetails = null
  let submissions = []

  if (orgId && tableId) {
    try {
      const [formRes, subsRes] = await Promise.all([
        fetch(
          `${API_BASE_URL}${FORM_ENDPOINTS.GET_BY_ID(orgId, tableId, formId)}`,
          { headers, cache: "no-store" }
        ),
        fetch(
          `${API_BASE_URL}${SUBMISSION_ENDPOINTS.ALL(orgId, formId)}`,
          { headers, cache: "no-store" }
        ),
      ])
  
      if (formRes.ok) {
        const formJson = await formRes.json()
        formDetails = formJson?.data || formJson || null
      }
  
      if (subsRes.ok) {
        const subsJson = await subsRes.json()
        if (Array.isArray(subsJson)) {
          submissions = subsJson
        } else if (Array.isArray(subsJson?.data)) {
          submissions = subsJson.data
        } else if (Array.isArray(subsJson?.submissions)) {
          submissions = subsJson.submissions
        }
      }
    } catch (error) {
      console.error("Failed to fetch form submissions data:", error)
    }
  }

  return (
    <FormSubmissionsClient
      formId={formId}
      tableId={tableId || formDetails?.table_id}
      initialFormDetails={formDetails}
      initialSubmissions={submissions}
    />
  )
}