import apiClient from './api-client'
import { authUtils } from './auth-utils'

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://10.10.15.194:3001'
const ORGANIZATION_ID = process.env.NEXT_PUBLIC_ORGANIZATION_ID || authUtils.getOrganizationId()
const TABLE_ID = process.env.NEXT_PUBLIC_TABLE_ID

// ==================== API ENDPOINTS ====================

// Auth Endpoints
export const AUTH_ENDPOINTS = {
  LOGIN: '/api/auth/login',
  LOGOUT: '/api/auth/logout',
  REGISTER: '/api/auth/register',
  VERIFY_OTP: '/api/auth/verify-otp',
  RESEND_OTP: '/api/auth/resend-otp',
  REFRESH: '/api/auth/refresh',
  PROXY_BACKEND: '/api/auth/proxy-backend',
}

// User Endpoints
export const USER_ENDPOINTS = {
  LIST: '/api/users',
  GET_BY_ID: (userId) => `/api/users/${userId}`,
  CREATE: '/api/users',
  UPDATE: (userId) => `/api/users/${userId}`,
  DELETE: (userId) => `/api/users/${userId}`,
  ADD_ROLE: (userId) => `/api/users/${userId}/roles`,
  REMOVE_ROLE: (userId, roleId) => `/api/users/${userId}/roles/${roleId}`,
  POLICY_MAP_TO_USER: '/api/users/policyMapToUser',
}

// Role Endpoints
export const ROLE_ENDPOINTS = {
  LIST: '/api/roles',
  GET_BY_ID: (roleId) => `/api/roles/${roleId}`,
  CREATE: '/api/roles',
  UPDATE: (roleId) => `/api/roles/${roleId}`,
  DELETE: (roleId) => `/api/roles/${roleId}`,
}

// Gene Endpoints
export const GENE_ENDPOINTS = {
  LIST: '/api/genes',
  GET_BY_ID: (geneId) => `/api/genes/by-geneId/${geneId}`,
  GET_DETAILS: (geneId) => `/api/genes/${geneId}`,
  CREATE: '/api/genes',
  UPDATE: (geneId) => `/api/genes/${geneId}`,
  DELETE: (geneId) => `/api/genes/${geneId}`,
  TOGGLE_ACTIVE: (geneId) => `/api/genes/${geneId}/toggle-active`,
  UPLOAD_CSV: '/api/genes/uploadCSV',
  ASSIGN_USERS_CSV: '/api/genes/assign-users-csv',
}

// Organization Endpoints
export const ORGANIZATION_ENDPOINTS = {
  LIST: '/api/organizations',
  GET_BY_ID: (orgId) => `/api/organizations/${orgId}`,
  CREATE: '/api/organizations',
  UPDATE: (orgId) => `/api/organizations/${orgId}`,
  DELETE: (orgId) => `/api/organizations/${orgId}`,
}

// Feature Endpoints
export const FEATURE_ENDPOINTS = {
  LIST: '/api/features',
  GET_BY_ID: (featureId) => `/api/features/${featureId}`,
  CREATE: '/api/features',
  UPDATE: (featureId) => `/api/features/${featureId}`,
  DELETE: (featureId) => `/api/features/${featureId}`,
  GET_BY_MODULE: (moduleName) => `/api/features?module=${moduleName}`,
}

// Policy Endpoints
export const POLICY_ENDPOINTS = {
  LIST: '/api/policies',
  GET_BY_ID: (policyId) => `/api/policies/${policyId}`,
  GET_USERS_BY_POLICY: (policyId) => `/api/policies/userByPolicy/${policyId}`,
  CREATE: '/api/policies',
  UPDATE: (policyId) => `/api/policies/${policyId}`,
  DELETE: (policyId) => `/api/policies/${policyId}`,
  GET_FEATURES_BY_POLICY: (policyId) => `/api/policies/${policyId}/features`,
  GET_USER_COUNT: (policyId) => `/api/policies/${policyId}/users/count`,
}

