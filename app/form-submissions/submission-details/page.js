import { cookies } from "next/headers"
import { authUtils } from "@/lib/auth-utils"
import {
  API_BASE_URL,
  DATATABLE_ENDPOINTS,
  USER_ENDPOINTS,
  FORM_ENDPOINTS,
  SUBMISSION_ENDPOINTS,
  RECORD_ENDPOINTS,
} from "@/lib/api-endpoint"
import SubmissionDetailsClient from "./client"

export const metadata = {
  title: "Submission Details | SlashCRM",
  description: "View submission details",
}

export default async function SubmissionDetailsPage({ searchParams }) {
  const { form_id, submission_id, table_id } = await searchParams

  const cookieStore = await cookies()
  const headers = authUtils.getServerHeaders(cookieStore)
  const orgId = authUtils.getServerOrganizationId(cookieStore)

  let form = null
  let record = null
  let submissionData = null
  let users = []
  let history = []

  // Start with query param, fall back to env, then tables list
  let resolvedTableId =
    table_id && table_id !== "undefined" && table_id !== "null"
      ? table_id
      : (process.env.NEXT_PUBLIC_TABLE_ID || null)

  try {
    // Fetch tables first so we can resolve a fallback table id
    const tablesRes = await fetch(`${API_BASE_URL}${DATATABLE_ENDPOINTS.LIST}`, { headers, cache: "no-store" })
    const tablesJson = tablesRes.ok ? await tablesRes.json() : null
    const tables =
      Array.isArray(tablesJson)
        ? tablesJson
        : (tablesJson?.data?.data || tablesJson?.data || tablesJson?.tables || [])

    if (!resolvedTableId) resolvedTableId = tables?.[0]?.table_id || null

    const [usersRes, formRes, subsRes] = await Promise.all([
      fetch(`${API_BASE_URL}${USER_ENDPOINTS.LIST}`, { headers, cache: "no-store" }),
      (orgId && resolvedTableId && form_id)
        ? fetch(`${API_BASE_URL}${FORM_ENDPOINTS.GET_BY_ID(orgId, resolvedTableId, form_id)}`, { headers, cache: "no-store" })
        : Promise.resolve(null),
      (orgId && form_id)
        ? fetch(`${API_BASE_URL}${SUBMISSION_ENDPOINTS.ALL(orgId, form_id)}`, { headers, cache: "no-store" })
        : Promise.resolve(null),
    ])

    const usersJson = usersRes.ok ? await usersRes.json() : null
    users = Array.isArray(usersJson) ? usersJson : (usersJson?.data?.data || usersJson?.data || [])

    const formJson = formRes?.ok ? await formRes.json() : null
    form = formJson?.data?.data || formJson?.data || formJson || null

    const subsJson = subsRes?.ok ? await subsRes.json() : null
    const allSubs =
      Array.isArray(subsJson)
        ? subsJson
        : (subsJson?.data?.data || subsJson?.data || subsJson || [])

    const currentSub = Array.isArray(allSubs)
      ? allSubs.find((s) => s.submission_id === submission_id)
      : null

    submissionData = currentSub || null

    const actualRecordId = currentSub?.record_id || currentSub?.id || submission_id
    const actualTableId = currentSub?.table_id || form?.table_id || resolvedTableId
    resolvedTableId = actualTableId || resolvedTableId

    if (actualTableId && actualRecordId) {
      const [recordRes, historyRes] = await Promise.all([
        fetch(`${API_BASE_URL}${RECORD_ENDPOINTS.GET_BY_ID(actualTableId, actualRecordId)}`, { headers, cache: "no-store" }),
        fetch(`${API_BASE_URL}${RECORD_ENDPOINTS.GET_HISTORY(actualTableId, actualRecordId)}`, { headers, cache: "no-store" }),
      ])

      const recordJson = recordRes.ok ? await recordRes.json() : null
      record = recordJson?.data?.data || recordJson?.data || recordJson || null

      const historyJson = historyRes.ok ? await historyRes.json() : null
      history = Array.isArray(historyJson) ? historyJson : (historyJson?.data?.data || historyJson?.data || [])
    }
  } catch (error) {
    console.error("Failed to fetch submission details:", error)
  }

  return (
    <SubmissionDetailsClient
      formId={form_id}
      submissionId={submission_id}
      tableId={resolvedTableId}
      initialForm={form}
      initialRecord={record}
      initialSubmissionData={submissionData}
      initialUsers={users}
      initialHistory={history}
    />
  )
}