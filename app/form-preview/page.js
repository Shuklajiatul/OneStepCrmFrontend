"use client"

import { useEffect, useState } from "react"
import { FormPreview } from "../custom-form/components/formbuilder/form-preview"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { ArrowLeft, FileText } from "lucide-react"
import { authUtils } from '@/lib/auth-utils'
import { formsApi } from '@/lib/api-endpoint'
import { PageBreadcrumb } from "@/components/page-breadcrumb"

export default function FormPreviewPage() {
  const [fields, setFields] = useState([])
  const [loading, setLoading] = useState(true)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editFormData, setEditFormData] = useState(null)
  const [currentRetryCount, setCurrentRetryCount] = useState("2")
  const [selectedTable, setSelectedTable] = useState("")
  const [userData, setUserData] = useState(null)
  const router = useRouter()

  // Get user data from authUtils
  const getUserData = () => {
    const tokens = authUtils.getTokens()
    return tokens?.user || null
  }

  // Get user ID from authUtils
  const getUserId = () => {
    const userData = getUserData()
    return userData?.user_id || null
  }

  useEffect(() => {
    // Load user data from authUtils
    const userData = getUserData()
    setUserData(userData)

    // Load fields from localStorage (edit mode) or sessionStorage (create mode)
    const formBuilderData = localStorage.getItem('formBuilderData')

    if (formBuilderData) {
      // Edit mode - load from localStorage
      try {
        const data = JSON.parse(formBuilderData)
        if (data.isEditMode && data.fields) {
          setFields(data.fields)
          setIsEditMode(true)
          setEditFormData(data)
          setCurrentRetryCount(data.max_retry_count?.toString() || "2")
          setSelectedTable(data.table_id || "")

          // If form data doesn't have g_id but user has genes, set the first one
          if (!data.g_id && userData?.g_ids?.length > 0) {
            // Update the formBuilderData with the first gene ID
            const updatedData = {
              ...data,
              g_id: userData.g_ids[0]
            }
            localStorage.setItem('formBuilderData', JSON.stringify(updatedData))
            setEditFormData(updatedData)
          }
        }
      } catch (error) {
        console.error('Error parsing formBuilderData:', error)
      }
    } else {
      // Create mode - load from sessionStorage
      const savedFields = sessionStorage.getItem('form-preview-fields')
      if (savedFields) {
        try {
          const parsedFields = JSON.parse(savedFields)
          setFields(parsedFields)
        } catch (error) {
          console.error('Error parsing saved fields:', error)
        }
      }
    }
    setLoading(false)
  }, [])

  // Listen for changes to localStorage in edit mode
  useEffect(() => {
    if (!isEditMode) return

    const handleStorageChange = () => {
      const formBuilderData = localStorage.getItem('formBuilderData')
      if (formBuilderData) {
        try {
          const data = JSON.parse(formBuilderData)
          if (data.isEditMode && data.fields) {
            setFields(data.fields)
            setEditFormData(data)
            // Update retry count from storage
            setCurrentRetryCount(data.max_retry_count?.toString() || "2")
          }
        } catch (error) {
          console.error('Error parsing updated formBuilderData:', error)
        }
      }
    }

    // Listen for storage events (cross-tab)
    window.addEventListener('storage', handleStorageChange)

    // Also listen for custom events (for same-tab updates)
    window.addEventListener('formBuilderDataUpdated', handleStorageChange)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('formBuilderDataUpdated', handleStorageChange)
    }
  }, [isEditMode])

  // Update localStorage when retry count changes
  useEffect(() => {
    if (!isEditMode || !editFormData) return

    const updateLocalStorageRetryCount = () => {
      const formBuilderData = localStorage.getItem('formBuilderData')
      if (formBuilderData) {
        try {
          const data = JSON.parse(formBuilderData)
          if (data.isEditMode) {
            data.max_retry_count = currentRetryCount
            localStorage.setItem('formBuilderData', JSON.stringify(data))
          }
        } catch (error) {
          console.error('Error updating retry count in localStorage:', error)
        }
      }
    }

    updateLocalStorageRetryCount()
  }, [currentRetryCount, isEditMode, editFormData])

  const handleBack = () => {
    if (isEditMode) {
      // In edit mode, go directly to custom-form with edit data
      sessionStorage.setItem('directEditAction', 'true')
      router.push('/custom-form')
    } else {
      // In create mode, go back to custom-form normally
      sessionStorage.setItem('intended-tab', 'custom-form')
      router.push('/custom-form')
    }
  }

  const handleSaveForm = async () => {
    try {
      if (isEditMode && editFormData) {
        // Add a small delay to ensure any pending localStorage writes are complete
        await new Promise(resolve => setTimeout(resolve, 50))

        const formBuilderData = localStorage.getItem('formBuilderData')
        let latestFields = fields // Fallback to state
        let latestRetryCount = currentRetryCount
        let latestGId = editFormData.g_id

        if (formBuilderData) {
          try {
            const data = JSON.parse(formBuilderData)
            if (data.isEditMode && data.fields) {
              latestFields = data.fields
              latestRetryCount = data.max_retry_count?.toString() || currentRetryCount
              latestGId = data.g_id || latestGId
            }
          } catch (error) {
            console.error('Error parsing formBuilderData in handleSaveForm:', error)
          }
        }

        // If still no g_id, use the first gene from user data
        if (!latestGId && userData?.g_ids?.length > 0) {
          latestGId = userData.g_ids[0]
        }

        // Get user ID from localStorage
        const userId = getUserId()
        if (!userId) {
          toast.error("User not found. Please log in again.")
          router.push('/login')
          return
        }

        // Generate the same payload structure as Generate Link
        const ORGANIZATION_ID = authUtils.getOrganizationId()

        // Separate fields by type
        // Note: 'table_column' is an internal UI widget (column selector) and should never be saved as a form field
        const groupFieldsList = latestFields.filter(field => field.type === 'group' && field.type !== 'table_column')
        const regularFormFields = latestFields.filter(field => field.type !== 'group' && field.type !== 'table_column' && !field.tableColumnId && field.source !== 'table')
        const tableColumnFields = latestFields.filter(field => field.tableColumnId || field.source === 'table')

        // Recursive function to process nested fields for API payload
        const processNestedFieldsForAPI = (nestedFields) => {
          if (!Array.isArray(nestedFields)) return []

          return nestedFields.map(nestedField => {
            // Strip "field-" prefix from nested field ID
            let cleanNestedFieldId = nestedField.id
            if (typeof cleanNestedFieldId === 'string' && cleanNestedFieldId.startsWith('field-')) {
              cleanNestedFieldId = cleanNestedFieldId.replace('field-', '')
            }

            const processedNestedField = {
              id: cleanNestedFieldId,
              name: nestedField.name || nestedField.label?.toLowerCase().replace(/\s+/g, '_'),
              label: nestedField.label,
              type: nestedField.type,
              placeholder: nestedField.placeholder || "",
              required: nestedField.required || false,
              validations: nestedField.validation || nestedField.validations || {},
              hasNested: false,
              options: [],
              isLeadColumn: nestedField.isLeadColumn || false
            }

            // Process options for this nested field if it has them
            if (nestedField.options && Array.isArray(nestedField.options)) {
              processedNestedField.options = nestedField.options.map(option => {
                // Handle both string options and object options
                if (typeof option === 'string') {
                  return {
                    value: option,
                    label: option,
                    nestedFields: []
                  }
                } else {
                  return {
                    value: option.value || '',
                    label: option.label || option.value || '',
                    nestedFields: processNestedFieldsForAPI(option.nestedFields || [])
                  }
                }
              })
            }

            // Check if this nested field has nested fields
            processedNestedField.hasNested = processedNestedField.options.some(
              option => option.nestedFields && option.nestedFields.length > 0
            )

            return processedNestedField
          })
        }

        // Helper function to process field data with string formatting
        const processFieldData = (field) => {
          // Ensure options is always an array
          const processedOptions = Array.isArray(field.options) ? field.options : []

          // Strip "field-" prefix from field ID
          let cleanFieldId = field.id
          if (typeof cleanFieldId === 'string' && cleanFieldId.startsWith('field-')) {
            cleanFieldId = cleanFieldId.replace('field-', '')
          }

          const processedField = {
            id: cleanFieldId,
            name: field.name || field.label?.toLowerCase().replace(/\s+/g, '_'),
            label: field.label,
            type: field.type,
            placeholder: field.placeholder || "",
            required: field.required ? "true" : "false",
            validations: JSON.stringify(field.validations || field.validation || {}),
            hasNested: field.hasNested ? "true" : "false",
            isLeadColumn: field.isLeadColumn ? "true" : "false",
            isNew: field.isNew,
            options: JSON.stringify(processedOptions.map(option => ({
              value: typeof option === 'string' ? option : option.value,
              label: typeof option === 'string' ? option : option.label,
              nestedFields: processNestedFieldsForAPI(option.nestedFields || [])
            })))
          }

          return processedField
        }

        // Helper function to process subFields inside group fields
        const processSubFieldForAPI = (subField) => {
          // Strip "field-" prefix from subfield ID
          let cleanSubFieldId = subField.id
          if (typeof cleanSubFieldId === 'string' && cleanSubFieldId.startsWith('field-')) {
            cleanSubFieldId = cleanSubFieldId.replace('field-', '')
          }

          let optionsArray = []
          if (subField.options && Array.isArray(subField.options)) {
            optionsArray = subField.options.map(option => ({
              value: typeof option === 'string' ? option : option.value,
              label: typeof option === 'string' ? option : option.label,
              nestedFields: []
            }))
          }

          return {
            id: cleanSubFieldId,
            name: subField.label?.toLowerCase().replace(/\s+/g, '_') || subField.name,
            label: subField.label,
            type: subField.type,
            placeholder: subField.placeholder || "",
            required: subField.required ? "true" : "false",
            validations: JSON.stringify(subField.validation || subField.validations || {}),
            hasNested: "false",
            options: JSON.stringify(optionsArray),
            hasNested: "false",
            options: JSON.stringify(optionsArray),
            isLeadColumn: subField.isLeadColumn ? "true" : "false",
            isNew: subField.isNew
          }
        }

        // Extract fields from groups and collect field IDs for group references
        const groupSubFieldsForMainArray = []
        const processGroupFieldData = (groupField) => {
          // Strip "field-" prefix from group field ID
          let cleanGroupId = groupField.id
          if (typeof cleanGroupId === 'string' && cleanGroupId.startsWith('field-')) {
            cleanGroupId = cleanGroupId.replace('field-', '')
          }

          // Process all subFields inside the group and collect their IDs
          const fieldIds = []
          if (groupField.subFields && Array.isArray(groupField.subFields)) {
            groupField.subFields.forEach(subField => {
              // Process the subField as a full field object
              const processedSubField = processSubFieldForAPI(subField)
              // Add to the main fields array
              groupSubFieldsForMainArray.push(processedSubField)
              // Collect the field ID for the group reference
              fieldIds.push(processedSubField.id)
            })
          }

          return {
            id: cleanGroupId,
            name: groupField.label?.toLowerCase().replace(/\s+/g, '_') || groupField.name,
            label: groupField.label,
            type: "group",
            required: groupField.required ? "true" : "false",
            fields: fieldIds
          }
        }

        // Process group fields
        const processedGroupFields = groupFieldsList.map(processGroupFieldData)

        // Process table column fields
        const processedTableFields = tableColumnFields.map(field => {
          let optionsArray = []

          if (field.options && Array.isArray(field.options)) {
            optionsArray = field.options.map((option, index) => {
              const optionObj = {
                value: typeof option === 'string' ? option : option.value,
                label: typeof option === 'string' ? option : option.label,
                nestedFields: []
              }

              // Process nested fields for this option
              if (option.nestedFields && Array.isArray(option.nestedFields)) {
                optionObj.nestedFields = processNestedFieldsForAPI(option.nestedFields)
              }
              else if (field.nestedFields && field.nestedFields[index]) {
                optionObj.nestedFields = processNestedFieldsForAPI(field.nestedFields[index])
              }

              return optionObj
            })
          }

          const hasNestedFields = optionsArray.some(option =>
            option.nestedFields && option.nestedFields.length > 0
          )

          let cleanFieldId = field.tableColumnId || field.id
          if (typeof cleanFieldId === 'string' && cleanFieldId.startsWith('field-')) {
            cleanFieldId = cleanFieldId.replace('field-', '')
          }

          return {
            id: cleanFieldId,
            name: field.tableColumnName || field.label?.toLowerCase().replace(/\s+/g, '_'),
            label: field.label,
            type: field.type,
            placeholder: field.placeholder || "",
            required: field.required ? "true" : "false",
            validations: JSON.stringify(field.validation || field.validations || {}),
            hasNested: hasNestedFields ? "true" : "false",
            options: JSON.stringify(optionsArray),
            isLeadColumn: field.isLeadColumn ? "true" : "false"
          }
        })

        // Process regular form fields (previously called extraFields but now merged into fields)
        const processedRegularFields = regularFormFields.map(field => {
          let optionsArray = []

          if (field.options && Array.isArray(field.options)) {
            optionsArray = field.options.map((option, index) => {
              const optionObj = {
                value: typeof option === 'string' ? option : option.value,
                label: typeof option === 'string' ? option : option.label,
                nestedFields: []
              }

              // Process nested fields for this option
              if (option.nestedFields && Array.isArray(option.nestedFields)) {
                optionObj.nestedFields = processNestedFieldsForAPI(option.nestedFields)
              }
              else if (field.nestedFields && field.nestedFields[index]) {
                optionObj.nestedFields = processNestedFieldsForAPI(field.nestedFields[index])
              }

              return optionObj
            })
          }

          const hasNestedFields = optionsArray.some(option =>
            option.nestedFields && option.nestedFields.length > 0
          )

          // Strip "field-" prefix from extra field ID
          let cleanFieldId = field.id
          if (typeof cleanFieldId === 'string' && cleanFieldId.startsWith('field-')) {
            cleanFieldId = cleanFieldId.replace('field-', '')
          }

          return {
            id: cleanFieldId,
            name: field.label?.toLowerCase().replace(/\s+/g, '_'),
            label: field.label,
            type: field.type,
            placeholder: field.placeholder || "",
            required: field.required ? "true" : "false",
            validations: JSON.stringify(field.validation || field.validations || {}),
            hasNested: hasNestedFields ? "true" : "false",
            options: JSON.stringify(optionsArray),
            options: JSON.stringify(optionsArray),
            isLeadColumn: field.isLeadColumn ? "true" : "false",
            isNew: field.isNew
          }
        })

        // Process fields for the 'fields' array (Table Columns + Non-Lead Regular Fields + Existing Lead Regular Fields)
        // Logic: Go to 'fields' if it's NOT (New AND Lead)
        const processedNonLeadFields = processedRegularFields.filter(f => !(f.isNew && f.isLeadColumn === "true"))

        // Process fields for the 'extraFields' array (Only New Lead Regular Fields)
        const processedExtraFields = processedRegularFields.filter(f => f.isNew && f.isLeadColumn === "true")

        // Split group subfields based on isLeadColumn AND isNew
        const groupSubFieldsLead = groupSubFieldsForMainArray.filter(f => f.isNew && (f.isLeadColumn === "true" || f.isLeadColumn === true))
        const groupSubFieldsNonLead = groupSubFieldsForMainArray.filter(f => !(f.isNew && (f.isLeadColumn === "true" || f.isLeadColumn === true)))

        // Combine for the main 'fields' array
        const allMainFields = [
          ...processedTableFields,
          ...processedNonLeadFields,
          ...groupSubFieldsNonLead
        ]

        // Prepare the update payload
        const updatePayload = {
          form_id: editFormData.formId,
          organization_id: ORGANIZATION_ID,
          table_id: selectedTable,
          form_name: editFormData.formName,
          description: editFormData.description,
          g_id: latestGId,
          created_by: userId,
          extraFields: [...processedExtraFields, ...groupSubFieldsLead],
          fields: allMainFields,
          group: JSON.stringify(processedGroupFields),
          published: true,
          retry_count: latestRetryCount
        }

        console.log('📤 Update Payload:', JSON.stringify(updatePayload))

        // Send update request
        const response = await formsApi.update(updatePayload)

        const result = response.data
        console.log('✅ Update API Response:', result)

        if (result.success) {
          toast.success(`Form "${editFormData.formName}" updated successfully!`)
          // Clear localStorage and sessionStorage form data
          localStorage.removeItem('formBuilderData')
          sessionStorage.removeItem('form-preview-fields')
          // Navigate to my-forms page
          router.push('/my-forms')
        } else {
          toast.error(`Failed to update form: ${result.message || 'Unknown error'}`)
        }
      }
    } catch (error) {
      console.error('Error updating form:', error)
      toast.error(`Error updating form: ${error.message}`)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading preview...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="px-4 pt-4">
        <PageBreadcrumb />
      </div>
      {/* Header with back button */}
      <div className="sticky top-0 z-10 bg-card border-b shadow-sm">
        <div className="max-w-7xl mx-auto p-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={handleBack}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Form Builder
            </Button>
            {isEditMode && (
              <Button onClick={handleSaveForm} className="flex items-center gap-2" size="sm">
                <FileText className="h-4 w-4" />
                Update Form
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Form Preview Content */}
      <FormPreview
        fields={fields}
        isEditMode={isEditMode}
        formData={editFormData}
        onRetryCountChange={setCurrentRetryCount}
        onTableChange={setSelectedTable}
      />
    </div>
  )
}