// Policy Mapping Endpoints
export const POLICY_MAPPING_ENDPOINTS = {
  LIST: '/api/policyMapping/list',
  CREATE: '/api/policyMapping',
  UPDATE: (mappingId) => `/api/policyMapping/${mappingId}`,
  DELETE: (mappingId) => `/api/policyMapping/${mappingId}`,
  CLONE_MAPPING: '/api/policyMapping/clonePolicyfeatureMapping',
  UPDATE_FEATURES: (policyId) => `/api/policyMapping/update/${policyId}`,
}

// DataTable Endpoints
export const DATATABLE_ENDPOINTS = {
  LIST: '/api/datatables',
  GET_BY_ID: (tableId) => `/api/datatables/${tableId}`,
  GET_COLUMNS: (tableId) => `/api/datatables/${tableId}/columns`,
  ADD_COLUMN: (tableId) => `/api/datatables/${tableId}/columns`,
  CREATE: '/api/datatables',
  UPDATE: (tableId) => `/api/datatables/${tableId}`,
  DELETE: (tableId) => `/api/datatables/${tableId}`,
  CREATE_COLUMN: (tableId) => `/api/datatables/${tableId}/columns`,
  UPDATE_COLUMN: (tableId, columnId) => `/api/datatables/${tableId}/columns/${columnId}`,
  DELETE_COLUMN: (tableId, columnId) => `/api/datatables/${tableId}/columns/${columnId}`,
  BULK_DELETE_COLUMNS: (tableId) => `/api/datatables/${tableId}/columns`,
  UPDATE_STATUS: (tableId) => `/api/datatables/${tableId}/status`,
}

// Record Endpoints
// ... (rest of file)



// Record Endpoints
export const RECORD_ENDPOINTS = {
  LIST: (tableId) => `/api/records/${tableId}`,
  GET_BY_ID: (tableId, recordId) => `/api/records/${tableId}/${recordId}`,
  CREATE: (tableId) => `/api/records/${tableId}`,
  UPDATE: (tableId, recordId) => `/api/records/${tableId}/${recordId}`,
  UPDATE_NESTED: (tableId, recordId) => `/api/records/${tableId}/${recordId}/nested`,
  DELETE: (tableId, recordId) => `/api/records/${tableId}/${recordId}`,
  GET_HISTORY: (tableId, recordId) => `/api/records/${tableId}/${recordId}/history`,
}

// Form Endpoints
export const FORM_ENDPOINTS = {
  LIST: (organizationId, tableId) => `/api/forms/all/${organizationId}/${tableId}`,
  GET_BY_ID: (organizationId, tableId, formId, version = null) =>
    `/api/forms/${organizationId}/${tableId}/${formId}${version ? `?version=${version}` : ''}`,
  CREATE: '/api/forms',
  UPDATE: '/api/forms/update',
  DELETE: '/api/forms/delete',
  ARCHIVE: '/api/forms/archieve',
  BASE: '/api/forms',
}

// Submission Endpoints
export const SUBMISSION_ENDPOINTS = {
  ALL: (organizationId, formId) => `/api/submit/all/${organizationId}/${formId}`,
  CREATE: '/api/submit',
  UPDATE: (token) => `/api/submit/update?token=${token}`,
  GET_FOR_EDIT: (token) => `/api/submit/edit?token=${token}`,
}

// ==================== API FUNCTIONS ====================

