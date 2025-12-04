"use client"

import { useEffect, useState } from "react"
import { FormPreview } from "../component/formbuilder/form-preview"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { ArrowLeft, FileText } from "lucide-react"
import { authUtils } from '@/lib/auth-utils'

export default function FormPreviewPage() {
  const [fields, setFields] = useState([])
  const [loading, setLoading] = useState(true)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editFormData, setEditFormData] = useState(null)
  const [currentRetryCount, setCurrentRetryCount] = useState("2")
  const [userData, setUserData] = useState(null)
  const router = useRouter()

  // Get user data from localStorage
  const getUserData = () => {
    if (typeof window !== 'undefined') {
      const userData = localStorage.getItem('user')
      return userData ? JSON.parse(userData) : null
    }
    return null
  }

  // Get user ID from localStorage
  const getUserId = () => {
    const userData = getUserData()
    return userData?.user_id || null
  }

  useEffect(() => {
    // Load user data from localStorage
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
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL
        const ORGANIZATION_ID = process.env.NEXT_PUBLIC_ORGANIZATION_ID
        const TABLE_ID = process.env.NEXT_PUBLIC_TABLE_ID

        // Recursive function to process nested fields
        const processNestedFields = (nestedFields, parentIndex = null) => {
          if (!nestedFields || !Array.isArray(nestedFields)) return []

          return nestedFields.map((nestedField, nestedIndex) => {
            // Process options for this nested field if it has them
            let nestedOptions = []
            if (nestedField.options && Array.isArray(nestedField.options)) {
              nestedOptions = nestedField.options.map((nestedOption, nestedOptionIndex) => {
                const nestedOptionObj = {
                  value: typeof nestedOption === 'string' ? nestedOption : nestedOption.value,
                  label: typeof nestedOption === 'string' ? nestedOption : nestedOption.label,
                  nestedFields: []
                }

                // Check for nested fields in the option itself (for deep table column nesting)
                if (nestedOption.nestedFields && Array.isArray(nestedOption.nestedFields)) {
                  nestedOptionObj.nestedFields = processNestedFields(
                    nestedOption.nestedFields,
                    nestedOptionIndex
                  )
                }
                // Fallback: check nested fields in the field structure (for form builder fields)
                else if (nestedField.nestedFields && nestedField.nestedFields[nestedOptionIndex]) {
                  nestedOptionObj.nestedFields = processNestedFields(
                    nestedField.nestedFields[nestedOptionIndex],
                    nestedOptionIndex
                  )
                }

                return nestedOptionObj
              })
            }

            // Strip "field-" prefix from nested field ID before sending to backend
            let cleanNestedFieldId = nestedField.id
            if (typeof cleanNestedFieldId === 'string' && cleanNestedFieldId.startsWith('field-')) {
              cleanNestedFieldId = cleanNestedFieldId.replace('field-', '')
            }

            const processedNestedField = {
              id: cleanNestedFieldId,
              name: nestedField.label?.toLowerCase().replace(/\s+/g, '_') || `nested_${nestedIndex}`,
              label: nestedField.label,
              type: nestedField.type,
              required: nestedField.required || false,
              validations: nestedField.validation || nestedField.validations || {},
              hasNested: false,
              options: nestedOptions,
              isLeadColumn: nestedField.isLeadColumn || false
            }

            // Check if this nested field has nested fields
            processedNestedField.hasNested = processedNestedField.options.some(
              option => option.nestedFields && option.nestedFields.length > 0
            )

            return processedNestedField
          })
        }

        // Process fields the same way as generate link does
        const processFieldForAPI = (field) => {
          let optionsArray = []

          if (field.options && Array.isArray(field.options)) {
            optionsArray = field.options.map((option, index) => {
              const optionObj = {
                value: typeof option === 'string' ? option : option.value,
                label: typeof option === 'string' ? option : option.label,
                nestedFields: []
              }

              // Process nested fields for this option - check both structures
              // First check if option already has nestedFields (for table columns)
              if (option.nestedFields && Array.isArray(option.nestedFields)) {
                optionObj.nestedFields = processNestedFields(option.nestedFields, index)
              }
              // Then check if field has nestedFields[index] (for form builder fields)
              else if (field.nestedFields && field.nestedFields[index]) {
                optionObj.nestedFields = processNestedFields(field.nestedFields[index], index)
              }

              return optionObj
            })
          }

          const hasNestedFields = optionsArray.some(option =>
            option.nestedFields && option.nestedFields.length > 0
          )

          // Strip "field-" prefix from main field ID before sending to backend
          let cleanFieldId = field.id
          if (typeof cleanFieldId === 'string' && cleanFieldId.startsWith('field-')) {
            cleanFieldId = cleanFieldId.replace('field-', '')
          }

          const fieldObj = {
            id: cleanFieldId,
            name: field.name || field.label?.toLowerCase().replace(/\s+/g, '_') || 'field',
            label: field.label,
            type: field.type,
            required: field.required || false,
            validations: field.validation || field.validations || {},
            hasNested: hasNestedFields,
            options: optionsArray,
            isLeadColumn: field.isLeadColumn || false
          }

          return fieldObj
        }

        // Combine all fields into a single fields array
        const allFields = latestFields.map(processFieldForAPI)

        // Prepare the update payload
        const updatePayload = {
          organization_id: ORGANIZATION_ID,
          form_id: editFormData.formId,
          table_id: TABLE_ID,
          form_name: editFormData.formName,
          description: editFormData.description,
          g_id: latestGId, // Use the g_id from localStorage/user data
          created_by: userId, // Use user ID from localStorage
          fields: allFields,
          retry_count: latestRetryCount
        }

        console.log('📤 Update Payload:', updatePayload)

        // Send update request
        const response = await fetch(`${API_BASE_URL}/api/forms/update`, {
          method: 'POST',
          headers: {
            'Authorization': authUtils.getAuthHeader(),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updatePayload)
        })

        const result = await response.json()
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
      />
    </div>
  )
}