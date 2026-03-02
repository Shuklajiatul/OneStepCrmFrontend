import { cookies } from 'next/headers'
import FormAnalyticsClient from './client'
import { API_BASE_URL, DATATABLE_ENDPOINTS, FORM_ENDPOINTS, SUBMISSION_ENDPOINTS } from '@/lib/api-endpoint'
import { authUtils } from '@/lib/auth-utils'
import { extractArray } from '@/lib/utils'


async function getTables(headers) {
  try {
    const res = await fetch(`${API_BASE_URL}${DATATABLE_ENDPOINTS.LIST}`, {
      headers,
      next: { revalidate: 60 }
    })

    if (!res.ok) {
      console.error('SSR Tables Fetch Error:', res.status, res.statusText)
      return []
    }

    const data = await res.json()
    return extractArray(data, 'tables')
  } catch (error) {
    console.error('SSR Tables Fetch Exception:', error)
    return []
  }
}

async function getForms(headers, orgId, tableId) {
  try {
    const res = await fetch(`${API_BASE_URL}${FORM_ENDPOINTS.LIST(orgId, tableId)}`, {
      headers,
      next: { revalidate: 60 }
    })

    if (!res.ok) {
      console.error(`SSR Forms Fetch Error for table ${tableId}:`, res.status, res.statusText)
      return []
    }

    const data = await res.json()
    const forms = extractArray(data)
    return forms.map(f => ({ ...f, table_id: tableId }))
  } catch (error) {
    console.error(`SSR Forms Fetch Exception for table ${tableId}:`, error)
    return []
  }
}

async function getSubmissions(headers, orgId, formId) {
  try {
    const res = await fetch(`${API_BASE_URL}${SUBMISSION_ENDPOINTS.ALL(orgId, formId)}`, {
      headers,
      next: { revalidate: 60 }
    })

    if (!res.ok) {
      console.error(`SSR Submissions Fetch Error for form ${formId}:`, res.status, res.statusText)
      return []
    }

    const data = await res.json()
    return extractArray(data)
  } catch (error) {
    console.error(`SSR Submissions Fetch Exception for form ${formId}:`, error)
    return []
  }
}

export default async function FormAnalyticsPage() {
  const cookieStore = await cookies()
  const headers = authUtils.getServerHeaders(cookieStore)
  const orgId = authUtils.getServerOrganizationId(cookieStore)

  if (!orgId) {
    return <FormAnalyticsClient initialTables={[]} initialForms={[]} />
  }

  const tables = await getTables(headers)

  // Fetch forms for all tables in parallel
  const formPromises = tables.map(table => {
    const tId = table.table_id || table.id
    return getForms(headers, orgId, tId)
  })

  const allFormsResults = await Promise.all(formPromises)
  const aggregatedFormsRaw = allFormsResults.flat()

  // Deduplicate forms by form_id and version
  const seenForms = new Set()
  const formsData = aggregatedFormsRaw.filter(form => {
    const uniqueKey = `${form.form_id || form.id}-${form.version || 1}`
    if (seenForms.has(uniqueKey)) return false
    seenForms.add(uniqueKey)
    return true
  })

  // Group forms by form_id to find latest versions
  const formGroups = {}
  formsData.forEach(form => {
    const formId = form.form_id || form.id
    if (!formGroups[formId]) formGroups[formId] = []
    formGroups[formId].push(form)
  })

  // Filter to keep only the latest version of each form
  const latestFormsData = Object.values(formGroups).map(group => {
    return group.reduce((prev, current) => (prev.version > current.version) ? prev : current)
  })

  // Fetch submissions for all unique latest forms in parallel
  const submissionPromises = latestFormsData.map(form => {
    const formId = form.form_id || form.id
    return getSubmissions(headers, orgId, formId).then(submissions => ({
      formId,
      submissions
    }))
  })

  const submissionsResults = await Promise.all(submissionPromises)
  const submissionMap = new Map()
  submissionsResults.forEach(result => {
    submissionMap.set(result.formId, result.submissions)
  })

  // Attach submissions to forms and determine archived status
  const formsWithSubmissions = latestFormsData.map(form => {
    const formId = form.form_id || form.id
    const submissions = submissionMap.get(formId) || []
    const isArchived = form.isarchieved === true || form.isarchieved === 'true' ||
      form.archived === true || form.archived === 'true' ||
      form.archieve_status === true || form.archieve_status === 'true'

    return {
      ...form,
      is_archived: isArchived,
      submissionCount: submissions.length,
      submissions: submissions
    }
  })

  return (
    <FormAnalyticsClient initialTables={tables} initialForms={formsWithSubmissions} />
  )
}