// Auth API
export const authApi = {
  login: (data) =>
    fetch(`${API_BASE_URL}${AUTH_ENDPOINTS.LOGIN}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data)
    }),

  logout: (authHeader) =>
    fetch(`${API_BASE_URL}${AUTH_ENDPOINTS.LOGOUT}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      },
      credentials: 'include'
    }),

  register: (data) =>
    fetch(`${API_BASE_URL}${AUTH_ENDPOINTS.REGISTER}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data)
    }),

  verifyOtp: (data) =>
    fetch(`${API_BASE_URL}${AUTH_ENDPOINTS.VERIFY_OTP}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data)
    }),

  resendOtp: (data) =>
    fetch(`${API_BASE_URL}${AUTH_ENDPOINTS.RESEND_OTP}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data)
    }),

  proxyBackend: (data) =>
    apiClient.post(AUTH_ENDPOINTS.PROXY_BACKEND, data, {
      headers: { 'Authorization': authUtils.getAuthHeader() }
    })
}

// Users API
export const usersApi = {
  getAll: () =>
    apiClient.get(USER_ENDPOINTS.LIST, {
      headers: { 'Authorization': authUtils.getAuthHeader() }
    }),

  getById: (userId) =>
    apiClient.get(USER_ENDPOINTS.GET_BY_ID(userId), {
      headers: { 'Authorization': authUtils.getAuthHeader() }
    }),

  create: (data) =>
    apiClient.post(USER_ENDPOINTS.CREATE, data, {
      headers: { 'Authorization': authUtils.getAuthHeader() }
    }),

  update: (userId, data) =>
    apiClient.patch(USER_ENDPOINTS.UPDATE(userId), data, {
      headers: { 'Authorization': authUtils.getAuthHeader() }
    }),

  delete: (userId) =>
    apiClient.delete(USER_ENDPOINTS.DELETE(userId), {
      headers: { 'Authorization': authUtils.getAuthHeader() }
    }),

  addRole: (userId, data) =>
    apiClient.post(USER_ENDPOINTS.ADD_ROLE(userId), data, {
      headers: { 'Authorization': authUtils.getAuthHeader() }
    }),

  removeRole: (userId, roleId) =>
    apiClient.delete(USER_ENDPOINTS.REMOVE_ROLE(userId, roleId), {
      headers: { 'Authorization': authUtils.getAuthHeader() }
    }),

  mapPolicyToUser: (data) =>
    apiClient.post(USER_ENDPOINTS.POLICY_MAP_TO_USER, data, {
      headers: { 'Authorization': authUtils.getAuthHeader() }
    })
}

// Roles API
export const rolesApi = {
  getAll: () =>
    apiClient.get(ROLE_ENDPOINTS.LIST, {
      headers: { 'Authorization': authUtils.getAuthHeader() }
    }),

  getById: (roleId) =>
    apiClient.get(ROLE_ENDPOINTS.GET_BY_ID(roleId), {
      headers: { 'Authorization': authUtils.getAuthHeader() }
    }),

  create: (data) =>
    apiClient.post(ROLE_ENDPOINTS.CREATE, data, {
      headers: { 'Authorization': authUtils.getAuthHeader() }
    }),

  update: (roleId, data) =>
    apiClient.put(ROLE_ENDPOINTS.UPDATE(roleId), data, {
      headers: { 'Authorization': authUtils.getAuthHeader() }
    }),

  delete: (roleId) =>
    apiClient.delete(ROLE_ENDPOINTS.DELETE(roleId), {
      headers: { 'Authorization': authUtils.getAuthHeader() }
    })
}

// Genes API
export const genesApi = {
  getAll: () =>
    apiClient.get(GENE_ENDPOINTS.LIST, {
      headers: { 'Authorization': authUtils.getAuthHeader() }
    }),

  getById: (geneId) =>
    apiClient.get(GENE_ENDPOINTS.GET_BY_ID(geneId), {
      headers: { 'Authorization': authUtils.getAuthHeader() }
    }),

  getDetails: (geneId) =>
    apiClient.get(GENE_ENDPOINTS.GET_DETAILS(geneId), {
      headers: { 'Authorization': authUtils.getAuthHeader() }
    }),

  create: (data) =>
    apiClient.post(GENE_ENDPOINTS.CREATE, data, {
      headers: { 'Authorization': authUtils.getAuthHeader() }
    }),

  update: (geneId, data) =>
    apiClient.put(GENE_ENDPOINTS.UPDATE(geneId), data, {
      headers: { 'Authorization': authUtils.getAuthHeader() }
    }),

  delete: (geneId) =>
    apiClient.delete(GENE_ENDPOINTS.DELETE(geneId), {
      headers: { 'Authorization': authUtils.getAuthHeader() }
    }),

  toggleActive: (geneId) =>
    apiClient.patch(GENE_ENDPOINTS.TOGGLE_ACTIVE(geneId), {}, {
      headers: { 'Authorization': authUtils.getAuthHeader() }
    }),

  uploadCSV: (formData) =>
    apiClient.post(GENE_ENDPOINTS.UPLOAD_CSV, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Authorization': authUtils.getAuthHeader()
      }
    }),

  assignUsersCsv: (formData) =>
    apiClient.post(GENE_ENDPOINTS.ASSIGN_USERS_CSV, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Authorization': authUtils.getAuthHeader()
      }
    })
}

// Organizations API
export const organizationsApi = {
  getAll: () =>
    apiClient.get(ORGANIZATION_ENDPOINTS.LIST, {
      headers: { 'Authorization': authUtils.getAuthHeader() }
    }),

  getById: (orgId) =>
    apiClient.get(ORGANIZATION_ENDPOINTS.GET_BY_ID(orgId), {
      headers: { 'Authorization': authUtils.getAuthHeader() }
    }),

  create: (data) =>
    apiClient.post(ORGANIZATION_ENDPOINTS.CREATE, data, {
      headers: { 'Authorization': authUtils.getAuthHeader() }
    }),

  update: (orgId, data) =>
    apiClient.put(ORGANIZATION_ENDPOINTS.UPDATE(orgId), data, {
      headers: { 'Authorization': authUtils.getAuthHeader() }
    }),

  delete: (orgId) =>
    apiClient.delete(ORGANIZATION_ENDPOINTS.DELETE(orgId), {
      headers: { 'Authorization': authUtils.getAuthHeader() }
    })
}

// Features API
export const featuresApi = {
  getAll: () =>
    apiClient.get(FEATURE_ENDPOINTS.LIST, {
      headers: { 'Authorization': authUtils.getAuthHeader() }
    }),

  getById: (featureId) =>
    apiClient.get(FEATURE_ENDPOINTS.GET_BY_ID(featureId), {
      headers: { 'Authorization': authUtils.getAuthHeader() }
    }),

  create: (data) =>
    apiClient.post(FEATURE_ENDPOINTS.CREATE, data, {
      headers: { 'Authorization': authUtils.getAuthHeader() }
    }),

  update: (featureId, data) =>
    apiClient.put(FEATURE_ENDPOINTS.UPDATE(featureId), data, {
      headers: { 'Authorization': authUtils.getAuthHeader() }
    }),

  delete: (featureId) =>
    apiClient.delete(FEATURE_ENDPOINTS.DELETE(featureId), {
      headers: { 'Authorization': authUtils.getAuthHeader() }
    }),

  getByModule: (moduleName) =>
    apiClient.get(FEATURE_ENDPOINTS.GET_BY_MODULE(moduleName), {
      headers: { 'Authorization': authUtils.getAuthHeader() }
    })
}

// Policies API
export const policiesApi = {
  getAll: () =>
    apiClient.get(POLICY_ENDPOINTS.LIST, {
      headers: { 'Authorization': authUtils.getAuthHeader() }
    }),

  getById: (policyId) =>
    apiClient.get(POLICY_ENDPOINTS.GET_BY_ID(policyId), {
      headers: { 'Authorization': authUtils.getAuthHeader() }
    }),

  getUsersByPolicy: (policyId) =>
    apiClient.get(POLICY_ENDPOINTS.GET_USERS_BY_POLICY(policyId), {
      headers: { 'Authorization': authUtils.getAuthHeader() }
    }),

  create: (data) =>
    apiClient.post(POLICY_ENDPOINTS.CREATE, data, {
      headers: { 'Authorization': authUtils.getAuthHeader() }
    }),

  update: (policyId, data) =>
    apiClient.put(POLICY_ENDPOINTS.UPDATE(policyId), data, {
      headers: { 'Authorization': authUtils.getAuthHeader() }
    }),

  delete: (policyId) =>
    apiClient.delete(POLICY_ENDPOINTS.DELETE(policyId), {
      headers: { 'Authorization': authUtils.getAuthHeader() }
    }),

  getFeaturesByPolicy: (policyId) =>
    apiClient.get(POLICY_ENDPOINTS.GET_FEATURES_BY_POLICY(policyId), {
      headers: { 'Authorization': authUtils.getAuthHeader() }
    }),

  getUserCount: (policyId) =>
    apiClient.get(POLICY_ENDPOINTS.GET_USER_COUNT(policyId), {
      headers: { 'Authorization': authUtils.getAuthHeader() }
    })
}

// Policy Mapping API
export const policyMappingApi = {
  getAll: () =>
    apiClient.post(POLICY_MAPPING_ENDPOINTS.LIST, {}, {
      headers: { 'Authorization': authUtils.getAuthHeader() }
    }),

  create: (data) =>
    apiClient.post(POLICY_MAPPING_ENDPOINTS.CREATE, data, {
      headers: { 'Authorization': authUtils.getAuthHeader() }
    }),

  update: (mappingId, data) =>
    apiClient.put(POLICY_MAPPING_ENDPOINTS.UPDATE(mappingId), data, {
      headers: { 'Authorization': authUtils.getAuthHeader() }
    }),

  delete: (mappingId) =>
    apiClient.delete(POLICY_MAPPING_ENDPOINTS.DELETE(mappingId), {
      headers: { 'Authorization': authUtils.getAuthHeader() }
    }),

  cloneMapping: (data) =>
    apiClient.post(POLICY_MAPPING_ENDPOINTS.CLONE_MAPPING, data, {
      headers: { 'Authorization': authUtils.getAuthHeader() }
    }),

  updateFeatures: (policyId, data) =>
    apiClient.put(POLICY_MAPPING_ENDPOINTS.UPDATE_FEATURES(policyId), data, {
      headers: { 'Authorization': authUtils.getAuthHeader() }
    })
}

// DataTables API
export const datatablesApi = {
  getAll: (params) =>
    apiClient.get(DATATABLE_ENDPOINTS.LIST, {
      params,
      headers: { 'Authorization': authUtils.getAuthHeader() }
    }),

  getById: (tableId) =>
    apiClient.get(DATATABLE_ENDPOINTS.GET_BY_ID(tableId), {
      headers: { 'Authorization': authUtils.getAuthHeader() }
    }),

  getColumns: (tableId) =>
    apiClient.get(DATATABLE_ENDPOINTS.GET_COLUMNS(tableId), {
      headers: { 'Authorization': authUtils.getAuthHeader() }
    }),

  addColumn: (tableId, data) =>
    apiClient.post(DATATABLE_ENDPOINTS.ADD_COLUMN(tableId), data, {
      headers: { 'Authorization': authUtils.getAuthHeader() }
    }),

  create: (data) =>
    apiClient.post(DATATABLE_ENDPOINTS.CREATE, data, {
      headers: { 'Authorization': authUtils.getAuthHeader() }
    }),

  update: (tableId, data) =>
    apiClient.put(DATATABLE_ENDPOINTS.UPDATE(tableId), data, {
      headers: { 'Authorization': authUtils.getAuthHeader() }
    }),

  delete: (tableId) =>
    apiClient.delete(DATATABLE_ENDPOINTS.DELETE(tableId), {
      headers: { 'Authorization': authUtils.getAuthHeader() }
    }),

  updateColumn: (tableId, columnId, data) =>
    apiClient.put(DATATABLE_ENDPOINTS.UPDATE_COLUMN(tableId, columnId), data, {
      headers: { 'Authorization': authUtils.getAuthHeader() }
    }),

  deleteColumn: (tableId, columnId) =>
    apiClient.delete(DATATABLE_ENDPOINTS.DELETE_COLUMN(tableId, columnId), {
      headers: { 'Authorization': authUtils.getAuthHeader() }
    }),

  bulkDeleteColumns: (tableId, data) =>
    apiClient.delete(DATATABLE_ENDPOINTS.BULK_DELETE_COLUMNS(tableId), {
      data,
      headers: { 'Authorization': authUtils.getAuthHeader() }
    }),

  updateStatus: (tableId, data) =>
    apiClient.patch(DATATABLE_ENDPOINTS.UPDATE_STATUS(tableId), data, {
      headers: { 'Authorization': authUtils.getAuthHeader() }
    })
}

// Records API

const withAuthParams = (url) => url;

export const recordsApi = {
  getAll: (tableId, params) =>
    apiClient.get(RECORD_ENDPOINTS.LIST(tableId), {
      params,
      headers: { 'Authorization': authUtils.getAuthHeader() }
    }),

  getById: (tableId, recordId) =>
    apiClient.get(withAuthParams(RECORD_ENDPOINTS.GET_BY_ID(tableId, recordId)), {
      headers: { 'Authorization': authUtils.getAuthHeader() }
    }),

  create: (tableId, data) =>
    apiClient.post(withAuthParams(RECORD_ENDPOINTS.CREATE(tableId)), data, {
      headers: { 'Authorization': authUtils.getAuthHeader() }
    }),

  update: (tableId, recordId, data) =>
    apiClient.put(withAuthParams(RECORD_ENDPOINTS.UPDATE(tableId, recordId)), data, {
      headers: { 'Authorization': authUtils.getAuthHeader() }
    }),

  updateNested: (tableId, recordId, data) =>
    apiClient.put(withAuthParams(RECORD_ENDPOINTS.UPDATE_NESTED(tableId, recordId)), data, {
      headers: { 'Authorization': authUtils.getAuthHeader() }
    }),

  delete: (tableId, recordId) =>
    apiClient.delete(withAuthParams(RECORD_ENDPOINTS.DELETE(tableId, recordId)), {
      headers: { 'Authorization': authUtils.getAuthHeader() }
    }),
  getHistory: (tableId, recordId) =>
    apiClient.get(RECORD_ENDPOINTS.GET_HISTORY(tableId, recordId), {
      headers: { 'Authorization': authUtils.getAuthHeader() }
    })
}

// Forms API
export const formsApi = {
  getAll: (organizationId, tableId) => {
    const orgId = organizationId || authUtils.getOrganizationId()
    const tId = tableId || process.env.NEXT_PUBLIC_TABLE_ID

    if (!orgId || !tId) {
      console.warn('formsApi.getAll: Missing organizationId or tableId', { orgId, tId })
      return Promise.reject(new Error('Organization ID and Table ID are required to fetch forms'))
    }

    return apiClient.get(FORM_ENDPOINTS.LIST(orgId, tId), {
      headers: { 'Authorization': authUtils.getAuthHeader() }
    })
  },

  getById: (formId, version = null, organizationId = null, tableId = null) => {
    const orgId = organizationId || authUtils.getOrganizationId()
    const tId = tableId || process.env.NEXT_PUBLIC_TABLE_ID
    return apiClient.get(FORM_ENDPOINTS.GET_BY_ID(orgId, tId, formId, version), {
      headers: { 'Authorization': authUtils.getAuthHeader() }
    })
  },

  create: (data) =>
    apiClient.post(FORM_ENDPOINTS.CREATE, data, {
      headers: { 'Authorization': authUtils.getAuthHeader() }
    }),

  update: (data) =>
    apiClient.post(FORM_ENDPOINTS.UPDATE, data, {
      headers: { 'Authorization': authUtils.getAuthHeader() }
    }),

  delete: (data) =>
    apiClient.post(FORM_ENDPOINTS.DELETE, data, {
      headers: { 'Authorization': authUtils.getAuthHeader() }
    }),

  archive: (data) =>
    apiClient.post(FORM_ENDPOINTS.ARCHIVE, data, {
      headers: { 'Authorization': authUtils.getAuthHeader() }
    })
}

// Submissions API
export const submissionsApi = {
  getAll: (organizationId, formId) =>
    apiClient.get(SUBMISSION_ENDPOINTS.ALL(organizationId, formId), {
      headers: { 'Authorization': authUtils.getAuthHeader() }
    }),
  create: (data) =>
    apiClient.post(SUBMISSION_ENDPOINTS.CREATE, data, {
      headers: { 'Content-Type': 'application/json' }
    }),

  update: (token, data) =>
    apiClient.post(SUBMISSION_ENDPOINTS.UPDATE(token), data, {
      headers: { 'Content-Type': 'application/json' }
    }),

  getForEdit: (token, data) =>
    apiClient.post(SUBMISSION_ENDPOINTS.GET_FOR_EDIT(token), data, {
      headers: { 'Authorization': authUtils.getAuthHeader() }
    })
}

// Activity Endpoints
export const ACTIVITY_ENDPOINTS = {
  LIST_BY_USER: (userId) => `/api/activities?assigned_to=${userId}`,
  LIST_BY_TABLE: (tableId) => `/api/activities/tableId/${tableId}`,
  LIST_BY_ORGANIZATION: '/api/activities/organization',
  CREATE: '/api/activities',
  GET_BY_ID: (activityId) => `/api/activities/${activityId}`,
  UPDATE: (activityId) => `/api/activities/${activityId}`,
  COMPLETE: (activityId) => `/api/activities/${activityId}/complete`,
}

// Activities API
export const activitiesApi = {
  getByUser: (userId) =>
    apiClient.get(ACTIVITY_ENDPOINTS.LIST_BY_USER(userId), {
      headers: { 'Authorization': authUtils.getAuthHeader() }
    }),

  getByTable: (tableId) =>
    apiClient.get(ACTIVITY_ENDPOINTS.LIST_BY_TABLE(tableId), {
      headers: { 'Authorization': authUtils.getAuthHeader() }
    }),

  getByOrganization: () =>
    apiClient.get(ACTIVITY_ENDPOINTS.LIST_BY_ORGANIZATION, {
      headers: { 'Authorization': authUtils.getAuthHeader() }
    }),

  create: (data) =>
    apiClient.post(ACTIVITY_ENDPOINTS.CREATE, data, {
      headers: { 'Authorization': authUtils.getAuthHeader() }
    }),

  getById: (activityId, tableId, recordId) =>
    apiClient.get(ACTIVITY_ENDPOINTS.GET_BY_ID(activityId, tableId, recordId), {
      headers: { 'Authorization': authUtils.getAuthHeader() }
    }),

  update: (activityId, tableId, recordId, data) => {
    let url = ACTIVITY_ENDPOINTS.UPDATE(activityId)
    const params = new URLSearchParams()
    if (tableId && tableId !== "_none" && tableId !== "undefined") params.append('related_table_id', tableId)
    if (recordId && recordId !== "undefined") params.append('related_record_id', recordId)

    const queryString = params.toString()
    if (queryString) url += `?${queryString}`

    return apiClient.put(url, data, {
      headers: { 'Authorization': authUtils.getAuthHeader() }
    })
  },

  complete: (activityId, tableId, recordId) =>
    apiClient.post(ACTIVITY_ENDPOINTS.COMPLETE(activityId), {
      related_table_id: tableId,
      related_record_id: recordId
    }, {
      headers: { 'Authorization': authUtils.getAuthHeader() }
    })
}

// ==================== MIGRATION ====================

export const MIGRATION_API_BASE_URL = process.env.NEXT_PUBLIC_MIGRATION_API_URL || 'http://10.10.15.194:3003'

export const MIGRATION_ENDPOINTS = {
  STATUS: '/api/migration/status',
  DOWNLOAD_ERRORS: (jobId) => `/api/migration/errors/download/${jobId}`,
}

export const migrationApi = {
  getStatus: () =>
    fetch(`${MIGRATION_API_BASE_URL}${MIGRATION_ENDPOINTS.STATUS}`, {
      headers: { 'Authorization': authUtils.getAuthHeader() }
    }).then(res => res.json()),

  downloadErrors: (jobId) => {
    const url = `${MIGRATION_API_BASE_URL}${MIGRATION_ENDPOINTS.DOWNLOAD_ERRORS(jobId)}`;
    return fetch(url, {
      headers: { 'Authorization': authUtils.getAuthHeader() }
    });
  }
}
